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
  let input: { peer?: unknown; key?: unknown; body?: unknown; mode?: unknown };
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
    input.body.length > 2000 ||
    (input.mode !== undefined &&
      !["request", "friend"].includes(input.mode as string))
  )
    return reply({ kind: "invalid" }, 400);
  // A People detail is the only entry. Recheck it for this caller immediately before the RPC.
  const detail = await target.client.rpc("get_people_detail", {
    p_account_id: input.peer,
  });
  if (detail.error || !detail.data?.length)
    return reply({ kind: "denied" }, 403);
  const mode = input.mode ?? "request";
  if (mode === "request") {
    const friendship = await target.client.rpc("get_friendship", {
      p_peer_id: input.peer,
    });
    if (friendship.error) return reply({ kind: "error" }, 503);
    if (friendship.data?.[0]?.state === "accepted") {
      // An active request may still need an exact retry; the backend checks its
      // key and payload. Do not create a fresh request for a newly formed pair.
      const active = await target.client.rpc("get_dm_status", {
        p_peer_id: input.peer,
      });
      if (active.error) return reply({ kind: "denied" }, 403);
      if (!active.data?.length) return reply({ kind: "stale" }, 409);
    }
  }
  const { data, error } =
    mode === "friend"
      ? await target.client.rpc("send_friend_dm_message", {
          p_peer_id: input.peer,
          p_request_id: input.key,
          p_body: input.body,
        })
      : await target.client.rpc("create_dm_request", {
          p_target_id: input.peer,
          p_request_id: input.key,
          p_body: input.body,
        });
  if (error) {
    const kind = dmErrorKind(error.code);
    return reply({ kind }, kind === "denied" ? 403 : 400);
  }
  return reply({
    kind: "ok",
    generation: mode === "friend" ? data?.[0]?.generation_id : data,
  });
}
