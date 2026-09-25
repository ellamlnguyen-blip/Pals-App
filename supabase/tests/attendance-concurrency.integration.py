"""Disposable local two-session attendance lock checks (requires psycopg 3).

Run only against the local Supabase database; the script verifies its loopback
endpoint. Immutable moderation evidence requires a fresh local reset afterward.
"""

import concurrent.futures
import datetime
import json
import os
import time
import uuid

import psycopg


DSN = os.environ.get("PALS_LOCAL_DB_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")
if "@127.0.0.1:54322/" not in DSN:
    raise SystemExit("Disposable local database only")

HOST = uuid.UUID("53900000-0000-4000-8000-000000000001")
OWNER = uuid.UUID("53900000-0000-4000-8000-000000000002")
MODERATOR = uuid.UUID("53900000-0000-4000-8000-000000000003")
CAMPUS = uuid.UUID("00000000-0000-4000-8000-000000000001")
REPORTS = {}


def root():
    return psycopg.connect(DSN, autocommit=True)


def student():
    conn = psycopg.connect(DSN)
    conn.execute("set role authenticated")
    conn.execute("select set_config('request.jwt.claims',%s,false)",
                 (json.dumps({"sub": str(OWNER), "role": "authenticated"}),))
    conn.commit()
    return conn


def setup():
    with root() as c:
        for ident in (HOST, OWNER, MODERATOR):
            c.execute("insert into auth.users(id,email,email_confirmed_at) values(%s,%s,clock_timestamp())",
                      (ident, f"attendance-concurrency-{ident.int % 10}@unc.edu"))
            c.execute("""insert into storage.objects(bucket_id,name,owner_id)
              values('profile-photos',%s,%s)""", (str(ident) + "/primary.png", str(ident)))
            c.execute("""update public.profiles set real_name='Race fixture',major='Biology',
              graduation_year=2028,bio='Local fixture',primary_photo_path=%s where user_id=%s""",
                      (str(ident) + "/primary.png", ident))
        c.execute("insert into public.platform_roles(user_id,role) values(%s,'moderator')", (MODERATOR,))
        c.execute("update private.hangout_feature_gate set enabled=true")
        c.execute("update private.attendance_feature_gate set enabled=true")
        c.execute("update private.moderation_feature_gate set enabled=true")


def new_hangout(report_kind=None, opening_delay_seconds=None):
    ident = uuid.uuid4()
    with root() as c:
        with c.transaction():
            if opening_delay_seconds is None:
                c.execute("""insert into public.hangouts(id,university_id,host_id,title,
                  starts_at,ends_at,public_place,public_latitude,public_longitude)
                  values(%s,%s,%s,'Race fixture',clock_timestamp()-interval '3 hours',
                  clock_timestamp()-interval '1 hour','Area',35,-79)""", (ident, CAMPUS, HOST))
            else:
                c.execute("""insert into public.hangouts(id,university_id,host_id,title,
                  starts_at,ends_at,public_place,public_latitude,public_longitude)
                  values(%s,%s,%s,'Race fixture',clock_timestamp()-interval '1 hour',
                  clock_timestamp()+make_interval(secs=>%s),'Area',35,-79)""",
                          (ident, CAMPUS, HOST, opening_delay_seconds))
            c.execute("""insert into public.hangout_participants(hangout_id,account_id,state)
              values(%s,%s,'joined'),(%s,%s,'joined')""", (ident, HOST, ident, OWNER))
            if report_kind:
                report = uuid.uuid4()
                REPORTS[ident] = report
                c.execute("""insert into private.safety_reports(id,reporter_id,target_type,target_id,
                  category,provenance_kind,provenance_ref_id)
                  values(%s,%s,%s,%s,'harassment',%s,%s)""",
                          (report, OWNER if report_kind == "hangout" else HOST,
                           report_kind, ident if report_kind == "hangout" else OWNER,
                           "retained_hangout" if report_kind == "hangout" else "hangout_overlap",
                           ident))
                c.execute("""insert into private.moderation_cases(report_id,state,revision)
                  values(%s,'in_review',1)""", (report,))
    return ident


def answer(conn, hangout):
    return conn.execute("select revision from public.answer_own_attendance(%s,true,0)",
                        (hangout,)).fetchone()[0]


def change(conn, kind, hangout):
    if kind == "attendance gate":
        conn.execute("update private.attendance_feature_gate set enabled=false")
    elif kind == "source gate":
        conn.execute("update private.hangout_feature_gate set enabled=false")
    elif kind == "sanction":
        conn.execute("set local role authenticated")
        conn.execute("select set_config('request.jwt.claims',%s,true)",
                     (json.dumps({"sub": str(MODERATOR), "role": "authenticated"}),))
        conn.execute("""select * from public.apply_account_moderation_action(
          %s,%s,1,'suspend','Race fixture')""", (REPORTS[hangout], uuid.uuid4()))
    elif kind == "leave":
        conn.execute("set local role authenticated")
        conn.execute("select set_config('request.jwt.claims',%s,true)",
                     (json.dumps({"sub": str(OWNER), "role": "authenticated"}),))
        conn.execute("select public.leave_hangout(%s)", (hangout,))
    elif kind == "remove":
        conn.execute("set local role authenticated")
        conn.execute("select set_config('request.jwt.claims',%s,true)",
                     (json.dumps({"sub": str(HOST), "role": "authenticated"}),))
        conn.execute("select public.remove_hangout_participant(%s,%s)", (hangout, OWNER))
    elif kind == "cancel":
        conn.execute("set local role authenticated")
        conn.execute("select set_config('request.jwt.claims',%s,true)",
                     (json.dumps({"sub": str(HOST), "role": "authenticated"}),))
        conn.execute("select public.cancel_hangout(%s,1)", (hangout,))
    elif kind == "block":
        conn.execute("insert into private.people_blocks(blocker_id,blocked_id) values(%s,%s)",
                     (OWNER, HOST))
    elif kind == "host edit":
        conn.execute("set local role authenticated")
        conn.execute("select set_config('request.jwt.claims',%s,true)",
                     (json.dumps({"sub": str(HOST), "role": "authenticated"}),))
        starts, ends = conn.execute("select starts_at,ends_at from public.hangouts where id=%s",
                                    (hangout,)).fetchone()
        conn.execute("""select public.edit_hangout(%s,1,'Edited in race',%s,'Area',35,-79,
          p_ends_at=>%s)""", (hangout, starts, ends))
    elif kind == "disable":
        conn.execute("set local role authenticated")
        conn.execute("select set_config('request.jwt.claims',%s,true)",
                     (json.dumps({"sub": str(MODERATOR), "role": "authenticated"}),))
        conn.execute("select * from public.apply_hangout_moderation_action(%s,%s,1,'Race fixture')",
                     (REPORTS[hangout], uuid.uuid4()))
    else:
        raise AssertionError(kind)


def restore(kind):
    with root() as c:
        if kind == "attendance gate":
            c.execute("update private.attendance_feature_gate set enabled=true")
        elif kind == "source gate":
            c.execute("update private.hangout_feature_gate set enabled=true")
        elif kind == "sanction":
            c.execute("update public.accounts set status='active' where id=%s", (OWNER,))
        elif kind == "block":
            c.execute("delete from private.people_blocks where blocker_id=%s and blocked_id=%s",
                      (OWNER, HOST))


def race(kind, revocation_first):
    hangout = new_hangout(report_kind="hangout" if kind == "disable"
                          else "user" if kind == "sanction" else None)
    denied = kind in ("attendance gate", "source gate", "sanction", "disable")
    a, b = student(), psycopg.connect(DSN)
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            if revocation_first:
                change(b, kind, hangout)  # Keep revocation uncommitted.
                if kind == "block":
                    b.commit()  # A host block intentionally does not revoke this ID-only action.
                pending = pool.submit(answer, a, hangout)
                time.sleep(0.15)
                if kind != "block":
                    assert not pending.done(), f"{kind}: answer did not wait for revocation"
                    b.commit()
                if denied:
                    try:
                        pending.result(timeout=5)
                    except psycopg.Error as e:
                        assert e.sqlstate == "42501", (kind, e.sqlstate)
                        a.rollback()
                    else:
                        raise AssertionError(f"{kind}: answered after committed revocation")
                    with root() as verify:
                        assert verify.execute("""select count(*) from private.attendance_answers
                          where hangout_id=%s and account_id=%s""", (hangout, OWNER)).fetchone()[0] == 0
                else:
                    assert pending.result(timeout=5) == 1
                    a.commit()
            else:
                assert answer(a, hangout) == 1  # Keep answer uncommitted.
                pending = pool.submit(change, b, kind, hangout)
                time.sleep(0.15)
                # Gate/account/parent transitions must wait for the answer.
                if kind != "block":
                    assert not pending.done(), f"{kind}: revocation did not wait"
                a.commit()
                pending.result(timeout=5)
                b.commit()
                with root() as c:
                    assert c.execute("""select count(*) from private.attendance_answers
                      where hangout_id=%s and account_id=%s""", (hangout, OWNER)).fetchone()[0] == 1
                if kind in ("attendance gate", "sanction", "disable"):
                    with student() as probe:
                        assert probe.execute("select * from public.get_own_attendance(%s)",
                                             (hangout,)).fetchall() == []
            print(f"PASS {kind}: {'revocation' if revocation_first else 'answer'} committed first")
    finally:
        a.close()
        b.close()
        restore(kind)


def frozen_schedule_race(answer_first):
    hangout = new_hangout()
    a, b = student(), psycopg.connect(DSN)

    def edit():
        b.execute("set local role authenticated")
        b.execute("select set_config('request.jwt.claims',%s,true)",
                  (json.dumps({"sub": str(HOST), "role": "authenticated"}),))
        starts, ends = b.execute("select starts_at,ends_at from public.hangouts where id=%s",
                                 (hangout,)).fetchone()
        return b.execute("""select public.edit_hangout(%s,1,'Race fixture',%s,'Area',35,-79,
          p_ends_at=>%s)""", (hangout, starts, ends + datetime.timedelta(hours=1)))

    try:
        if answer_first:
            assert answer(a, hangout) == 1
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                pending = pool.submit(edit)
                time.sleep(0.15)
                assert not pending.done(), "host schedule edit did not wait for answer"
                a.commit()
                try:
                    pending.result(timeout=5)
                except psycopg.Error as error:
                    assert error.sqlstate == "23514", error.sqlstate
                    b.rollback()
                else:
                    raise AssertionError("post-opening host schedule edit succeeded")
        else:
            try:
                edit()
            except psycopg.Error as error:
                assert error.sqlstate == "23514", error.sqlstate
                b.rollback()
            else:
                raise AssertionError("post-opening host schedule edit succeeded")
            assert answer(a, hangout) == 1
            a.commit()
        print(f"PASS host schedule edit: {'answer' if answer_first else 'edit attempt'} first")
    finally:
        a.close()
        b.close()


def schedule_crosses_opening_while_parent_locked():
    hangout = new_hangout(opening_delay_seconds=2)
    blocker, host_edit = psycopg.connect(DSN), psycopg.connect(DSN)
    try:
        blocker.execute("select id from public.hangouts where id=%s for update", (hangout,))
        host_pid = host_edit.execute("select pg_backend_pid()").fetchone()[0]
        host_edit.commit()

        def edit():
            host_edit.execute("set local role authenticated")
            host_edit.execute("select set_config('request.jwt.claims',%s,true)",
                              (json.dumps({"sub": str(HOST), "role": "authenticated"}),))
            starts, ends = host_edit.execute("select starts_at,ends_at from public.hangouts where id=%s",
                                            (hangout,)).fetchone()
            host_edit.execute("""select public.edit_hangout(%s,1,'Race fixture',%s,'Area',35,-79,
              p_ends_at=>%s)""", (hangout, starts, ends + datetime.timedelta(hours=1)))

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            pending = pool.submit(edit)
            with root() as observer:
                for _ in range(20):
                    wait_type = observer.execute("""select wait_event_type from pg_stat_activity
                      where pid=%s""", (host_pid,)).fetchone()[0]
                    if wait_type == "Lock":
                        break
                    time.sleep(0.05)
                assert wait_type == "Lock" and not pending.done(), "edit did not block on parent"
                assert observer.execute("""select clock_timestamp()<ends_at from public.hangouts
                  where id=%s""", (hangout,)).fetchone()[0], "edit did not begin before opening"
                while observer.execute("""select clock_timestamp()<ends_at from public.hangouts
                  where id=%s""", (hangout,)).fetchone()[0]:
                    time.sleep(0.05)
            blocker.commit()
            try:
                pending.result(timeout=5)
            except psycopg.Error as error:
                assert error.sqlstate == "23514", error.sqlstate
                host_edit.rollback()
            else:
                raise AssertionError("host moved schedule after opening while waiting on parent")
        with student() as owner:
            assert answer(owner, hangout) == 1
        with root() as c:
            assert c.execute("select revision from public.hangouts where id=%s", (hangout,)).fetchone()[0] == 1
        print("PASS host time edit began before opening, waited on parent, and failed after opening")
    finally:
        blocker.close()
        host_edit.close()


def cleanup():
    with root() as c:
        c.execute("update private.attendance_feature_gate set enabled=false")
        c.execute("update private.hangout_feature_gate set enabled=false")
        c.execute("update private.moderation_feature_gate set enabled=false")
        # Moderation evidence is intentionally immutable. The caller must run
        # a disposable local database reset to remove this suite's fixtures.
        if REPORTS:
            return
        c.execute("delete from private.attendance_answers where account_id=%s", (OWNER,))
        c.execute("delete from public.hangouts where host_id=%s", (HOST,))
        c.execute("delete from auth.users where id in (%s,%s,%s)", (HOST, OWNER, MODERATOR))


if __name__ == "__main__":
    setup()
    try:
        for case in ("attendance gate", "source gate", "sanction", "leave", "remove", "cancel",
                     "block", "host edit", "disable"):
            for first in (True, False):
                race(case, first)
        for first in (True, False):
            frozen_schedule_race(first)
        schedule_crosses_opening_while_parent_locked()
    finally:
        cleanup()
