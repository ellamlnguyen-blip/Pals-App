import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "../../../lib/supabase";
import { authConfig } from "../../../lib/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
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
  return NextResponse.redirect(`${origin}/verify?error=link`, {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
