import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./lib/config";
import {
  isRichPeerPhotoPath,
  richPeerPhotoHeaders,
} from "./lib/rich-peer-photo-headers";

export async function proxy(request: NextRequest) {
  if (isRichPeerPhotoPath(request.nextUrl.pathname)) {
    // The route performs the sole cookie-backed getUser under its request deadline.
    const response = NextResponse.next();
    for (const [name, value] of Object.entries(richPeerPhotoHeaders))
      response.headers.set(name, value);
    response.headers.delete("ETag");
    response.headers.delete("Last-Modified");
    return response;
  }
  // Allow the setup screen when no credentials exist; protected routes still fail closed.
  if (!process.env.SUPABASE_PUBLISHABLE_KEY) return NextResponse.next();
  const config = authConfig();
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      secure: config.secure,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!api/health/?$|_next/static|_next/image|favicon.ico).*)"],
};
