import assert from "node:assert/strict";
import test from "node:test";
import {
  localTarget,
  sql,
  auth,
  management,
  trusted,
  race,
  session,
  restoreDefaults,
} from "./helpers/pilot-admission-owner.mjs";
const owner = "b1000000-0000-4000-8000-000000000001",
  manager = "b1000000-0000-4000-8000-000000000002";
const campus = "00000000-0000-4000-8000-000000000001";
const path = `${owner}/11111111.png`,
  unused = `${owner}/22222222.png`;
// Policy expected revisions must be supplied from privileged setup, not client private SELECT.
const shutdown = () =>
  `${auth(manager)} select * from public.set_pilot_policy('availability',false,${sql("select revision from private.pilot_availability")},'Local shutdown','${crypto.randomUUID()}');`;
const revoke = () =>
  management(
    manager,
    owner,
    "revoked",
    Number(
      sql(
        `select revision from private.pilot_account_admission where account_id='${owner}'`,
      ),
    ),
  );
const writes = {
  required: () =>
    `${auth(owner)} update public.profiles set bio='Race required field' where user_id='${owner}';`,
  assignment: () =>
    `${auth(owner)} update public.profiles set primary_photo_path='${path}' where user_id='${owner}';`,
  insert: () =>
    `${auth(owner)} insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${owner}/${crypto.randomUUID()}.png','${owner}');`,
  delete: () =>
    `set local storage.allow_delete_query='true';${auth(owner)} delete from storage.objects where bucket_id='profile-photos' and name='${unused}';`,
};
function ready() {
  sql(
    `begin;select private.pilot_evidence_write_lock();update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key='onboarding';update private.pilot_account_admission set state='active' where account_id='${owner}';update public.accounts set status='active' where id='${owner}';update public.universities set active=true where id='${campus}';update auth.users set email='race-owner-b1@unc.edu',email_confirmed_at=now() where id='${owner}';update public.profiles set primary_photo_path=null,bio='Baseline' where user_id='${owner}';insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${unused}','${owner}') on conflict(bucket_id,name) do nothing;commit`,
  );
}
test(
  "exact observed owner/admission/evidence waits and reference safety",
  { concurrency: false, timeout: 240000 },
  async () => {
    localTarget();
    const evidence = [];
    try {
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${owner}','race-owner-b1@unc.edu',now()),('${manager}','race-manager-b1@unc.edu',now());${trusted(manager, "active", 0)} insert into private.pilot_account_admission(account_id,state,revision) values('${owner}','active',1);insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${path}','${owner}')`,
      );
      const observed = async (
        label,
        first,
        second,
        rejection,
        kind,
        allowed,
      ) => {
        const count = Number(
          sql(`select count(*) from storage.objects where owner_id='${owner}'`),
        );
        const result = await race(label, first, second, rejection);
        if (kind === "required")
          assert.equal(
            sql(`select bio from public.profiles where user_id='${owner}'`),
            allowed ? "Race required field" : "Baseline",
          );
        if (kind === "assignment")
          assert.equal(
            sql(
              `select coalesce(primary_photo_path,'NULL') from public.profiles where user_id='${owner}'`,
            ),
            allowed ? path : "NULL",
          );
        if (kind === "insert")
          assert.equal(
            Number(
              sql(
                `select count(*) from storage.objects where owner_id='${owner}'`,
              ),
            ),
            count + (allowed ? 1 : 0),
          );
        if (kind === "delete")
          assert.equal(
            sql(`select count(*) from storage.objects where name='${unused}'`),
            allowed ? "0" : "1",
          );
        return result;
      };
      for (const [name, write] of Object.entries(writes))
        for (const [loss, change] of Object.entries({ revoke, shutdown })) {
          ready();
          evidence.push(
            await observed(
              `owner_${name}_${loss}_first`,
              change(),
              write(),
              true,
              name,
              false,
            ),
          );
          assert.equal(
            loss === "revoke"
              ? sql(
                  `select state from private.pilot_account_admission where account_id='${owner}'`,
                )
              : sql("select enabled from private.pilot_availability"),
            loss === "revoke" ? "revoked" : "f",
          );
          ready();
          evidence.push(
            await observed(
              `owner_${name}_first_${loss}`,
              write(),
              change(),
              false,
              name,
              true,
            ),
          );
          assert.equal(
            loss === "revoke"
              ? sql(
                  `select state from private.pilot_account_admission where account_id='${owner}'`,
                )
              : sql("select enabled from private.pilot_availability"),
            loss === "revoke" ? "revoked" : "f",
          );
        }
      const losses = {
        account: `update public.accounts set status='suspended' where id='${owner}';`,
        auth: `update auth.users set email='race-owner-b1@example.com' where id='${owner}';`,
        membership_recreate: `delete from public.university_memberships where user_id='${owner}';insert into public.university_memberships(user_id,university_id,verified_at,verification_email) values('${owner}','${campus}',now(),'race-owner-b1@unc.edu');`,
        membership: `delete from public.university_memberships where user_id='${owner}';`,
        campus: `update public.universities set active=false where id='${campus}';`,
      };
      for (const [loss, change] of Object.entries(losses))
        for (const [name, write] of Object.entries(writes)) {
          ready();
          evidence.push(
            await observed(
              `owner_${name}_${loss}_first`,
              change,
              write(),
              true,
              name,
              false,
            ),
          );
          ready();
          evidence.push(
            await observed(
              `owner_${name}_first_${loss}`,
              write(),
              change,
              false,
              name,
              true,
            ),
          );
        }
      ready();
      // Missing admission already fails RLS: no fictional waiter required.
      sql(
        `begin;select private.pilot_evidence_write_lock();delete from private.pilot_account_admission where account_id='${owner}';commit`,
      );
      assert.equal(
        sql(
          `begin;${auth(owner)} update public.profiles set bio='denied absence' where user_id='${owner}' returning user_id;rollback;`,
        ),
        "",
      );
      sql(
        `insert into private.pilot_account_admission(account_id,state,revision) values('${owner}','active',1)`,
      );
      ready();
      evidence.push(
        await race(
          "owner_absent_roster_after_prior_snapshot",
          `select private.pilot_evidence_write_lock();delete from private.pilot_account_admission where account_id='${owner}';`,
          writes.required(),
          true,
        ),
      );
      const activation = management(manager, owner, "active", 0);
      // Activation uncommitted is not visible to the denied writer, so it changes zero rows.
      // Tested independently after activation; no claim of a forced row-lock wait on absence.
      sql(`begin;${activation}commit;`);
      ready();
      for (const isolation of ["repeatable read", "serializable"])
        for (const write of Object.values(writes)) {
          assert.throws(
            () => sql(`begin isolation level ${isolation};${write()}commit;`),
            /Pilot management unavailable/,
          );
        }
      // Primary assignment holds object KEY SHARE; delete waits and reference policy/trigger denies or safely skips.
      ready();
      evidence.push(
        await race(
          "owner_assignment_first_reference_delete",
          writes.assignment(),
          `set local storage.allow_delete_query='true';${auth(owner)} delete from storage.objects where bucket_id='profile-photos' and name='${path}';`,
          true,
        ),
      );
      // Delete commits first: assignment waits on the actual Storage tuple then rejects missing owned photo.
      ready();
      evidence.push(
        await race(
          "owner_delete_first_assignment",
          `set local storage.allow_delete_query='true';${auth(owner)} delete from storage.objects where bucket_id='profile-photos' and name='${path}';`,
          writes.assignment(),
          true,
        ),
      );
      ready();
      sql(
        `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${path}','${owner}') on conflict(bucket_id,name) do nothing`,
      );
      const profile = session("owner_cycle_profile"),
        photo = session("owner_cycle_photo");
      const waitFor = async (check) => {
        for (let n = 0; n < 200; n++) {
          if (check()) return;
          await new Promise((r) => setTimeout(r, 10));
        }
        throw new Error(
          `cycle boundary wait missing;profile=${profile.output()};photo=${photo.output()}`,
        );
      };
      try {
        profile.send(`\\set VERBOSITY verbose
begin;${auth(owner)} select user_id from public.profiles where user_id='${owner}' for update;select 'HELD';`);
        await waitFor(() => profile.output().includes("HELD"));
        photo.send(`\\set VERBOSITY verbose
begin;set local storage.allow_delete_query='true';${auth(owner)} delete from storage.objects where name='${path}' and bucket_id='profile-photos';commit;`);
        await waitFor(
          () =>
            sql(
              "select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name='owner_cycle_profile' where w.application_name='owner_cycle_photo' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)",
            ) === "1",
        );
        profile.send(
          `update public.profiles set primary_photo_path='${path}' where user_id='${owner}';commit;`,
        );
        await waitFor(
          () =>
            sql(
              "select count(*) from pg_stat_activity w join pg_stat_activity h on h.application_name='owner_cycle_photo' where w.application_name='owner_cycle_profile' and h.pid=any(pg_blocking_pids(w.pid)) and exists(select 1 from pg_locks l where l.pid=w.pid and not l.granted)",
            ) === "1",
        );
        const cycle = sql(
          "select jsonb_agg(jsonb_build_object('pid',pid,'blocked_by',pg_blocking_pids(pid),'locks',(select jsonb_agg(locktype) from pg_locks l where l.pid=a.pid and not l.granted))) from pg_stat_activity a where application_name in ('owner_cycle_profile','owner_cycle_photo')",
        );
        profile.child.stdin.end();
        photo.child.stdin.end();
        const results = await Promise.all([profile.done, photo.done]);
        assert.equal(
          results.filter((r) => r[0] !== 0).length,
          1,
          "one safe deadlock abort, one survivor",
        );
        assert.match(profile.output() + photo.output(), /40P01/);
        assert.equal(
          sql(
            `select count(*) from public.profiles p left join storage.objects o on o.bucket_id='profile-photos' and o.name=p.primary_photo_path and o.owner_id=p.user_id::text where p.user_id='${owner}' and p.primary_photo_path is not null and o.id is null`,
          ),
          "0",
          "no orphan after actual safe abort",
        );
        console.log(
          JSON.stringify({ safe_abort: "40P01", cycle: JSON.parse(cycle) }),
        );
      } finally {
        profile.child.kill();
        photo.child.kill();
      }
      console.log(
        JSON.stringify({ observed_waits: evidence.length, evidence }),
      );
    } finally {
      restoreDefaults();
      sql(
        `update public.universities set active=true where id='${campus}';update public.profiles set primary_photo_path=null,additional_photo_paths='{}' where user_id in ('${owner}','${manager}');set storage.allow_delete_query='true';delete from storage.objects where owner_id in ('${owner}','${manager}');delete from auth.users where id in ('${owner}','${manager}')`,
      );
    }
  },
);
