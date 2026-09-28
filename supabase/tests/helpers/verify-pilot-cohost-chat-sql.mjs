import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { localTarget, sql } from "./pilot-admission-cohost-chat.mjs";
export function assertTap(output, label) {
  assert.doesNotMatch(output, /^not ok\b/m, label);
  assert.doesNotMatch(output, /#\s*(SKIP|TODO)\b/i, label + " no hidden skips");
  const plans = [...output.matchAll(/^1\.\.(\d+)$/gm)];
  assert.equal(plans.length, 1, label + " exact completed plan");
  const count = (output.match(/^ok\s+\d+/gm) ?? []).length;
  assert.ok(count > 0);
  assert.equal(count, Number(plans[0][1]));
  return count;
}
localTarget();
const setup = `insert into private.pilot_account_admission(account_id,state,revision) select id,'active',1 from public.accounts;update private.pilot_availability set enabled=true;update private.pilot_capabilities set enabled=true where key in('onboarding','hangouts','hangout_chat','people');`;
for (const file of [
  "identity_rls.test.sql",
  "onboarding.test.sql",
  "profile_enrichment.test.sql",
  "local_account_enforcement.test.sql",
  "private_pilot_admission_authority.test.sql",
  "hangout_foundation.test.sql",
  "local_global_blocks.test.sql",
  "local_hangout_chat.test.sql",
  "local_safety_reports.test.sql",
  "local_moderation_review.test.sql",
  "local_hangout_disable.test.sql",
  "local_cohost_authority.test.sql",
  "local_large_hangout_safeguards.test.sql",
]) {
  let input = readFileSync(`supabase/tests/database/${file}`, "utf8");
  if (file !== "private_pilot_admission_authority.test.sql")
    input = input.replace(
      /set local role (anon|authenticated);/,
      `${setup}\n$&`,
    );
  if (file === "identity_rls.test.sql") {
    input = input.replace(
      "2::bigint, 'active university reference rows readable; inactive campus hidden'",
      "1::bigint, 'B1 only current own campus reference readable'",
    );
    input = input.replace(
      "1::bigint, 'unconfirmed account may read its own onboarding draft'",
      "0::bigint, 'B1 unconfirmed own draft denied'",
    );
    input = input.replace(
      "select lives_ok($$update public.profiles set real_name='Draft Student', graduation_year=2027, major='Math', bio='Fixture'$$, 'unverified user may edit own draft');",
      "with changed as(update public.profiles set real_name='Draft Student' returning *) select is(count(*),0::bigint,'B1 unverified draft update denied') from changed;",
    );
    input = input.replace(
      "select is((select status from public.accounts), 'suspended', 'suspended account may read own restriction');",
      "select is(public.get_access_state(),'restricted','B1 restriction uses caller status only');",
    );
  }
  if (file === "profile_enrichment.test.sql")
    input = input.replace(
      "select lives_ok($$update profiles set interests=array['Draft']$$,'unverified active-owner draft semantics preserved');",
      "with changed as(update profiles set interests=array['Draft'] returning *) select is(count(*),0::bigint,'B1 unverified owner writes denied') from changed;",
    );
  if (file === "profile_enrichment.test.sql") {
    const marker =
      '{"sub":"60000000-0000-4000-8000-000000000003","role":"authenticated"}';
    const last = input.lastIndexOf(marker);
    assert.ok(last >= 0);
    input =
      input.slice(0, last) +
      input
        .slice(last)
        .replace(
          marker,
          '{"sub":"60000000-0000-4000-8000-000000000002","role":"authenticated"}',
        );
  }
  if (file === "local_large_hangout_safeguards.test.sql")
    input = input.replace(
      "select is(jsonb_array_length(pg_temp.saved()->'pins'),0,\n  'ready different-campus viewer sees no UNC Hangouts');",
      () =>
        "select throws_ok($$select pg_temp.saved()$$,'42501','Saved Hangouts unavailable','B1 nonUNC campus denies source readiness');",
    );
  if (file === "hangout_foundation.test.sql")
    input = input.replace(
      "1::bigint,'public roster hides no-longer-ready host'",
      "0::bigint,'B2 unready immutable host hides whole roster'",
    );
  const output = sql(input);
  assertTap(output, file);
  console.log(
    `${file}: ${(output.match(/^ok\s+\d+/gm) ?? []).length} stage-adapted assertions pass`,
  );
}
const output = sql(
  readFileSync("supabase/tests/pilot-admission-source-safety.test.sql", "utf8"),
);
assertTap(output, "source safety");
console.log(
  `pilot-admission-source-safety.test.sql: ${(output.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
);
const mandatory = sql(
  readFileSync("supabase/tests/pilot-moderation-lock-results.test.sql", "utf8"),
);
assertTap(mandatory, "operator mandatory locks");
console.log(
  `mandatory operator lock results: ${(mandatory.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
);
const owner = sql(
  readFileSync("supabase/tests/pilot-admission-owner.test.sql", "utf8"),
);
assertTap(owner, "B1 owner");
console.log(
  `B1 owner: ${(owner.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
);
const lifecycle = sql(
  readFileSync("supabase/tests/pilot-admission-lifecycle.test.sql", "utf8"),
);
assertTap(lifecycle, "B3a lifecycle");
console.log(
  `Lifecycle: ${(lifecycle.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
);
const cohostChat = sql(
  readFileSync("supabase/tests/pilot-admission-cohost-chat.test.sql", "utf8"),
);
console.log(
  `B3b cohost/chat: ${assertTap(cohostChat, "B3b cohost/chat")} actual-role SQL assertions`,
);
