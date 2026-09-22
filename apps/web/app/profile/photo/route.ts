import { access } from "../../../lib/access";

export async function GET() {
  const { client, state, user } = await access();
  if (state !== "ready" || !user)
    return new Response(null, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  const { data: profile } = await client
    .from("profiles")
    .select("primary_photo_path")
    .eq("user_id", user.id)
    .single();
  if (!profile) return new Response(null, { status: 404 });
  const { data, error } = await client.storage
    .from("profile-photos")
    .download(profile.primary_photo_path);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": data.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
