import { NextRequest, NextResponse } from "next/server";
import { requestClient } from "./lib/server";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  if (process.env.SUPABASE_PUBLISHABLE_KEY) {
    try {
      await requestClient(request, response).auth.getUser();
    } catch {
      /* fail closed in routes */
    }
  }
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
