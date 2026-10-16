import { NextRequest, NextResponse } from "next/server";
import { access } from "../../../lib/access";
import { dmHeaders } from "../../../lib/dm";
import { localPeopleAvailable } from "../../../lib/people";
import { primaryCardPhotoRevision } from "../../../lib/people-card-photos";
import type { CombinedRow } from "../../chats/combined-types";
import {
  parseAttentionPage,
  projectAttentionItem,
} from "../../chats/combined-projection";

export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: dmHeaders });

export async function GET(request: NextRequest) {
  const actor = request.headers.get("x-pals-chat-actor");
  let target;
  try {
    target = localPeopleAvailable() ? await access() : null;
  } catch {
    return reply({ kind: "denied" }, 403);
  }
  if (!target?.user || target.user.id !== actor || target.state !== "ready")
    return reply({ kind: "denied" }, 403);
  const cursor = request.nextUrl.searchParams.get("cursor");
  if (cursor !== null && (!cursor || cursor.length > 160))
    return reply({ kind: "invalid" }, 400);
  const client = target.client;
  const result = await client.rpc("list_my_chat_attention", {
    p_cursor: cursor,
    p_limit: 24,
  });
  if (result.error) {
    if (result.error.code === "42501")
      return reply({ kind: cursor ? "stale" : "denied" }, cursor ? 409 : 403);
    return reply({ kind: "error" }, 503);
  }
  const page = parseAttentionPage(result.data);
  if (!page) return reply({ kind: "error" }, 503);
  const rows: CombinedRow[] = [];
  for (const item of page.items) {
    if (item.source_kind === "hangout") {
      const row = projectAttentionItem(item, null, null);
      if (!row) return reply({ kind: "error" }, 503);
      rows.push(row);
      continue;
    }
    // The attention snapshot authorizes the source. Fresh detail is required
    // before displaying a peer label or photo, including on cursor pages.
    const detail = await client.rpc("get_people_detail", {
      p_account_id: item.peer_id,
    });
    if (detail.error) return reply({ kind: "error" }, 503);
    const peer = detail.data?.[0];
    if (peer?.account_id !== item.peer_id) return reply({ kind: "stale" }, 409);
    const rich = await client.rpc("get_rich_people_detail", {
      p_account_id: item.peer_id,
    });
    const revision = rich.error
      ? null
      : primaryCardPhotoRevision(item.peer_id!, rich.data?.[0]);
    const row = projectAttentionItem(item, peer, revision);
    if (!row) return reply({ kind: "error" }, 503);
    rows.push(row);
  }
  // A source can change between snapshot and enrichment. A fresh owner gate
  // prevents an account transition from releasing the assembled rows.
  let current;
  try {
    current = await access();
  } catch {
    return reply({ kind: "denied" }, 403);
  }
  if (current.user?.id !== actor || current.state !== "ready")
    return reply({ kind: "denied" }, 403);
  return reply({ kind: "ok", rows, next: page.next_cursor });
}
