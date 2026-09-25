import assert from "node:assert/strict";
import test from "node:test";
import { sameVisiblePage } from "../apps/web/lib/saved-hangouts-types.ts";

test("a stable Hangout revision cannot validate a roster after block or readiness loss", () => {
  const before = [
    { account_id: "00000000-0000-4000-8000-000000000001", role_label: "host" },
    {
      account_id: "00000000-0000-4000-8000-000000000002",
      role_label: "participant",
    },
  ];
  const afterBlock = before.slice(0, 1);
  const afterRoleChange = [before[0], { ...before[1], role_label: "cohost" }];
  assert.equal(sameVisiblePage(before, afterBlock), false);
  assert.equal(sameVisiblePage(before, afterRoleChange), false);
  assert.equal(
    sameVisiblePage(
      before,
      before.map((row) => ({ ...row })),
    ),
    true,
  );
});

test("a retained host assignment page must change when block reconciliation clears an ID", () => {
  const assigned = [{ account_id: "00000000-0000-4000-8000-000000000002" }];
  assert.equal(sameVisiblePage(assigned, []), false);
  assert.equal(sameVisiblePage(assigned, [...assigned]), true);
});
