import { access } from "../../../lib/access";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
};
export async function GET(request: Request) {
  try {
    const { client, state, user } = await access();
    if (state !== "ready" || !user)
      return new Response(null, { status: 403, headers });
    const slot = new URL(request.url).searchParams.get("slot") ?? "primary";
    if (slot !== "primary" && !/^[0-3]$/.test(slot))
      return new Response(null, { status: 400, headers });
    const { data: profile } = await client
      .from("profiles")
      .select("primary_photo_path,additional_photo_paths")
      .eq("user_id", user.id)
      .single();
    const path =
      slot === "primary"
        ? profile?.primary_photo_path
        : profile?.additional_photo_paths[Number(slot)];
    if (!path) return new Response(null, { status: 404, headers });
    const { data, error } = await client.storage
      .from("profile-photos")
      .download(path);
    if (error || !data) return new Response(null, { status: 404, headers });
    return new Response(data, {
      headers: { ...headers, "Content-Type": data.type },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
