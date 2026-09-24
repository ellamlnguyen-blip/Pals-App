import "server-only";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { authConfig } from "./config";

export function privateResponse(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function requestClient(request: NextRequest, response: NextResponse) {
  const { url, key } = authConfig();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        for (const { name, value, options } of values) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}
