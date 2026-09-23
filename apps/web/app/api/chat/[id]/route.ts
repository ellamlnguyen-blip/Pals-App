import { NextRequest, NextResponse } from "next/server";
import { chatAccess, chatUuid, readChat } from "../../../../lib/chat";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!chatUuid.test(id)) return reply({ kind: "invalid" }, 400);
  const target = await chatAccess();
  if (!target || request.headers.get("x-pals-chat-actor") !== target.user.id)
    return reply({ kind: "denied" }, 403);
  const raw = request.nextUrl.searchParams.get("after");
  const after = raw === null ? null : Number(raw);
  const result = await readChat(target.client, id, after);
  return reply(
    result,
    result.kind === "denied" ? 403 : result.kind === "ok" ? 200 : 400,
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!chatUuid.test(id)) return reply({ kind: "invalid" }, 400);
  const target = await chatAccess();
  if (!target || request.headers.get("x-pals-chat-actor") !== target.user.id)
    return reply({ kind: "denied" }, 403);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  const input = payload as { body?: unknown; key?: unknown } | null;
  if (
    !input ||
    typeof input.body !== "string" ||
    typeof input.key !== "string" ||
    !chatUuid.test(input.key) ||
    input.body !== input.body.trim() ||
    input.body.length < 1 ||
    input.body.length > 2000
  )
    return reply({ kind: "invalid" }, 400);
  const { data, error } = await target.client.rpc("send_hangout_message", {
    p_hangout_id: id,
    p_request_id: input.key,
    p_body: input.body,
  });
  if (error)
    return reply(
      {
        kind:
          error.code === "42501"
            ? "denied"
            : error.code === "23505"
              ? "conflict"
              : "error",
      },
      error.code === "42501" ? 403 : 400,
    );
  return reply({ kind: "ok", message: data?.[0] ?? null });
}
