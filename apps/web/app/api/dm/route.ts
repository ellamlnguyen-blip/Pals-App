import { NextRequest, NextResponse } from "next/server";
import { dmAccess, dmErrorKind, dmHeaders, dmId } from "../../../lib/dm";
export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: dmHeaders });
export async function GET(request: NextRequest) {
  const target = await dmAccess(request.headers.get("x-pals-dm-actor"));
  if (!target) return reply({ kind: "denied" }, 403);
  const query = request.nextUrl.searchParams;
  const time = query.get("time"),
    generation = query.get("generation");
  if (
    (time === null) !== (generation === null) ||
    (generation && !dmId.test(generation)) ||
    (time && !Number.isFinite(Date.parse(time)))
  )
    return reply({ kind: "invalid" }, 400);
  const { data, error } = await target.client.rpc("list_dm_inbox", {
    p_after_created_at: time,
    p_after_generation_id: generation,
    p_limit: 24,
  });
  if (error) {
    const kind = dmErrorKind(error.code);
    return reply({ kind }, kind === "denied" ? 403 : 400);
  }
  return reply({ kind: "ok", rows: data ?? [] });
}
export async function POST(request: NextRequest) {
  const target = await dmAccess(request.headers.get("x-pals-dm-actor"));
  if (!target) return reply({ kind: "denied" }, 403);
  let input: { peer?: unknown; key?: unknown; body?: unknown };
  try {
    input = await request.json();
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  if (
    !input ||
    typeof input.peer !== "string" ||
    !dmId.test(input.peer) ||
    typeof input.key !== "string" ||
    !dmId.test(input.key) ||
    typeof input.body !== "string" ||
    input.body !== input.body.trim() ||
    input.body.length < 1 ||
    input.body.length > 2000
  )
    return reply({ kind: "invalid" }, 400);
  // A People detail is the only entry. Recheck it for this caller immediately before the RPC.
  const detail = await target.client.rpc("get_people_detail", {
    p_account_id: input.peer,
  });
  if (detail.error || !detail.data?.length)
    return reply({ kind: "denied" }, 403);
  const { data, error } = await target.client.rpc("create_dm_request", {
    p_target_id: input.peer,
    p_request_id: input.key,
    p_body: input.body,
  });
  if (error) {
    const kind = dmErrorKind(error.code);
    return reply({ kind }, kind === "denied" ? 403 : 400);
  }
  return reply({ kind: "ok", generation: data });
}
