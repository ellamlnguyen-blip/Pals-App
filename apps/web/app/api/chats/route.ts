import { NextRequest, NextResponse } from "next/server";
import { access } from "../../../lib/access";
import { dmHeaders } from "../../../lib/dm";
import { localPeopleAvailable } from "../../../lib/people";
import { primaryCardPhotoRevision } from "../../../lib/people-card-photos";
import type { CombinedRow } from "../../chats/combined-types";
import {
  projectAttentionItem,
  readCategoryPage,
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
  const category = request.nextUrl.searchParams.get("category");
  if (category !== null && category !== "hangout" && category !== "dm")
    return reply({ kind: "invalid" }, 400);
  if (cursor !== null && (!cursor || cursor.length > 160))
    return reply({ kind: "invalid" }, 400);
  const client = target.client;
  // The source cursor belongs to the combined authorized order. Advance only
  // across complete source pages; filtering before cursor advancement skips rows.
  let page;
  try {
    page = await readCategoryPage(cursor, category, async (sourceCursor) => {
      const result = await client.rpc("list_my_chat_attention", {
        p_cursor: sourceCursor,
        p_limit: 24,
      });
      if (result.error) throw result.error;
      return result.data;
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "42501"
    )
      return reply({ kind: cursor ? "stale" : "denied" }, cursor ? 409 : 403);
    return reply({ kind: "error" }, 503);
  }
  if (!page) return reply({ kind: "error" }, 503);
  const rows: CombinedRow[] = [];
  for (const item of page.items) {
    if (item.source_kind === "hangout") {
      const row = projectAttentionItem(item, null, null);
      if (!row) return reply({ kind: "error" }, 503);
      rows.push(row);
      continue;
    }
    // The attention snapshot authorizes the management row. People visibility
    // is separate: an opted-out peer keeps a generic row without name/photo.
    const detail = await client.rpc("get_people_detail", {
      p_account_id: item.peer_id,
    });
    if (detail.error && detail.error.code !== "42501")
      return reply({ kind: "error" }, 503);
    const peer = detail.error ? null : (detail.data?.[0] ?? null);
    if (peer && peer.account_id !== item.peer_id)
      return reply({ kind: "stale" }, 409);
    let revision: number | null = null;
    if (peer?.real_name?.trim()) {
      const rich = await client.rpc("get_rich_people_detail", {
        p_account_id: item.peer_id,
      });
      if (!rich.error)
        revision = primaryCardPhotoRevision(item.peer_id!, rich.data?.[0]);
    }
    const row = projectAttentionItem(item, peer, revision);
    if (!row) return reply({ kind: "error" }, 503);
    rows.push(row);
  }
  // Recheck every source after enrichment. The original snapshot authorizes
  // only its own statement; a source may be revoked while detail is fetched.
  for (const item of page.items) {
    if (item.source_kind === "hangout") {
      const gate = await client.rpc("read_hangout_messages", {
        p_hangout_id: item.source_id,
        p_after_sequence: null,
        p_limit: 1,
      });
      if (gate.error)
        return reply(
          { kind: gate.error.code === "42501" ? "stale" : "error" },
          gate.error.code === "42501" ? 409 : 503,
        );
    } else {
      const gate = await client.rpc("get_dm_consent_ui_state", {
        p_peer_id: item.peer_id,
      });
      if (gate.error)
        return reply(
          { kind: gate.error.code === "42501" ? "stale" : "error" },
          gate.error.code === "42501" ? 409 : 503,
        );
      const current = gate.data?.[0];
      if (
        current?.generation_id !== item.source_id ||
        current.state !== item.state ||
        current.direction !== item.direction
      )
        return reply({ kind: "stale" }, 409);
    }
  }
  // The final owner check prevents an account transition from releasing rows.
  let current;
  try {
    current = await access();
  } catch {
    return reply({ kind: "denied" }, 403);
  }
  if (current.user?.id !== actor || current.state !== "ready")
    return reply({ kind: "denied" }, 403);
  return reply({ kind: "ok", rows, next: page.next });
}
