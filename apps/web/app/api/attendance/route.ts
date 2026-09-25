import { NextRequest, NextResponse } from "next/server";
import {
  attendanceAccess,
  attendanceHeaders,
  attendanceId,
} from "../../../lib/attendance";

export const dynamic = "force-dynamic";
const reply = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: attendanceHeaders });

export async function POST(request: NextRequest) {
  const target = await attendanceAccess(
    request.headers.get("x-pals-attendance-actor"),
  );
  if (!target) return reply({ kind: "denied" }, 403);
  let input: Record<string, unknown>;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 512)
      return reply({ kind: "invalid" }, 400);
    const raw = await request.text();
    if (raw.length > 512) return reply({ kind: "invalid" }, 400);
    input = JSON.parse(raw);
  } catch {
    return reply({ kind: "invalid" }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return reply({ kind: "invalid" }, 400);
  const keys = Object.keys(input);
  const id = input.id;
  if (
    input.action === "list" &&
    keys.every((k) => ["action", "id"].includes(k)) &&
    (id === null || (typeof id === "string" && attendanceId.test(id)))
  ) {
    const result = await target.client.rpc("list_own_attendance", {
      p_before_hangout_id: id,
    });
    return result.error
      ? reply({ kind: "denied" }, result.error.code === "42501" ? 403 : 503)
      : reply({ kind: "ok", actor: target.actor, rows: result.data ?? [] });
  }
  if (typeof id !== "string" || !attendanceId.test(id))
    return reply({ kind: "invalid" }, 400);
  if (input.action === "exact" && keys.length === 2) {
    const result = await target.client.rpc("get_own_attendance", {
      p_hangout_id: id,
    });
    return result.error
      ? reply({ kind: "denied" }, result.error.code === "42501" ? 403 : 503)
      : reply({
          kind: "ok",
          actor: target.actor,
          row: result.data?.[0] ?? null,
        });
  }
  if (
    input.action === "answer" &&
    keys.length === 4 &&
    typeof input.attended === "boolean" &&
    typeof input.revision === "number" &&
    Number.isSafeInteger(input.revision) &&
    input.revision >= 0
  ) {
    const result = await target.client.rpc("answer_own_attendance", {
      p_hangout_id: id,
      p_attended: input.attended,
      p_expected_revision: input.revision,
    });
    // The caller confirms a mutation through a fresh exact own-read, never this return value.
    return result.error
      ? reply({ kind: "uncertain" }, result.error.code === "42501" ? 409 : 503)
      : reply({ kind: "accepted", actor: target.actor });
  }
  return reply({ kind: "invalid" }, 400);
}
