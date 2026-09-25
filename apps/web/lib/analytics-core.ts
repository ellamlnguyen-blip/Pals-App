export const analyticsEvents = [
  "onboarding_completed",
  "hangout_map_viewed",
  "hangout_detail_viewed",
  "hangout_created",
  "hangout_joined",
  "hangout_left",
  "hangout_cancelled",
  "calendar_viewed",
  "people_profile_viewed",
  "friend_request_sent",
  "friend_request_accepted",
  "dm_request_sent",
  "hangout_chat_message_sent",
  "notifications_viewed",
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];

/** Validate the raw string before URL normalization can hide alternate hosts or paths. */
export function localCaptureSink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match =
    /^http:\/\/(?:127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})\/capture\/$/.exec(
      value,
    );
  if (!match || Number(match[1]) > 65535) return null;
  return value;
}

export function localAnalyticsConfig(
  environment: unknown,
  sink: unknown,
  token: unknown,
): { sink: string; token: string } | null {
  const validatedSink = localCaptureSink(sink);
  if (
    environment !== "local" ||
    !validatedSink ||
    typeof token !== "string" ||
    !/^local-test-[A-Za-z0-9_-]{8,64}$/.test(token)
  )
    return null;
  return { sink: validatedSink, token };
}

export function validAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return (
    typeof value === "string" &&
    (analyticsEvents as readonly string[]).includes(value)
  );
}

export function validCaptureArguments(
  args: IArguments | unknown[],
): args is [AnalyticsEvent] {
  return args.length === 1 && validAnalyticsEvent(args[0]);
}

export type AccessReply =
  | { kind: "ok"; actor: string; sink: string; token: string }
  | { kind: "off" | "denied" | "error" };

export async function readAnalyticsAccess(
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<AccessReply> {
  try {
    const response = await fetcher("/api/analytics/access", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
      signal,
    });
    if (!response.ok)
      return { kind: response.status === 403 ? "denied" : "error" };
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return { kind: "error" };
    const row = data as Record<string, unknown>;
    if (row.kind === "off") return { kind: "off" };
    const config = localAnalyticsConfig("local", row.sink, row.token);
    if (
      row.kind !== "ok" ||
      typeof row.actor !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        row.actor,
      ) ||
      !config
    )
      return { kind: "error" };
    return { kind: "ok", actor: row.actor, ...config };
  } catch {
    return { kind: "error" };
  }
}
