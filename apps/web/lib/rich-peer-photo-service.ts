import "server-only";
import { createClient } from "@supabase/supabase-js";
import { authConfig } from "./config";
import { readBoundedPhotoStream } from "./rich-peer-photo-core";
import { privatePeerPhotoUrl } from "./rich-peer-photo-path";

export type ResolvedPeerPhoto = {
  object_id: string;
  object_path: string;
  photo_revision: number;
};

function serviceSettings() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key))
    throw new Error("Photo service unavailable");
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    );
    if (payload.role !== "service_role") throw new Error();
  } catch {
    throw new Error("Photo service unavailable");
  }
  return { url: authConfig().url, key };
}

export async function resolvePeerPhoto(
  actorId: string,
  subjectId: string,
  slot: string,
  revision: number,
  signal: AbortSignal,
): Promise<ResolvedPeerPhoto | null> {
  const { url, key } = serviceSettings();
  const service = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await service
    .rpc("resolve_rich_peer_photo_for_gateway", {
      actor_id: actorId,
      subject_id: subjectId,
      slot,
      expected_revision: revision,
    })
    .abortSignal(signal);
  if (error) throw new Error("Photo resolution unavailable");
  if (!Array.isArray(data) || data.length !== 1) return null;
  const item = data[0] as Partial<ResolvedPeerPhoto>;
  if (
    typeof item.object_id !== "string" ||
    typeof item.object_path !== "string" ||
    item.photo_revision !== revision ||
    !privatePeerPhotoUrl(url, subjectId, item.object_path)
  )
    return null;
  return item as ResolvedPeerPhoto;
}

export async function downloadPeerPhoto(
  subjectId: string,
  path: string,
  signal: AbortSignal,
): Promise<Uint8Array | null> {
  const { url, key } = serviceSettings();
  const objectUrl = privatePeerPhotoUrl(url, subjectId, path);
  if (!objectUrl) return null;
  const response = await fetch(objectUrl, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
    redirect: "manual",
    signal,
  });
  if (response.status === 404) return null;
  if (!response.ok || !response.body)
    throw new Error("Photo download unavailable");
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > 5 * 1024 * 1024)
    throw new Error("Photo input too large");
  return readBoundedPhotoStream(response.body);
}
