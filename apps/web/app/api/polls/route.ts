import { NextRequest, NextResponse } from "next/server";
import { chatAccess, chatUuid } from "../../../lib/chat";
import { dmAccess } from "../../../lib/dm";
import { normalizedPollDraft } from "../../chats/poll-input";

export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers });
const uuid = chatUuid;
type Source = {
  kind: "hangout" | "dm";
  sourceId: string;
  peerId: string | null;
};
type Input = Record<string, unknown>;

function source(input: Input): Source | null {
  const { kind, sourceId, peerId } = input;
  if (
    (kind !== "hangout" && kind !== "dm") ||
    typeof sourceId !== "string" ||
    !uuid.test(sourceId)
  )
    return null;
  if (kind === "hangout")
    return peerId === null ? { kind, sourceId, peerId: null } : null;
  return typeof peerId === "string" && uuid.test(peerId)
    ? { kind, sourceId, peerId }
    : null;
}
function errorKind(code?: string) {
  return code === "42501"
    ? "denied"
    : code === "23505"
      ? "conflict"
      : code === "22023"
        ? "invalid"
        : "error";
}
function failed(code?: string) {
  const kind = errorKind(code);
  return reply(
    { kind },
    kind === "denied"
      ? 403
      : kind === "conflict"
        ? 409
        : kind === "invalid"
          ? 400
          : 503,
  );
}
async function actor(request: NextRequest, item: Source) {
  const claimed = request.headers.get("x-pals-poll-actor");
  if (!claimed || !uuid.test(claimed)) return null;
  const result =
    item.kind === "hangout" ? await chatAccess() : await dmAccess(claimed);
  if (!result?.user || result.user.id !== claimed) return null;
  if (item.kind === "dm") {
    const current = await result.client.rpc("get_dm_consent_ui_state", {
      p_peer_id: item.peerId,
    });
    if (
      current.error ||
      current.data?.[0]?.generation_id !== item.sourceId ||
      current.data[0].state !== "accepted"
    )
      return null;
    const readable = await result.client.rpc("read_dm_messages", {
      p_peer_id: item.peerId,
      p_generation_id: item.sourceId,
      p_after_sequence: null,
      p_limit: 1,
    });
    if (readable.error || !readable.data?.length) return null;
  }
  return result.client;
}
function params(item: Source) {
  return {
    p_kind: item.kind,
    p_source_id: item.sourceId,
    p_peer_id: item.peerId,
  };
}
function parse(input: unknown): Input | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Input)
    : null;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const item = source({
    kind: query.get("kind"),
    sourceId: query.get("sourceId"),
    peerId: query.get("peerId"),
  });
  const before = query.get("before");
  const beforeId = query.get("beforeId");
  if (
    !item ||
    !!before !== !!beforeId ||
    (before !== null &&
      (Number.isNaN(Date.parse(before)) || !beforeId || !uuid.test(beforeId)))
  )
    return reply({ kind: "invalid" }, 400);
  const client = await actor(request, item);
  if (!client) return reply({ kind: "denied" }, 403);
  const result = await client.rpc("list_chat_polls", {
    ...params(item),
    p_before_created_at: before,
    p_before_poll_id: beforeId,
    p_limit: 24,
  });
  return result.error
    ? failed(result.error.code)
    : reply({ kind: "ok", polls: result.data ?? [] });
}

export async function POST(request: NextRequest) {
  let input: Input | null;
  try {
    input = parse(await request.json());
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  const item = input && source(input);
  if (
    !item ||
    typeof input?.action !== "string" ||
    typeof input.key !== "string" ||
    !uuid.test(input.key)
  )
    return reply({ kind: "invalid" }, 400);
  const action = input.action;
  if (action === "create") {
    const draft = normalizedPollDraft(input.question, input.options);
    if (
      !draft ||
      draft.question !== input.question ||
      draft.options.some(
        (value, index) => value !== (input.options as string[])[index],
      )
    )
      return reply({ kind: "invalid" }, 400);
  } else if (action === "vote") {
    if (
      typeof input.pollId !== "string" ||
      !uuid.test(input.pollId) ||
      typeof input.optionId !== "string" ||
      !uuid.test(input.optionId)
    )
      return reply({ kind: "invalid" }, 400);
  } else if (action === "close") {
    if (typeof input.pollId !== "string" || !uuid.test(input.pollId))
      return reply({ kind: "invalid" }, 400);
  } else return reply({ kind: "invalid" }, 400);
  const client = await actor(request, item);
  if (!client) return reply({ kind: "denied" }, 403);
  const args = { ...params(item), p_request_id: input.key };
  const result =
    action === "create"
      ? await client.rpc("create_chat_poll", {
          ...args,
          p_question: input.question,
          p_options: input.options,
        })
      : action === "vote"
        ? await client.rpc("vote_chat_poll", {
            ...args,
            p_poll_id: input.pollId,
            p_option_id: input.optionId,
          })
        : await client.rpc("close_chat_poll", {
            ...args,
            p_poll_id: input.pollId,
          });
  return result.error
    ? failed(result.error.code)
    : reply({ kind: "ok", result: result.data });
}
