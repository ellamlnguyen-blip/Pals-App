import type { ChatMessage } from "../../../../lib/chat";

export type ReadResult =
  | { kind: "ok"; messages: ChatMessage[] }
  | { kind: "denied" | "error" | "invalid" };

export async function fetchVisiblePage(
  api: string,
  actor: string,
  after: number | null,
  fetcher: typeof fetch = fetch,
): Promise<{ status: number; data: ReadResult }> {
  const response = await fetcher(`${api}${after ? `?after=${after}` : ""}`, {
    cache: "no-store",
    credentials: "same-origin",
    headers: { "x-pals-chat-actor": actor },
  });
  const data = (await response.json()) as ReadResult;
  return {
    status: response.status,
    data:
      data.kind === "ok"
        ? { kind: "ok", messages: data.messages.slice(0, 50) }
        : data,
  };
}

export function nextPageCursors(
  cursors: (number | null)[],
  index: number,
  after: number,
) {
  return [...cursors.slice(0, index + 1), after];
}
