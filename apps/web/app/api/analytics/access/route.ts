import { NextResponse } from "next/server";
import { access } from "../../../../lib/access";
import { localAnalyticsConfig } from "../../../../lib/analytics-core";

export const dynamic = "force-dynamic";
const headers = { "cache-control": "no-store, max-age=0" };

export async function GET() {
  const config = localAnalyticsConfig(
    process.env.APP_ENV,
    process.env.ANALYTICS_LOCAL_SINK_URL,
    process.env.ANALYTICS_LOCAL_PROJECT_TOKEN,
  );
  if (!config) return NextResponse.json({ kind: "off" }, { headers });
  try {
    const result = await access();
    if (!result.user || !["onboarding", "ready"].includes(result.state))
      return NextResponse.json({ kind: "denied" }, { status: 403, headers });
    return NextResponse.json(
      { kind: "ok", actor: result.user.id, ...config },
      { headers },
    );
  } catch {
    return NextResponse.json({ kind: "error" }, { status: 503, headers });
  }
}
