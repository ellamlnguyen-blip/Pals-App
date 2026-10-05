import assert from "node:assert/strict";
import test from "node:test";
import { writeFileSync } from "node:fs";
import {
  localTarget,
  sql,
  race,
  resetDisposable,
} from "./helpers/pilot-admission-lifecycle.mjs";
import {
  host,
  actor,
  campus,
  hangout,
  routes,
  auth,
  setup,
  prepare,
  call,
  census,
  censusQuery,
} from "./helpers/pilot-lifecycle-fixtures.mjs";
const deny = "Hangout operation not permitted";
const policyLosses = [
  [
    "shutdown",
    `select private.pilot_evidence_write_lock();update private.pilot_availability set enabled=false;`,
    `update private.pilot_availability set enabled=true;`,
  ],
  [
    "purpose",
    `select private.pilot_evidence_write_lock();update private.pilot_capabilities set enabled=false where key='hangouts';`,
    `update private.pilot_capabilities set enabled=true where key='hangouts';`,
  ],
  [
    "purpose_missing",
    `select private.pilot_evidence_write_lock();delete from private.pilot_capabilities where key='hangouts';`,
    `insert into private.pilot_capabilities(key,enabled,revision) values('hangouts',true,1);`,
  ],
  [
    "availability_missing",
    `select private.pilot_evidence_write_lock();delete from private.pilot_availability;`,
    `insert into private.pilot_availability(singleton,enabled,revision) values(true,true,1);`,
  ],
  [
    "gate",
    `update private.hangout_feature_gate set enabled=false;`,
    `update private.hangout_feature_gate set enabled=true;`,
  ],
  [
    "gate_missing",
    `delete from private.hangout_feature_gate;`,
    `insert into private.hangout_feature_gate(singleton,enabled) values(true,true);`,
  ],
];
function identityLosses(subject) {
  return [
    [
      "suspended",
      `update public.accounts set status='suspended' where id='${subject}';`,
      `update public.accounts set status='active' where id='${subject}';`,
    ],
    [
      "banned",
      `update public.accounts set status='banned' where id='${subject}';`,
      `update public.accounts set status='active' where id='${subject}';`,
    ],
    [
      "email_confirmation",
      `update auth.users set email_confirmed_at=null where id='${subject}';`,
      `update auth.users set email_confirmed_at=now() where id='${subject}';`,
    ],
    [
      "email_domain",
      `update auth.users set email='${subject}@example.invalid' where id='${subject}';`,
      `update auth.users set email='${subject === host ? "b3a-host" : "b3a-actor"}@unc.edu',email_confirmed_at=now() where id='${subject}';`,
    ],
    [
      "email_equality",
      `update public.university_memberships set verification_email='mismatch@unc.edu' where user_id='${subject}';`,
      `update public.university_memberships set verification_email='${subject === host ? "b3a-host" : "b3a-actor"}@unc.edu' where user_id='${subject}';`,
    ],
    [
      "membership_verification",
      `update public.university_memberships set verified_at=null,verification_email=null where user_id='${subject}';`,
      `update public.university_memberships set verified_at=now(),verification_email='${subject === host ? "b3a-host" : "b3a-actor"}@unc.edu' where user_id='${subject}';`,
    ],
    [
      "membership_delete",
      `delete from public.university_memberships where user_id='${subject}';`,
      `insert into public.university_memberships(user_id,university_id,verified_at,verification_email) values('${subject}','${campus}',now(),'${subject === host ? "b3a-host" : "b3a-actor"}@unc.edu');`,
    ],
    [
      "campus_active",
      `update public.universities set active=false where id='${campus}';`,
      `update public.universities set active=true where id='${campus}';`,
    ],
    [
      "campus_unc",
      `update public.universities set slug='other-campus' where id='${campus}';`,
      `update public.universities set slug='unc-chapel-hill' where id='${campus}';`,
    ],
    [
      "campus_allowlist",
      `update public.universities set allowed_email_domains=array['example.invalid'] where id='${campus}';`,
      `update public.universities set allowed_email_domains=array['unc.edu','live.unc.edu'];`,
    ],
    [
      "profile_missing",
      `delete from public.profiles where user_id='${subject}';`,
      `insert into public.profiles(user_id,real_name,major,bio,graduation_year,primary_photo_path) values('${subject}','Restored fixture','Math','Local',2028,'${subject}/11111111.png');`,
    ],
    [
      "profile_required",
      `update public.profiles set bio=null where user_id='${subject}';`,
      `update public.profiles set bio='Local' where user_id='${subject}';`,
    ],
    [
      "profile_primary",
      `update public.profiles set primary_photo_path=null where user_id='${subject}';`,
      `update public.profiles set primary_photo_path='${subject}/11111111.png' where user_id='${subject}';`,
    ],
    // A referenced object cannot lawfully be deleted. Detach first in the same
    // transaction; the profile lock is the observed boundary for this loss.
    [
      "object_detach_delete",
      `set local storage.allow_delete_query='true';update public.profiles set primary_photo_path=null where user_id='${subject}';delete from storage.objects where bucket_id='profile-photos' and name='${subject}/11111111.png';`,
      `insert into storage.objects(bucket_id,name,owner_id) values('profile-photos','${subject}/11111111.png','${subject}');update public.profiles set primary_photo_path='${subject}/11111111.png' where user_id='${subject}';`,
    ],
  ];
}
test(
  "B3a L2 all public routes and L3 reviewed common identity partition, exact lock observations",
  { concurrency: false, timeout: 600000 },
  async () => {
    localTarget();
    const evidence = { actual: [], commonIdentity: [], classifications: [] };
    try {
      setup();
      async function cell(route, label, loss, restore, partition = "actual") {
        prepare(route);
        const query = call(route);
        sql(`begin;${query}rollback;`); // meaningful allowed control
        evidence[partition].push({
          ...(await race(
            `b3a_${route.id}_${label}_loss_first`,
            loss,
            query,
            deny,
            censusQuery,
          )),
          route: route.id,
          label,
          order: "loss-first",
        });
        assert.deepEqual(
          JSON.parse(census()),
          evidence[partition].at(-1).holder_snapshot,
          "denial adds no lifecycle/private/ledger/participant/notification delta beyond committed loss writer",
        );
        sql(restore);
        prepare(route);
        evidence[partition].push({
          ...(await race(
            `b3a_${route.id}_${label}_mutation_first`,
            query,
            loss,
          )),
          route: route.id,
          label,
          order: "mutation-first",
        });
        assert.throws(
          () => sql(`begin;${query}rollback;`),
          /42501:.*Hangout operation not permitted/,
        );
        sql(restore);
      }
      for (const route of routes) {
        for (const [label, loss, restore] of policyLosses)
          await cell(route, label, loss, restore);
        for (const subject of route.subjects) {
          await cell(
            route,
            `roster_${subject.slice(-1)}`,
            `select private.pilot_evidence_write_lock();update private.pilot_account_admission set state='revoked' where account_id='${subject}';`,
            `update private.pilot_account_admission set state='active' where account_id='${subject}';`,
          );
          await cell(
            route,
            `roster_missing_${subject.slice(-1)}`,
            `select private.pilot_evidence_write_lock();delete from private.pilot_account_admission where account_id='${subject}';`,
            `insert into private.pilot_account_admission(account_id,state,revision) values('${subject}','active',1);`,
          );
        }
      }
      for (const route of routes.filter((r) =>
        ["create", "retry", "edit"].includes(r.id),
      ))
        for (const subject of route.subjects)
          for (const [label, loss, restore] of identityLosses(subject))
            await cell(
              route,
              `${label}_${subject.slice(-1)}`,
              loss,
              restore,
              "commonIdentity",
            );
      for (const route of routes.filter((r) =>
        ["edit", "joining"].includes(r.id),
      ))
        await cell(
          route,
          "cohost_power_loss",
          `delete from private.hangout_cohosts where hangout_id='${hangout}' and account_id='${actor}';`,
          `insert into private.hangout_cohosts(hangout_id,account_id) values('${hangout}','${actor}');`,
        );
      for (const route of routes.filter((r) =>
        ["join", "noop"].includes(r.id),
      )) {
        await cell(
          route,
          "joining_closed",
          `select private.social_hangout_mutation_lock();update public.hangouts set joining_state='closed',revision=revision+1,updated_at=clock_timestamp() where id='${hangout}';`,
          `update public.hangouts set joining_state='open',revision=revision+1,updated_at=clock_timestamp() where id='${hangout}';`,
        );
        await cell(
          route,
          "removed_terminal",
          `select private.social_hangout_mutation_lock();update public.hangout_participants set state='removed',removed_at=now() where hangout_id='${hangout}' and account_id='${actor}';`,
          `delete from public.hangout_participants where hangout_id='${hangout}' and account_id='${actor}';insert into public.hangout_participants(hangout_id,account_id,state) values('${hangout}','${actor}','joined');`,
        );
      }
      // L3 old tuple deleted/reinserted while the actual public locked lookup
      // waits. The old SELECT may not accept the new unlocked tuple via EXISTS.
      for (const route of routes.filter((r) =>
        ["create", "retry", "edit"].includes(r.id),
      )) {
        for (const subject of route.subjects) {
          for (const [label, replacement] of [
            [
              "member_replace",
              `delete from public.university_memberships where user_id='${subject}';insert into public.university_memberships(user_id,university_id,verified_at,verification_email) values('${subject}','${campus}',now(),'${subject === host ? "b3a-host" : "b3a-actor"}@unc.edu');`,
            ],
            [
              "profile_replace",
              `delete from public.profiles where user_id='${subject}';insert into public.profiles(user_id,real_name,major,bio,graduation_year,primary_photo_path) values('${subject}','Replacement','Math','Local',2028,'${subject}/11111111.png');`,
            ],
          ]) {
            prepare(route);
            const before = census();
            evidence.commonIdentity.push({
              ...(await race(
                `b3a_${route.id}_${label}_${subject.slice(-1)}`,
                replacement,
                call(route),
                deny,
              )),
              route: route.id,
              label,
              order: "old-tuple-deletion-replacement-first",
            });
            assert.equal(census(), before);
            sql(`begin;${call(route)}rollback;`); // fresh replacement itself remains eligible
            prepare(route);
            evidence.commonIdentity.push({
              ...(await race(
                `b3a_${route.id}_${label}_${subject.slice(-1)}_mutation_first`,
                call(route),
                replacement,
              )),
              route: route.id,
              label,
              order: "mutation-first-then-new-replacement",
            });
            if (route.id === "edit") {
              assert.throws(
                () => sql(`begin;${call(route)}rollback;`),
                /PT409:.*Stale Hangout revision/,
              );
              evidence.classifications.push({
                cell: `${route.id}_${label}_${subject.slice(-1)}`,
                classification:
                  "authorized business PT409 Stale Hangout revision after committed edit, separate from PostgreSQL serialization abort",
              });
              const revision = sql(
                `select revision from public.hangouts where id='${hangout}'`,
              );
              const current = call(route).replace(
                `('${hangout}',1,`,
                `('${hangout}',${revision},`,
              );
              sql(`begin;${current}rollback;`);
            } else sql(`begin;${call(route)}rollback;`);
          }
        }
      }
      // L4 missing roster gives a real social/pilot wait behind its deletion,
      // already measured for every route. Fresh absent calls deny, with no
      // invented wait. Actual authorized activation at revision zero then permits
      // a later route; activation-first/absent-first concurrency is not claimed.
      const manager = "b3a00000-0000-4000-8000-000000000003";
      sql(
        `insert into auth.users(id,email,email_confirmed_at) values('${manager}','b3a-manager@unc.edu',now());select private.set_pilot_manager_fixture('${manager}','active',0,'B3a local activation fixture',gen_random_uuid());`,
      );
      for (const route of routes) {
        prepare(route);
        sql(
          `select private.pilot_evidence_write_lock();delete from private.pilot_account_admission where account_id='${route.subject}';`,
        );
        const before = census();
        assert.throws(
          () => sql(`begin;${call(route)}rollback;`),
          /42501:.*Hangout operation not permitted/,
        );
        assert.equal(census(), before);
        sql(
          `begin;${auth(manager)}select public.set_pilot_account_admission('${route.subject}','active',0,'B3a local reactivation',gen_random_uuid());commit;`,
        );
        sql(`begin;${call(route)}rollback;`);
        evidence.classifications.push({
          cell: `L4_${route.id}`,
          classification:
            "observed deletion-before-call wait and fresh absence deny; actual manager activation revision0 followed by allowed public call; no activation race claimed",
        });
      }
      for (const route of routes)
        for (const isolation of ["repeatable read", "serializable"]) {
          prepare(route);
          const before = census();
          assert.throws(
            () =>
              sql(`begin isolation level ${isolation};${call(route)}commit;`),
            /42501:.*Safety operation unavailable/,
          );
          assert.equal(census(), before);
        }
      evidence.classifications.push(
        {
          cell: "referenced-object-delete",
          classification:
            "FK/reference guard forbids deletion while attached; lawful detach/delete tested through actual profile row boundary",
        },
        {
          cell: "account-delete-recreate-with-source-reference",
          classification:
            "retained source/participant FK prevents account replacement; not fabricated as observed revocation",
        },
        {
          cell: "shared-profile-pilot-manager-cycle",
          classification:
            "exclusive social ordering prevents approved manager from queuing pilot while ordinary owns social",
        },
      );
      writeFileSync(
        "agents/handoffs/TASK-021A1b3a-CONCURRENCY-EVIDENCE.json",
        JSON.stringify(evidence, null, 2) + "\n",
      );
    } finally {
      resetDisposable();
    }
  },
);
