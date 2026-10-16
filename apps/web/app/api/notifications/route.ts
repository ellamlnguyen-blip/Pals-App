import { NextRequest, NextResponse } from "next/server";
import {
  categories,
  notificationAccess,
  notificationHeaders,
  notificationId,
} from "../../../lib/notifications";
export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: notificationHeaders });
const errorKind = (code?: string) => (code === "42501" ? "denied" : "error");
const actor = (request: NextRequest) =>
  notificationAccess(request.headers.get("x-pals-notification-actor"));
export async function GET(request: NextRequest) {
  const target = await actor(request);
  if (!target) return reply({ kind: "denied" }, 403);
  const q = request.nextUrl.searchParams;
  if (
    [...q.keys()].some(
      (key) =>
        !["probe", "summary", "time", "id"].includes(key) ||
        q.getAll(key).length !== 1,
    )
  )
    return reply({ kind: "invalid" }, 400);
  const probe = q.get("probe"),
    summary = q.get("summary"),
    time = q.get("time"),
    id = q.get("id");
  if (
    (probe !== null && (probe !== "1" || q.size !== 1)) ||
    (summary !== null && (summary !== "1" || q.size !== 1)) ||
    (time === null) !== (id === null) ||
    (id !== null && !notificationId.test(id)) ||
    (time !== null && (time.length > 80 || !Number.isFinite(Date.parse(time))))
  )
    return reply({ kind: "invalid" }, 400);
  if (summary) {
    const attention = await target.client.rpc("get_notification_attention");
    if (attention.error)
      return reply(
        { kind: errorKind(attention.error.code) },
        attention.error.code === "42501" ? 403 : 503,
      );
    const value = attention.data?.[0];
    if (typeof value?.unread !== "boolean" || typeof value.cutoff !== "string")
      return reply({ kind: "error" }, 503);
    return reply({ kind: "ok", actor: target.user.id, unread: value.unread });
  }
  const prefs = await target.client.rpc("get_notification_preferences");
  if (prefs.error)
    return reply(
      { kind: errorKind(prefs.error.code) },
      prefs.error.code === "42501" ? 403 : 503,
    );
  if (probe) return reply({ kind: "ok", actor: target.user.id });
  const attention = await target.client.rpc("get_notification_attention");
  if (attention.error)
    return reply(
      { kind: errorKind(attention.error.code) },
      attention.error.code === "42501" ? 403 : 503,
    );
  const cutoff = attention.data?.[0]?.cutoff;
  if (typeof cutoff !== "string" || !Number.isFinite(Date.parse(cutoff)))
    return reply({ kind: "error" }, 503);
  const result = await target.client.rpc("list_notifications", {
    p_after_created_at: time,
    p_after_id: id,
    p_limit: 24,
  });
  if (result.error)
    return reply(
      { kind: errorKind(result.error.code) },
      result.error.code === "42501" ? 403 : 503,
    );
  return reply({
    kind: "ok",
    actor: target.user.id,
    rows: result.data ?? [],
    preferences: prefs.data ?? [],
    cutoff,
  });
}
export async function POST(request: NextRequest) {
  const target = await actor(request);
  if (!target) return reply({ kind: "denied" }, 403);
  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return reply({ kind: "invalid" }, 400);
  if (
    input.action === "acknowledge" &&
    Object.keys(input).sort().join() === "action,cutoff" &&
    typeof input.cutoff === "string" &&
    input.cutoff.length <= 80 &&
    Number.isFinite(Date.parse(input.cutoff))
  ) {
    const result = await target.client.rpc(
      "acknowledge_notification_attention",
      {
        p_cutoff: input.cutoff,
      },
    );
    if (result.error)
      return reply(
        { kind: errorKind(result.error.code) },
        result.error.code === "42501" ? 403 : 503,
      );
    return reply(
      { kind: result.data === true ? "ok" : "error", actor: target.user.id },
      result.data === true ? 200 : 503,
    );
  }
  if (
    input.action === "read" &&
    Object.keys(input).sort().join() === "action,id" &&
    typeof input.id === "string" &&
    notificationId.test(input.id)
  ) {
    const result = await target.client.rpc("mark_notification_read", {
      p_notification_id: input.id,
    });
    if (result.error)
      return reply(
        { kind: errorKind(result.error.code) },
        result.error.code === "42501" ? 403 : 503,
      );
    return reply(
      { kind: result.data === true ? "ok" : "denied" },
      result.data === true ? 200 : 403,
    );
  }
  if (
    input.action === "preference" &&
    Object.keys(input).sort().join() === "action,category,enabled" &&
    typeof input.category === "string" &&
    categories.some((category) => category === input.category) &&
    typeof input.enabled === "boolean"
  ) {
    const result = await target.client.rpc("set_notification_preference", {
      p_category: input.category,
      p_enabled: input.enabled,
    });
    if (result.error)
      return reply(
        { kind: errorKind(result.error.code) },
        result.error.code === "42501" ? 403 : 503,
      );
    return reply(
      { kind: result.data === input.enabled ? "ok" : "error" },
      result.data === input.enabled ? 200 : 503,
    );
  }
  return reply({ kind: "invalid" }, 400);
}
