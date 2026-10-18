export type AttentionKind = "dm" | "hangout";

/** Only call after the forward page has committed to the visible thread. */
export async function recordThreadAttention(
  actor: string,
  kind: AttentionKind,
  sourceId: string,
  highestVisibleSequence: number | null,
  touch: boolean,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  for (const payload of [
    ...(touch ? [{ action: "touch" as const }] : []),
    ...(highestVisibleSequence !== null
      ? [{ action: "ack" as const, sequence: highestVisibleSequence }]
      : []),
  ]) {
    const response = await fetcher("/api/chats/attention", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "x-pals-chat-actor": actor,
      },
      body: JSON.stringify({ ...payload, kind, sourceId }),
    });
    if (!response.ok) return false;
  }
  return true;
}
