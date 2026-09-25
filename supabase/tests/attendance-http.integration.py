"""Real local PostgREST checks for the private attendance boundary.

Requires psycopg 3 and a running disposable local Supabase stack. The CLI is
used only to read local keys in memory; no key or token is printed.
"""

import base64
import hashlib
import hmac
import json
import os
import subprocess
import urllib.error
import urllib.request
import uuid

import psycopg


DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
CLI = os.environ.get("PALS_SUPABASE_CLI", "supabase")
HOST = uuid.UUID("53910000-0000-4000-8000-000000000001")
OWNER = uuid.UUID("53910000-0000-4000-8000-000000000002")
OTHER = uuid.UUID("53910000-0000-4000-8000-000000000003")
HANGOUT = uuid.UUID("53910000-0000-4000-8001-000000000001")
CAMPUS = uuid.UUID("00000000-0000-4000-8000-000000000001")


def local_status():
    result = subprocess.run([CLI, "status", "-o", "json"], capture_output=True,
                            text=True, check=True)
    data = json.loads(result.stdout)
    assert data["REST_URL"] == "http://127.0.0.1:54321/rest/v1"
    return data


def jwt(secret, subject):
    def enc(obj):
        return base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode()).rstrip(b"=")
    value = enc({"alg": "HS256", "typ": "JWT"}) + b"." + enc({"sub": str(subject),
            "role": "authenticated", "iss": "supabase", "exp": 1983812999})
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), value, hashlib.sha256).digest()).rstrip(b"=")
    return (value + b"." + signature).decode()


def request(status, subject, path, body=None):
    token = jwt(status["JWT_SECRET"], subject)
    headers = {"apikey": status["ANON_KEY"], "Authorization": "Bearer " + token,
               "Content-Type": "application/json"}
    req = urllib.request.Request(status["REST_URL"] + path,
                                 data=None if body is None else json.dumps(body).encode(),
                                 headers=headers, method="GET" if body is None else "POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error)


def setup():
    with psycopg.connect(DSN, autocommit=True) as c:
        with c.transaction():
            for ident in (HOST, OWNER, OTHER):
                c.execute("insert into auth.users(id,email,email_confirmed_at) values(%s,%s,clock_timestamp())",
                          (ident, f"attendance-http-{ident.int % 10}@unc.edu"))
            c.execute("""insert into public.hangouts(id,university_id,host_id,title,
              starts_at,ends_at,public_place,public_latitude,public_longitude)
              values(%s,%s,%s,'DO NOT DISCLOSE TITLE',clock_timestamp()-interval '3 hours',
              clock_timestamp()-interval '1 hour','DO NOT DISCLOSE PLACE',35,-79)""",
                      (HANGOUT, CAMPUS, HOST))
            c.execute("""insert into public.hangout_participants(hangout_id,account_id,state)
              values(%s,%s,'joined'),(%s,%s,'joined')""", (HANGOUT, HOST, HANGOUT, OWNER))
            c.execute("""update public.hangout_participants set state='left',left_at=clock_timestamp()
              where hangout_id=%s and account_id=%s""", (HANGOUT, OWNER))


def cleanup():
    with psycopg.connect(DSN, autocommit=True) as c:
        c.execute("update private.attendance_feature_gate set enabled=false")
        c.execute("update private.hangout_feature_gate set enabled=false")
        c.execute("delete from private.attendance_answers where hangout_id=%s", (HANGOUT,))
        c.execute("delete from public.hangouts where id=%s", (HANGOUT,))
        c.execute("delete from auth.users where id in (%s,%s,%s)", (HOST, OWNER, OTHER))


if __name__ == "__main__":
    status = local_status()
    setup()
    try:
        exact = "/rpc/get_own_attendance"
        target = {"p_hangout_id": str(HANGOUT)}
        assert request(status, OWNER, exact, target) == (200, [])
        with psycopg.connect(DSN, autocommit=True) as c:
            c.execute("update private.attendance_feature_gate set enabled=true")
            c.execute("update private.hangout_feature_gate set enabled=true")
        code, data = request(status, OWNER, exact, target)
        assert code == 200 and len(data) == 1 and data[0]["hangout_id"] == str(HANGOUT)
        assert set(data[0]) == {"hangout_id", "attended", "revision", "answered_at"}
        assert request(status, OTHER, exact, target) == (200, [])
        code, answer = request(status, OWNER, "/rpc/answer_own_attendance",
                               {**target, "p_attended": True, "p_expected_revision": 0})
        assert code == 200 and answer[0]["revision"] == 1 and answer[0]["attended"] is True
        code, listed = request(status, OWNER, "/rpc/list_own_attendance", {})
        assert code == 200 and len(listed) == 1
        assert set(listed[0]) == {"hangout_id", "attended", "revision", "answered_at",
                                  "within_window", "currently_actionable"}
        assert "DO NOT DISCLOSE" not in json.dumps([data, answer, listed])
        raw_code, _ = request(status, OWNER, "/attendance_answers?select=*")
        assert raw_code in (400, 404)
        embed_code, _ = request(status, OWNER,
                                "/hangout_participants?select=hangout_id,attendance_answers(*)")
        assert embed_code in (400, 404)
        with psycopg.connect(DSN) as isolated:
            isolated.execute("set role authenticated")
            isolated.execute("select set_config('request.jwt.claims',%s,false)",
                             (json.dumps({"sub": str(OWNER), "role": "authenticated"}),))
            isolated.commit()
            isolated.execute("set transaction isolation level repeatable read")
            assert isolated.execute("select * from public.get_own_attendance(%s)",
                                    (HANGOUT,)).fetchall() == []
            assert isolated.execute("select * from public.list_own_attendance()").fetchall() == []
            try:
                isolated.execute("select * from public.answer_own_attendance(%s,false,1)",
                                 (HANGOUT,))
            except psycopg.Error as error:
                assert error.sqlstate == "42501"
            else:
                raise AssertionError("stronger-isolation answer unexpectedly allowed")
        with psycopg.connect(DSN, autocommit=True) as c:
            c.execute("update private.attendance_feature_gate set enabled=false")
        assert request(status, OWNER, exact, target) == (200, [])
        print("PASS real PostgREST owner/foreign/gate/projection/raw-table/embed and isolation checks")
    finally:
        cleanup()
