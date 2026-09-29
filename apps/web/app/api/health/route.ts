import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Secret-free release probe for staging smoke tests. */
export function GET() {
  const origin = process.env.APP_ORIGIN ?? "";
  return NextResponse.json(
    {
      status: "ok",
      environment: process.env.APP_ENV ?? "local",
      checks: {
        supabase: Boolean(
          process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY,
        ),
        appOrigin: Boolean(origin),
        httpsOrigin: origin.startsWith("https://"),
        mapbox: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN),
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
