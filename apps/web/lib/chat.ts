import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { access } from "./access";
import { requireLocalHangouts } from "./hangouts";

export const chatUuid =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export type ChatMessage = {
  message_id: string;
  sequence: number;
  body: string;
  created_at: string;
  mine: boolean;
  author_id: string | null;
  author_label: string | null;
};

export async function chatAccess() {
  requireLocalHangouts();
  const result = await access();
  return result.user && result.state === "ready" ? result : null;
}

export async function readChat(
  client: SupabaseClient,
  id: string,
  after: number | null = null,
) {
  if (
    !chatUuid.test(id) ||
    (after !== null && (!Number.isSafeInteger(after) || after < 1))
  )
    return { kind: "invalid" as const, messages: [] as ChatMessage[] };
  const { data, error } = await client.rpc("read_hangout_messages", {
    p_hangout_id: id,
    p_after_sequence: after,
    p_limit: 50,
  });
  if (error)
    return {
      kind: error.code === "42501" ? ("denied" as const) : ("error" as const),
      messages: [] as ChatMessage[],
    };
  return { kind: "ok" as const, messages: (data ?? []) as ChatMessage[] };
}
