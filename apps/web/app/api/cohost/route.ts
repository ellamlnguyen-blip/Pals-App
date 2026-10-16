import { NextRequest, NextResponse } from "next/server";
import { notificationAccess, notificationHeaders, notificationId } from "../../../lib/notifications";
import { readSavedPublic } from "../../../lib/saved-hangouts";

export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: notificationHeaders });
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const uuid = (value: unknown): value is string => typeof value === "string" && notificationId.test(value);
const target = (request: NextRequest) => notificationAccess(request.headers.get("x-pals-cohost-actor"));

export async function GET(request: NextRequest) {
  const owner = await target(request);
  if (!owner || owner.state !== "ready") return reply({ kind: "denied" }, 403);
  const q = request.nextUrl.searchParams;
  if ([...q.keys()].some((key) => !["hangout", "invitation", "time", "id"].includes(key) || q.getAll(key).length !== 1))
    return reply({ kind: "invalid" }, 400);
  const id = q.get("invitation");
  if (id !== null) {
    if (q.size !== 1 || !uuid(id)) return reply({ kind: "invalid" }, 400);
    const result = await owner.client.rpc("get_own_cohost_invitation", { p_invitation_id: id });
    if (result.error) return reply({ kind: result.error.code === "42501" ? "denied" : "error" }, result.error.code === "42501" ? 403 : 503);
    const row = result.data?.[0];
    return row ? reply({ kind: "ok", actor: owner.user.id, invitation: row }) : reply({ kind: "denied" }, 403);
  }
  const hangout = q.get("hangout");
  const time = q.get("time"), afterId = q.get("id");
  if (!uuid(hangout) || (time === null) !== (afterId === null) || (afterId !== null && !uuid(afterId)) || (time !== null && (time.length > 80 || !Number.isFinite(Date.parse(time)))) || ![1, 3].includes(q.size)) return reply({ kind: "invalid" }, 400);
  const source = await readSavedPublic(owner.client, hangout);
  if (!source || source.host_id !== owner.user.id || source.status !== "published") return reply({ kind: "denied" }, 403);
  const result = await owner.client.rpc("list_hangout_cohost_invitations", { p_hangout_id: hangout, p_after_created_at: time, p_after_id: afterId, p_limit: 24 });
  if (result.error) return reply({ kind: result.error.code === "42501" ? "denied" : "error" }, result.error.code === "42501" ? 403 : 503);
  const live = await owner.client.rpc("get_access_state");
  const latest = await readSavedPublic(owner.client, hangout);
  if (live.error || live.data !== "ready" || !latest || latest.host_id !== owner.user.id || latest.revision !== source.revision || latest.status !== "published")
    return reply({ kind: "denied" }, 403);
  const verified = await owner.client.rpc("list_hangout_cohost_invitations", { p_hangout_id: hangout, p_after_created_at: time, p_after_id: afterId, p_limit: 24 });
  if (verified.error) return reply({ kind: verified.error.code === "42501" ? "denied" : "error" }, verified.error.code === "42501" ? 403 : 503);
  if (JSON.stringify(result.data ?? []) !== JSON.stringify(verified.data ?? [])) return reply({ kind: "error" }, 503);
  return reply({ kind: "ok", actor: owner.user.id, revision: latest.revision, rows: verified.data ?? [], more: (verified.data?.length ?? 0) === 24 });
}

export async function POST(request: NextRequest) {
  const owner = await target(request);
  if (!owner || owner.state !== "ready") return reply({ kind: "denied" }, 403);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return reply({ kind: "invalid" }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input) || !revision(input.revision)) return reply({ kind: "invalid" }, 400);
  const action = input.action;
  const keys = Object.keys(input).sort().join();
  let rpc: string;
  let args: Record<string, unknown>;
  if (action === "invite" && keys === "action,hangout,recipient,requestId,revision" && uuid(input.hangout) && uuid(input.recipient) && uuid(input.requestId)) {
    rpc = "invite_hangout_cohost";
    args = { p_hangout_id: input.hangout, p_account_id: input.recipient, p_request_id: input.requestId, p_expected_revision: input.revision };
  } else if (action === "withdraw" && keys === "action,invitation,revision" && uuid(input.invitation)) {
    rpc = "withdraw_hangout_cohost_invitation";
    args = { p_invitation_id: input.invitation, p_expected_revision: input.revision };
  } else if ((action === "accept" || action === "decline") && keys === "action,invitation,revision" && uuid(input.invitation)) {
    rpc = "respond_hangout_cohost_invitation";
    args = { p_invitation_id: input.invitation, p_accept: action === "accept", p_expected_revision: input.revision };
  } else return reply({ kind: "invalid" }, 400);
  try {
    const result = await owner.client.rpc(rpc, args);
    if (result.error) return reply({ kind: result.error.code === "PT409" ? "stale" : result.error.code === "42501" ? "denied" : "uncertain" }, result.error.code === "PT409" ? 409 : result.error.code === "42501" ? 403 : 503);
    const live = await owner.client.rpc("get_access_state");
    if (live.error || live.data !== "ready") return reply({ kind: "denied" }, 403);
    return reply({ kind: "saved", actor: owner.user.id, result: result.data });
  } catch { return reply({ kind: "uncertain" }, 503); }
}
