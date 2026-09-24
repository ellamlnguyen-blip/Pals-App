import { NextRequest } from "next/server";
import { privateResponse, requestClient } from "../../../lib/server";

const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const exact = (v: unknown, keys: string[]) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
const bounded = (v: unknown) =>
  typeof v === "string" &&
  [...v.trim()].length >= 1 &&
  [...v.trim()].length <= 2000;
const validRevision = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const denial = () => privateResponse({ error: "Moderation unavailable." }, 403);

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "http://127.0.0.1:3001")
    return denial();
  if (!process.env.SUPABASE_PUBLISHABLE_KEY) return denial();
  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return denial();
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return denial();
  const response = privateResponse({});
  try {
    const client = requestClient(request, response);
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || !user.user) return denial();
    let result;
    if (
      input.op === "list" &&
      exact(input, ["op", "afterAt", "afterId"]) &&
      ((input.afterAt === null && input.afterId === null) ||
        (typeof input.afterAt === "string" &&
          !Number.isNaN(Date.parse(input.afterAt)) &&
          uuid(input.afterId)))
    ) {
      result = await client.rpc("list_moderation_reports", {
        p_after_submitted_at: input.afterAt,
        p_after_id: input.afterId,
        p_limit: 24,
      });
    } else if (
      input.op === "detail" &&
      exact(input, ["op", "reportId"]) &&
      uuid(input.reportId)
    ) {
      result = await client.rpc("get_moderation_report", {
        p_report_id: input.reportId,
      });
    } else if (
      input.op === "case" &&
      exact(input, [
        "op",
        "reportId",
        "requestId",
        "revision",
        "action",
        "note",
        "duplicateId",
      ]) &&
      uuid(input.reportId) &&
      uuid(input.requestId) &&
      validRevision(input.revision) &&
      typeof input.action === "string" &&
      [
        "start_review",
        "annotate",
        "close_no_action",
        "close_duplicate",
        "reopen",
      ].includes(input.action) &&
      (input.action === "start_review"
        ? input.note === null && input.duplicateId === null
        : bounded(input.note)) &&
      (input.action === "close_duplicate"
        ? uuid(input.duplicateId)
        : input.duplicateId === null)
    ) {
      result = await client.rpc("transition_moderation_case", {
        p_report_id: input.reportId,
        p_request_id: input.requestId,
        p_expected_revision: input.revision,
        p_action: input.action,
        p_note: input.note,
        p_duplicate_report_id: input.duplicateId,
      });
    } else if (
      input.op === "account" &&
      exact(input, [
        "op",
        "reportId",
        "requestId",
        "revision",
        "action",
        "reason",
      ]) &&
      uuid(input.reportId) &&
      uuid(input.requestId) &&
      validRevision(input.revision) &&
      ["suspend", "ban", "reinstate"].includes(String(input.action)) &&
      bounded(input.reason)
    ) {
      result = await client.rpc("apply_account_moderation_action", {
        p_report_id: input.reportId,
        p_request_id: input.requestId,
        p_expected_case_revision: input.revision,
        p_action: input.action,
        p_reason: String(input.reason).trim(),
      });
    } else if (
      input.op === "hangout" &&
      exact(input, ["op", "reportId", "requestId", "revision", "reason"]) &&
      uuid(input.reportId) &&
      uuid(input.requestId) &&
      validRevision(input.revision) &&
      bounded(input.reason)
    ) {
      result = await client.rpc("apply_hangout_moderation_action", {
        p_report_id: input.reportId,
        p_request_id: input.requestId,
        p_expected_case_revision: input.revision,
        p_reason: String(input.reason).trim(),
      });
    } else return denial();
    if (result.error) return denial();
    const done = privateResponse({ data: result.data });
    response.cookies.getAll().forEach((c) => done.cookies.set(c));
    return done;
  } catch {
    return denial();
  }
}
