import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "../../../lib/supabase";
import { authConfig } from "../../../lib/config";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  // Fixed trusted origin and destination; never follow user-supplied next/redirect URLs.
  const origin = authConfig().origin;
  if (code && code.length <= 2048) {
    const client = await supabase();
    const flowId = request.nextUrl.searchParams.get("sb_flow_id");
    const { error } = await client.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (!error)
      return NextResponse.redirect(`${origin}/continue?auth_callback=1`, {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
  }
  // Secure email change can return from its first confirmation link with only
  // an Auth message. The message is never treated as proof or shown to users:
  // current live Auth and the access gate must still show a pending address.
  if (
    !params.has("code") &&
    !params.has("error") &&
    !params.has("error_code") &&
    params.has("message")
  ) {
    const client = await supabase();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (
      !userError &&
      user?.email &&
      user.new_email &&
      user.new_email.toLowerCase() !== user.email.toLowerCase()
    ) {
      const { data: state, error: gateError } =
        await client.rpc("get_access_state");
      if (!gateError && state === "ready")
        return NextResponse.redirect(`${origin}/account`, {
          headers: {
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          },
        });
    }
  }
  return NextResponse.redirect(`${origin}/verify?error=link`, {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
