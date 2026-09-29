import { validateSupabaseTarget } from "@pals/config";
import { NextResponse } from "next/server";
import { authConfig } from "../../../lib/config";

export const dynamic = "force-dynamic";

/** Secret-free configuration readiness probe for hosted smoke tests. */
export function GET() {
  const environment = process.env.APP_ENV;
  const hostedEnvironment =
    environment === "staging" || environment === "production";
  let supabaseTarget = false;
  if (environment === "staging" || environment === "production") {
    try {
      validateSupabaseTarget(
        environment,
        process.env.SUPABASE_URL ?? "",
        process.env.SUPABASE_PROJECT_REF,
      );
      supabaseTarget = true;
    } catch {
      // The response contains only the failed check, never the configured URL.
    }
  }

  let appOrigin = false;
  try {
    const origin = new URL(process.env.APP_ORIGIN ?? "");
    appOrigin =
      origin.protocol === "https:" &&
      !origin.username &&
      !origin.password &&
      origin.pathname === "/" &&
      !origin.search &&
      !origin.hash;
  } catch {
    // A missing or malformed origin is not ready.
  }

  let authConfiguration = false;
  if (hostedEnvironment) {
    try {
      authConfig();
      authConfiguration = true;
    } catch {
      // The app's own auth validation also checks the public key format.
    }
  }

  const checks = {
    hostedEnvironment,
    supabaseTarget,
    publishableKeyPresent: Boolean(
      process.env.SUPABASE_PUBLISHABLE_KEY?.trim(),
    ),
    appOrigin,
    mapboxPublicTokenPresent: Boolean(
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.startsWith("pk."),
    ),
    authConfiguration,
  };
  const ready = Object.values(checks).every(Boolean);
  return NextResponse.json(
    {
      status: ready ? "ok" : "not_ready",
      checks,
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
