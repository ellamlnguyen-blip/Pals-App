import { NextRequest, NextResponse } from "next/server";
import { access } from "../../../../lib/access";
import { dmHeaders } from "../../../../lib/dm";
import { localPeopleAvailable } from "../../../../lib/people";

export const dynamic = "force-dynamic";
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: dmHeaders });

export async function POST(request: NextRequest) {
  let target;
  try {
    target = localPeopleAvailable() ? await access() : null;
  } catch {
    return reply({ kind: "denied" }, 403);
  }
  if (
    !target?.user ||
    target.user.id !== request.headers.get("x-pals-chat-actor") ||
    target.state !== "ready"
  )
    return reply({ kind: "denied" }, 403);
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  if (!input || typeof input !== "object")
    return reply({ kind: "invalid" }, 400);
  const body = input as Record<string, unknown>;
  if (
    (body.kind !== "dm" && body.kind !== "hangout") ||
    typeof body.sourceId !== "string" ||
    !uuid.test(body.sourceId) ||
    (body.action !== "touch" && body.action !== "ack")
  )
    return reply({ kind: "invalid" }, 400);
  if (
    body.action === "ack" &&
    (!Number.isSafeInteger(body.sequence) || (body.sequence as number) < 1)
  )
    return reply({ kind: "invalid" }, 400);
  const result =
    body.action === "touch"
      ? await target.client.rpc("touch_my_chat", {
          p_source_kind: body.kind,
          p_source_id: body.sourceId,
        })
      : await target.client.rpc("acknowledge_chat_page", {
          p_source_kind: body.kind,
          p_source_id: body.sourceId,
          p_highest_visible_sequence: body.sequence,
        });
  if (result.error)
    return reply(
      { kind: result.error.code === "42501" ? "denied" : "error" },
      result.error.code === "42501" ? 403 : 503,
    );
  return reply({ kind: "ok" });
}
