import { NextRequest, NextResponse } from "next/server";
import { access } from "../../../lib/access";
import { dmErrorKind, dmHeaders, type DmInboxRow } from "../../../lib/dm";
import { localPeopleAvailable } from "../../../lib/people";
import { primaryCardPhotoRevision } from "../../../lib/people-card-photos";
import { pinCue } from "../../hangouts/saved/pin-cue";
import type { CombinedRow } from "../../chats/combined-types";
import {
  advanceCombinedCursor,
  parseCombinedCursor,
} from "../../chats/combined-paging";

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
  const cursor = parseCombinedCursor(
    request.nextUrl.searchParams.get("cursor"),
  );
  if (!cursor) return reply({ kind: "invalid" }, 400);
  const client = target.client;
  const dmResult = cursor.dmDone
    ? { data: [] as DmInboxRow[], error: null }
    : await client.rpc("list_dm_inbox", {
        p_after_created_at: cursor.dmTime,
        p_after_generation_id: cursor.dmGeneration,
        p_limit: 24,
      });
  const dmUnavailable = dmResult.error?.code === "42501";
  if (dmResult.error && !dmUnavailable) {
    const kind = dmErrorKind(dmResult.error.code);
    return reply({ kind, source: "direct chats" }, 503);
  }
  let hangoutQuery = client
    .from("hangout_participants")
    .select(
      "hangout_id,hangouts!inner(id,title,description,starts_at,status,visibility)",
    )
    .eq("account_id", actor)
    .eq("hangouts.status", "published")
    .eq("hangouts.visibility", "campus")
    .order("hangout_id", { ascending: true })
    .limit(24);
  if (cursor.hangoutId)
    hangoutQuery = hangoutQuery.gt("hangout_id", cursor.hangoutId);
  const hangoutResult = cursor.hangoutDone
    ? { data: [], error: null }
    : await hangoutQuery;
  if (hangoutResult.error)
    return reply({ kind: "error", source: "Hangout chats" }, 503);
  const dms = (dmUnavailable ? [] : (dmResult.data ?? [])) as DmInboxRow[];
  const hangouts = hangoutResult.data ?? [];
  const rows: CombinedRow[] = [];
  // Bounded enrichment; neither detail RPC may create a new chat or expose a peer ID as a label.
  for (let offset = 0; offset < dms.length; offset += 4) {
    const batch = await Promise.all(
      dms.slice(offset, offset + 4).map(async (dm) => {
        const detail = await client.rpc("get_people_detail", {
          p_account_id: dm.peer_id,
        });
        const name = detail.error
          ? null
          : (detail.data?.[0]?.real_name ?? null);
        let photoRevision: number | null = null;
        if (name) {
          const rich = await client.rpc("get_rich_people_detail", {
            p_account_id: dm.peer_id,
          });
          if (!rich.error)
            photoRevision = primaryCardPhotoRevision(
              dm.peer_id,
              rich.data?.[0],
            );
        }
        return { kind: "dm" as const, dm, name, photoRevision };
      }),
    );
    rows.push(...batch);
  }
  for (let offset = 0; offset < hangouts.length; offset += 4) {
    const batch = await Promise.all(
      hangouts.slice(offset, offset + 4).map(async (row) => {
        // The existing chat RPC is the membership gate. Request one row only;
        // message bodies are never used for inbox labels or returned here.
        const gate = await client.rpc("read_hangout_messages", {
          p_hangout_id: row.hangout_id,
          p_after_sequence: null,
          p_limit: 1,
        });
        if (gate.error)
          return {
            gate: gate.error.code === "42501" ? "denied" : "error",
            row: null,
          };
        const detail = Array.isArray(row.hangouts)
          ? row.hangouts[0]
          : row.hangouts;
        if (!detail) return { gate: "error", row: null };
        return {
          gate: "ok",
          row: {
            kind: "hangout" as const,
            id: row.hangout_id,
            title: detail.title,
            emoji: pinCue({
              title: detail.title,
              description: detail.description,
            }),
            startsAt: detail.starts_at,
          },
        };
      }),
    );
    if (batch.some((item) => item.gate === "error" || item.gate === "invalid"))
      return reply({ kind: "error", source: "Hangout chats" }, 503);
    for (const item of batch) if (item.row) rows.push(item.row);
  }
  // Each source advances only through rows fetched on this page, including concealed denials.
  const next = advanceCombinedCursor(
    { ...cursor, dmDone: cursor.dmDone || dmUnavailable },
    dms,
    hangouts,
  );
  // Distinguish an independent DM gate closure from account revocation before returning rows.
  let current;
  try {
    current = await access();
  } catch {
    return reply({ kind: "denied" }, 403);
  }
  if (current.user?.id !== actor || current.state !== "ready")
    return reply({ kind: "denied" }, 403);
  return reply({ kind: "ok", rows, next, dmUnavailable });
}
