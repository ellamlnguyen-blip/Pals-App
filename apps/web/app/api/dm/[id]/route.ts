import { NextRequest, NextResponse } from "next/server";
import { dmAccess, dmErrorKind, dmHeaders, dmId } from "../../../../lib/dm";
export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: dmHeaders });
async function context(request: NextRequest, id: string) {
  if (!dmId.test(id)) return null;
  return dmAccess(request.headers.get("x-pals-dm-actor"));
}
export async function GET(
  request: NextRequest,
  route: { params: Promise<{ id: string }> },
) {
  const { id } = await route.params;
  const target = await context(request, id);
  if (!target) return reply({ kind: "denied" }, 403);
  const raw = request.nextUrl.searchParams.get("after");
  const after = raw === null ? null : Number(raw);
  if (after !== null && (!Number.isSafeInteger(after) || after < 1))
    return reply({ kind: "invalid" }, 400);
  const statusResult = await target.client.rpc("get_dm_status", {
    p_peer_id: id,
  });
  if (statusResult.error) {
    const kind = dmErrorKind(statusResult.error.code);
    return reply({ kind }, kind === "denied" ? 403 : 400);
  }
  const status = statusResult.data?.[0] ?? null;
  if (!status) return reply({ kind: "unavailable" }, 404);
  if (status.state === "pending" && status.direction === "outgoing")
    return reply({ kind: "ok", status, messages: [], bodyAccess: false });
  const messages = await target.client.rpc("read_dm_messages", {
    p_peer_id: id,
    p_generation_id: status.generation_id,
    p_after_sequence: after,
    p_limit: 50,
  });
  if (messages.error) {
    const kind = dmErrorKind(messages.error.code);
    return reply({ kind }, kind === "denied" ? 403 : 400);
  }
  // A pending/accepted generation always has its first message on the first page.
  // On later pages, make a separate first-page authorization probe to distinguish an empty page from pause.
  let bodyAccess = (messages.data?.length ?? 0) > 0;
  if (!bodyAccess && after !== null) {
    const probe = await target.client.rpc("read_dm_messages", {
      p_peer_id: id,
      p_generation_id: status.generation_id,
      p_after_sequence: null,
      p_limit: 1,
    });
    if (probe.error) {
      const kind = dmErrorKind(probe.error.code);
      return reply({ kind }, kind === "denied" ? 403 : 400);
    }
    bodyAccess = (probe.data?.length ?? 0) > 0;
  }
  return reply({
    kind: "ok",
    status,
    messages: bodyAccess ? (messages.data ?? []) : [],
    bodyAccess,
  });
}
export async function POST(
  request: NextRequest,
  route: { params: Promise<{ id: string }> },
) {
  const { id } = await route.params;
  const target = await context(request, id);
  if (!target) return reply({ kind: "denied" }, 403);
  let input: {
    action?: unknown;
    generation?: unknown;
    key?: unknown;
    body?: unknown;
  };
  try {
    input = await request.json();
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  if (
    !input ||
    typeof input.action !== "string" ||
    typeof input.generation !== "string" ||
    !dmId.test(input.generation)
  )
    return reply({ kind: "invalid" }, 400);
  const action = input.action;
  if (
    ![
      "accept",
      "reply",
      "ignore",
      "withdraw",
      "close",
      "send",
      "block",
    ].includes(action)
  )
    return reply({ kind: "invalid" }, 400);
  if (
    ["reply", "send"].includes(action) &&
    (typeof input.key !== "string" ||
      !dmId.test(input.key) ||
      typeof input.body !== "string" ||
      input.body !== input.body.trim() ||
      input.body.length < 1 ||
      input.body.length > 2000)
  )
    return reply({ kind: "invalid" }, 400);
  // Reject a stale generation before any mutation. The RPC repeats this authority check under its pair lock.
  const status = await target.client.rpc("get_dm_status", { p_peer_id: id });
  if (status.error) {
    const kind = dmErrorKind(status.error.code);
    return reply({ kind }, kind === "denied" ? 403 : 400);
  }
  if (status.data?.[0]?.generation_id !== input.generation)
    return reply({ kind: "stale" }, 409);
  let result;
  if (action === "send")
    result = await target.client.rpc("send_dm_message", {
      p_peer_id: id,
      p_generation_id: input.generation,
      p_request_id: input.key,
      p_body: input.body,
    });
  else if (action === "block")
    result = await target.client.rpc("set_people_block", {
      p_account_id: id,
      p_blocked: true,
    });
  else
    result = await target.client.rpc("transition_dm", {
      p_peer_id: id,
      p_generation_id: input.generation,
      p_action: action,
      p_reply_request_id: action === "reply" ? input.key : null,
      p_reply_body: action === "reply" ? input.body : null,
    });
  if (result.error) {
    const kind = dmErrorKind(result.error.code);
    return reply(
      { kind },
      kind === "denied" ? 403 : kind === "conflict" ? 409 : 400,
    );
  }
  return reply({ kind: "ok" });
}
