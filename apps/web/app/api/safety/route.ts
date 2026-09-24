import { NextRequest, NextResponse } from "next/server";
import {
  globalConfirmationVersion,
  previousUuid,
  safetyAccess,
  safetyCategories,
  safetyHeaders,
  safetyId,
  safetyModes,
} from "../../../lib/safety";

export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: safetyHeaders });
const failure = (code?: string) =>
  reply(
    { kind: code === "42501" ? "denied" : "error" },
    code === "42501" ? 403 : 503,
  );
const actor = (request: NextRequest) =>
  safetyAccess(request.headers.get("x-pals-safety-actor"));

export async function GET(request: NextRequest) {
  const target = await actor(request);
  if (!target) return reply({ kind: "denied" }, 403);
  const q = request.nextUrl.searchParams;
  if (
    [...q.keys()].some(
      (key) =>
        !["view", "after", "id"].includes(key) || q.getAll(key).length !== 1,
    )
  )
    return reply({ kind: "invalid" }, 400);
  const view = q.get("view"),
    after = q.get("after"),
    id = q.get("id");
  if (
    (after !== null && !safetyId.test(after)) ||
    (id !== null && !safetyId.test(id))
  )
    return reply({ kind: "invalid" }, 400);
  if (view === "probe" && q.size === 1) {
    const result = await target.client.rpc("list_people_blocked_ids", {
      p_limit: 1,
    });
    return result.error
      ? failure(result.error.code)
      : reply({ kind: "ok", actor: target.user.id });
  }
  if (view === "blocked" && id === null) {
    const result = await target.client.rpc("list_people_blocked_ids", {
      p_after_id: after,
      p_limit: 24,
    });
    return result.error
      ? failure(result.error.code)
      : reply({ kind: "ok", actor: target.user.id, rows: result.data ?? [] });
  }
  if (view === "retained" && id === null) {
    const result = await target.client.rpc("list_my_retained_hangout_ids", {
      p_after_id: after,
      p_limit: 24,
    });
    return result.error
      ? failure(result.error.code)
      : reply({ kind: "ok", actor: target.user.id, rows: result.data ?? [] });
  }
  if (view === "exact" && id && after === null) {
    const result = await target.client.rpc("list_people_blocked_ids", {
      p_after_id: previousUuid(id),
      p_limit: 1,
    });
    return result.error
      ? failure(result.error.code)
      : reply({
          kind: "ok",
          actor: target.user.id,
          blocked:
            result.data?.[0]?.account_id?.toLowerCase() === id.toLowerCase(),
        });
  }
  return reply({ kind: "invalid" }, 400);
}

export async function POST(request: NextRequest) {
  const target = await actor(request);
  if (!target) return reply({ kind: "denied" }, 403);
  if (Number(request.headers.get("content-length") ?? "0") > 12000)
    return reply({ kind: "invalid" }, 400);
  let input: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return reply({ kind: "invalid" }, 400);
    input = JSON.parse(raw);
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return reply({ kind: "invalid" }, 400);
  if (
    input.action === "block" &&
    Object.keys(input).sort().join() === "action,blocked,confirmation,id" &&
    typeof input.id === "string" &&
    safetyId.test(input.id) &&
    typeof input.blocked === "boolean" &&
    input.confirmation === globalConfirmationVersion
  ) {
    const result = await target.client.rpc("set_safety_block", {
      p_account_id: input.id,
      p_blocked: input.blocked,
    });
    return result.error
      ? failure(result.error.code)
      : reply(
          { kind: result.data === input.blocked ? "ok" : "denied" },
          result.data === input.blocked ? 200 : 403,
        );
  }
  if (
    input.action === "report" &&
    Object.keys(input).sort().join() ===
      "action,category,id,mode,narrative,requestId" &&
    typeof input.requestId === "string" &&
    safetyId.test(input.requestId) &&
    typeof input.id === "string" &&
    safetyId.test(input.id) &&
    typeof input.mode === "string" &&
    safetyModes.some((x) => x === input.mode) &&
    typeof input.category === "string" &&
    safetyCategories.some((x) => x === input.category) &&
    typeof input.narrative === "string"
  ) {
    const narrative = input.narrative.trim();
    if (
      [...narrative].length > 2000 ||
      (input.category === "other" && !narrative)
    )
      return reply({ kind: "invalid" }, 400);
    const result = await target.client.rpc("submit_safety_report", {
      p_request_id: input.requestId,
      p_target_mode: input.mode,
      p_target_id: input.id,
      p_category: input.category,
      p_narrative: narrative || null,
    });
    return result.error
      ? failure(result.error.code)
      : reply({
          kind: "ok",
          actor: target.user.id,
          receipt: result.data?.[0] ?? null,
        });
  }
  return reply({ kind: "invalid" }, 400);
}
