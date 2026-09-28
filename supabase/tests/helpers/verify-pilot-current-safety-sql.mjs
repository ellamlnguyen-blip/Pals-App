import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { localTarget, sql } from "./pilot-admission-current-safety.mjs";
export function assertTap(output, label) {
  assert.doesNotMatch(output, /^not ok\b/m, label);
  assert.doesNotMatch(output, /#\s*(SKIP|TODO)\b/i, label + " no hidden skips");
  const plans = [...output.matchAll(/^1\.\.(\d+)$/gm)];
  assert.equal(plans.length, 1, label + " exact completed plan");
  const count = (output.match(/^ok\s+\d+/gm) ?? []).length;
  assert.ok(count > 0);
  assert.equal(count, Number(plans[0][1]));
  assert.deepEqual(
    [...output.matchAll(/^ok\s+(\d+)\b/gm)].map((m) => Number(m[1])),
    Array.from({ length: count }, (_, n) => n + 1),
    label + " exact TAP numbering",
  );
  return count;
}
const root = fileURLToPath(new URL("../../../", import.meta.url));
export const inheritedSQLManifest = Object.freeze([
  "supabase/tests/database/identity_rls.test.sql",
  "supabase/tests/database/onboarding.test.sql",
  "supabase/tests/database/profile_enrichment.test.sql",
  "supabase/tests/database/local_account_enforcement.test.sql",
  "supabase/tests/database/private_pilot_admission_authority.test.sql",
  "supabase/tests/database/hangout_foundation.test.sql",
  "supabase/tests/database/local_global_blocks.test.sql",
  "supabase/tests/database/local_hangout_chat.test.sql",
  "supabase/tests/database/local_safety_reports.test.sql",
  "supabase/tests/database/local_moderation_review.test.sql",
  "supabase/tests/database/local_hangout_disable.test.sql",
  "supabase/tests/database/local_cohost_authority.test.sql",
  "supabase/tests/database/local_large_hangout_safeguards.test.sql",
  "supabase/tests/pilot-admission-source-safety.test.sql",
  "supabase/tests/pilot-moderation-lock-results.test.sql",
  "supabase/tests/pilot-admission-owner.test.sql",
  "supabase/tests/pilot-admission-lifecycle.test.sql",
  "supabase/tests/pilot-admission-cohost-chat.test.sql",
]);
export const currentSQLModule =
  "supabase/tests/pilot-admission-current-safety.test.sql";
export const operatorSQLModule =
  "supabase/tests/pilot-current-safety-operators.test.sql";
export const adapterManifest = Object.freeze({
  identity_rls: 4,
  profile_enrichment: 2,
  hangout_foundation: 1,
  local_large_hangout_safeguards: 1,
  admission_setup:
    "12 inherited database suites; exact first client-role marker",
});
import { createHash } from "node:crypto";
const frozenSQLHashes = Object.freeze({
  "supabase/tests/database/identity_rls.test.sql":
    "b32ed85765f563882d7a5ace828047bf2adf2812162e1ed70dca1e537e29d685",
  "supabase/tests/database/onboarding.test.sql":
    "836c7bc0b612a82c473de3f8278930441ece597e7f9ef8f94aa9cb8e256231bc",
  "supabase/tests/database/profile_enrichment.test.sql":
    "351f95ba64f7828b9b85a9528fcc08f9d9be09909668507b9bc84816e3effcfd",
  "supabase/tests/database/local_account_enforcement.test.sql":
    "e7a230bf7fdb1a8c04cc10ce77588fb5a22c36e9f68351b15cdc471ca43f9f2a",
  "supabase/tests/database/private_pilot_admission_authority.test.sql":
    "df7e2706861040817d677b80a6a4fabd12deb5e260368faeabfb25a464602c28",
  "supabase/tests/database/hangout_foundation.test.sql":
    "3070ae16b9c4af16577d8dcba2f0e4104b4188282feb81c943a16788df04e45b",
  "supabase/tests/database/local_global_blocks.test.sql":
    "d2716806a1c6a580b17ff6359936807a962d0ee1fd5f5b340c01b5f26d7c3f70",
  "supabase/tests/database/local_hangout_chat.test.sql":
    "60bbda63a871722f7bb9c5d1b90dd0cd0b284767cd6daa7f5ee5956faba79e80",
  "supabase/tests/database/local_safety_reports.test.sql":
    "266b98306264d56e5284e4f24c6b48b65db56a110fc3561775b19b106a9d21fb",
  "supabase/tests/database/local_moderation_review.test.sql":
    "379bb8d34a4963c0c365eb4ce0b037878bf88fb3db181e99dcdfce2b1da63d24",
  "supabase/tests/database/local_hangout_disable.test.sql":
    "5c5f96ad8d6e091fb763fcc2f2794f5ac8f66140cad44258ae60c4e4ca149016",
  "supabase/tests/database/local_cohost_authority.test.sql":
    "e63648c03fd15989e8415c57f5bbd92611fa1f8e0ec5fc1628bbc47b344dfa1e",
  "supabase/tests/database/local_large_hangout_safeguards.test.sql":
    "47858dff02b33ba3f89d6bf60cbef3bc639ffc3a16ad29414354652059cb6f45",
  "supabase/tests/pilot-admission-source-safety.test.sql":
    "a297ce38fa91f9248239879bd4218056ac6f1250bd482d0f5dc2418aef3556d3",
  "supabase/tests/pilot-moderation-lock-results.test.sql":
    "cbe2d4dac9ea239d8bfd0191098dadeb20eeec93528d5300911a94292deaddbc",
  "supabase/tests/pilot-admission-owner.test.sql":
    "18d63ed7de819aee023759dd4007aa421c3e7190d4b27d1a57d7bb8b3a5d8b99",
  "supabase/tests/pilot-admission-lifecycle.test.sql":
    "5724eb1a5d87edec9112db983e272d1755cf19778314ce91e373ab201441de2f",
  "supabase/tests/pilot-admission-cohost-chat.test.sql":
    "aec3e9fcacebacc19fc3c39f8b3cb96f0f107296f950ea4683eb45a88eb341c9",
  "supabase/tests/pilot-admission-current-safety.test.sql":
    "a247eeb94c5311d8f3f37b8bfbf17fde13ef78bcb67ec095c062e717c767873d",
});
export function runSQL({ combined = true } = {}) {
  // Future operator file is mandatory in combined mode; absence stops before target contact.
  for (const [file, hash] of Object.entries(frozenSQLHashes))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(resolve(root, file)))
        .digest("hex"),
      hash,
      "reviewed SQL source changed",
    );
  const operator = combined
    ? readFileSync(resolve(root, operatorSQLModule), "utf8")
    : null;
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
    let input = readFileSync(
      resolve(root, `supabase/tests/database/${file}`),
      "utf8",
    );
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
    readFileSync(
      resolve(root, "supabase/tests/pilot-admission-source-safety.test.sql"),
      "utf8",
    ),
  );
  assertTap(output, "source safety");
  console.log(
    `pilot-admission-source-safety.test.sql: ${(output.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const mandatory = sql(
    readFileSync(
      resolve(root, "supabase/tests/pilot-moderation-lock-results.test.sql"),
      "utf8",
    ),
  );
  assertTap(mandatory, "operator mandatory locks");
  console.log(
    `mandatory operator lock results: ${(mandatory.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const owner = sql(
    readFileSync(
      resolve(root, "supabase/tests/pilot-admission-owner.test.sql"),
      "utf8",
    ),
  );
  assertTap(owner, "B1 owner");
  console.log(
    `B1 owner: ${(owner.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const lifecycle = sql(
    readFileSync(
      resolve(root, "supabase/tests/pilot-admission-lifecycle.test.sql"),
      "utf8",
    ),
  );
  assertTap(lifecycle, "B3a lifecycle");
  console.log(
    `Lifecycle: ${(lifecycle.match(/^ok\s+\d+/gm) ?? []).length} assertions pass`,
  );
  const cohostChat = sql(
    readFileSync(
      resolve(root, "supabase/tests/pilot-admission-cohost-chat.test.sql"),
      "utf8",
    ),
  );
  console.log(
    `B3b cohost/chat: ${assertTap(cohostChat, "B3b cohost/chat")} actual-role SQL assertions`,
  );

  const current = sql(readFileSync(resolve(root, currentSQLModule), "utf8"));
  assert.equal(
    assertTap(current, "B3c base current safety"),
    76,
    "frozen current base76 assertions",
  );
  if (combined) assertTap(sql(operator), "expanded actual operator module");
  return {
    inherited_modules: 18,
    current_modules: 1,
    expanded_operator_modules: combined ? 1 : 0,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const mode = process.argv[2] ?? "combined";
  assert.ok(["base", "combined"].includes(mode), "base or combined only");
  console.log(JSON.stringify(runSQL({ combined: mode === "combined" })));
}
