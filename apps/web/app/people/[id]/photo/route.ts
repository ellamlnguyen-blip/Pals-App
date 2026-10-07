import { supabase } from "../../../../lib/supabase";
import { localPeopleAvailable, peopleId } from "../../../../lib/people";
import {
  resolvePeerPhoto,
  downloadPeerPhoto,
} from "../../../../lib/rich-peer-photo-service";
import { sanitizePeerPhoto } from "../../../../lib/rich-peer-photo-image";
import { readRichPeerPhoto } from "../../../../lib/rich-peer-photo-core";
import { PhotoAdmission } from "../../../../lib/rich-peer-photo-admission";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 15;

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
};
const admission = new PhotoAdmission(2, 16);

function reply(status: number, bytes?: Uint8Array) {
  return new Response(bytes ? Buffer.from(bytes) : null, {
    status,
    headers: bytes ? { ...headers, "Content-Type": "image/webp" } : headers,
  });
}

function parameters(request: Request, subject: string) {
  if (!peopleId.test(subject)) return null;
  const query = new URL(request.url).searchParams;
  if (
    query.size !== 2 ||
    query.getAll("slot").length !== 1 ||
    query.getAll("revision").length !== 1
  )
    return null;
  const slot = query.get("slot");
  const rawRevision = query.get("revision");
  if (
    !slot ||
    !["primary", "0", "1", "2", "3"].includes(slot) ||
    !rawRevision ||
    !/^[1-9]\d{0,15}$/.test(rawRevision)
  )
    return null;
  const revision = Number(rawRevision);
  if (!Number.isSafeInteger(revision)) return null;
  return { slot, revision };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await context.params;
    const parsed = parameters(request, rawId);
    if (!parsed) return reply(400);
    if (!localPeopleAvailable()) return reply(404);
    const id = rawId.toLowerCase();
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(12_000),
    ]);
    return await admission.run(signal, async () => {
      const client = await supabase(signal);
      const {
        data: { user },
        error,
      } = await client.auth.getUser();
      if (error || !user) return reply(404);
      if (user.id === id) return reply(404);
      const bytes = await readRichPeerPhoto(
        user.id,
        id,
        parsed.slot,
        parsed.revision,
        signal,
        {
          resolve: resolvePeerPhoto,
          download: downloadPeerPhoto,
          sanitize: sanitizePeerPhoto,
        },
      );
      return bytes ? reply(200, bytes) : reply(404);
    });
  } catch {
    return reply(503);
  }
}

const methodUnavailable = async () => reply(405);
export const HEAD = methodUnavailable;
export const POST = methodUnavailable;
export const PUT = methodUnavailable;
export const PATCH = methodUnavailable;
export const DELETE = methodUnavailable;
export const OPTIONS = methodUnavailable;
