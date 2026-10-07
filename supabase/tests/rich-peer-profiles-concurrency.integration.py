"""Disposable-local committed-order consent races, with dedicated fixture cleanup.

Run only against the named TASK-028 disposable stack after migration review.
Each raced transaction is committed to expose its order to the other session;
the synthetic owner is deleted and all pre-existing gate values are restored.
"""

import concurrent.futures
import json
import subprocess
import time
import uuid

import psycopg

DSN = "host=127.0.0.1 port=55422 user=postgres password=postgres dbname=postgres"
CONTAINER = "supabase_db_pals-task028-disposable"


def connect():
    return psycopg.connect(DSN, connect_timeout=5)


def check_target():
    port = subprocess.check_output(["docker", "port", CONTAINER, "5432/tcp"], text=True)
    assert ":55422" in port, port


def actor_session(conn, actor):
    conn.execute("set local role authenticated")
    conn.execute(
        "select set_config('request.jwt.claims', %s, true)",
        (json.dumps({"sub": actor, "role": "authenticated"}),),
    )


def current_state(conn):
    return conn.execute(
        """select (select enabled from private.pilot_availability where singleton),
                  (select enabled from private.pilot_capabilities where key='people'),
                  (select enabled from private.pilot_capabilities where key='onboarding'),
                  (select enabled from private.people_feature_gate where singleton),
                  (select enabled from private.rich_profile_feature_gate where singleton)"""
    ).fetchone()


def reset_fixture(conn, actor):
    with conn.transaction():
        conn.execute("update private.pilot_availability set enabled=true where singleton")
        conn.execute("update private.pilot_capabilities set enabled=true where key in ('people','onboarding')")
        conn.execute("update private.people_feature_gate set enabled=true where singleton")
        conn.execute("update private.rich_profile_feature_gate set enabled=true where singleton")
        conn.execute("update public.profiles set bio='Race baseline' where user_id=%s", (actor,))
        conn.execute(
            "insert into private.people_preferences(account_id,opted_in) values(%s,true) "
            "on conflict(account_id) do update set opted_in=true",
            (actor,),
        )
        conn.execute("delete from private.rich_profile_preferences where account_id=%s", (actor,))


def wait_for_lock(observer, pid, label):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        row = observer.execute(
            "select wait_event_type,wait_event from pg_catalog.pg_stat_activity where pid=%s",
            (pid,),
        ).fetchone()
        if row and row[0] == "Lock":
            print(f"{label}: observed wait {row[1]}")
            return row[1]
        time.sleep(0.025)
    raise AssertionError(f"{label}: second transaction did not wait on a lock")


def race(label, actor, first_sql, second_sql, first_actor=True, second_actor=True,
         second_error=None, expected_wait=None):
    first = connect()
    second = connect()
    observer = connect()
    observer.autocommit = True
    try:
        pid = second.execute("select pg_backend_pid()").fetchone()[0]
        second.commit()
        if first_actor:
            actor_session(first, actor)
        first_result = first.execute(first_sql).fetchone()

        def run_second():
            try:
                if second_actor:
                    actor_session(second, actor)
                result = second.execute(second_sql).fetchone()
                second.commit()
                return result, None
            except psycopg.Error as exc:
                code = exc.sqlstate
                second.rollback()
                return None, code

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(run_second)
            try:
                wait = wait_for_lock(observer, pid, label)
                if expected_wait:
                    assert wait == expected_wait, (label, wait)
                first.commit()
            except BaseException:
                # Release the first lock before executor shutdown waits on B.
                first.rollback()
                raise
            second_result, error = future.result(timeout=10)
        assert error == second_error, (label, error, second_error)
        print(f"{label}: first={first_result} second={second_result} sqlstate={error}")
        return first_result, second_result
    finally:
        for connection in (first, second, observer):
            if not connection.closed:
                connection.rollback()
                connection.close()


def inspect(conn, actor):
    return conn.execute(
        """select pp.opted_in,coalesce(rp.opted_in,false),coalesce(rp.revision,0),p.bio
           from private.people_preferences pp
           join public.profiles p on p.user_id=pp.account_id
           left join private.rich_profile_preferences rp on rp.account_id=pp.account_id
           where pp.account_id=%s""",
        (actor,),
    ).fetchone()


def main():
    check_target()
    actor = str(uuid.uuid4())
    observer = connect()
    observer.autocommit = True
    original = current_state(observer)
    try:
        observer.execute(
            "insert into auth.users(id,email,email_confirmed_at) values(%s,%s,now())",
            (actor, f"rich-race-{actor}@unc.edu"),
        )
        observer.execute(
            "update public.profiles set real_name='Race Owner',graduation_year=2028,"
            "major='Biology',bio='Race baseline' where user_id=%s",
            (actor,),
        )
        reset_fixture(observer, actor)
        race("People-off first / rich-on second", actor,
             "select public.set_people_preference(false)",
             "select * from public.set_my_rich_profile_preference(true,0)",
             second_error="42501", expected_wait="advisory")
        assert inspect(observer, actor)[:3] == (False, False, 0)

        reset_fixture(observer, actor)
        race("rich-on first / People-off second", actor,
             "select * from public.set_my_rich_profile_preference(true,0)",
             "select public.set_people_preference(false)", expected_wait="advisory")
        assert inspect(observer, actor)[:3] == (False, False, 2)

        reset_fixture(observer, actor)
        race("pilot-close first / rich-on second", actor,
             "select private.pilot_lock_management(null,null,'availability',false);"
             "update private.pilot_availability set enabled=false where singleton returning enabled",
             "select * from public.set_my_rich_profile_preference(true,0)",
             first_actor=False, second_error="42501", expected_wait="advisory")
        assert inspect(observer, actor)[:3] == (True, False, 0)

        reset_fixture(observer, actor)
        race("rich-on first / pilot-close second", actor,
             "select * from public.set_my_rich_profile_preference(true,0)",
             "select private.pilot_lock_management(null,null,'availability',false);"
             "update private.pilot_availability set enabled=false where singleton returning enabled",
             second_actor=False, expected_wait="advisory")
        assert inspect(observer, actor)[:3] == (True, True, 1)
        assert observer.execute("select enabled from private.pilot_availability where singleton").fetchone() == (False,)

        reset_fixture(observer, actor)
        race("pilot-close first / People-off second", actor,
             "select private.pilot_lock_management(null,null,'availability',false);"
             "update private.pilot_availability set enabled=false where singleton returning enabled",
             "select public.set_people_preference(false)",
             first_actor=False, expected_wait="advisory")
        assert inspect(observer, actor)[:3] == (False, False, 0)

        reset_fixture(observer, actor)
        race("People-off first / pilot-close second", actor,
             "select public.set_people_preference(false)",
             "select private.pilot_lock_management(null,null,'availability',false);"
             "update private.pilot_availability set enabled=false where singleton returning enabled",
             second_actor=False, expected_wait="advisory")
        assert inspect(observer, actor)[:3] == (False, False, 0)

        reset_fixture(observer, actor)
        race("profile row-first / rich-on second", actor,
             f"update public.profiles set bio=null where user_id='{actor}' returning bio",
             "select * from public.set_my_rich_profile_preference(true,0)",
             second_error="42501")
        assert inspect(observer, actor) == (True, False, 0, None)
        print("All committed-order races passed")
    finally:
        # Test-owned accounts only; pre-existing gates return to exact values.
        observer.execute("update private.rich_profile_feature_gate set enabled=%s where singleton", (original[4],))
        observer.execute("update private.people_feature_gate set enabled=%s where singleton", (original[3],))
        observer.execute("update private.pilot_capabilities set enabled=%s where key='people'", (original[1],))
        observer.execute("update private.pilot_capabilities set enabled=%s where key='onboarding'", (original[2],))
        observer.execute("update private.pilot_availability set enabled=%s where singleton", (original[0],))
        observer.execute("delete from auth.users where id=%s", (actor,))
        observer.close()


if __name__ == "__main__":
    main()
