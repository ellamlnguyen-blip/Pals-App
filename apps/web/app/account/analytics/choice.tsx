"use client";

import { useSyncExternalStore } from "react";
import { analytics } from "../../../lib/analytics";

export function AnalyticsChoice({ eligible }: { eligible: boolean }) {
  const status = useSyncExternalStore(
    analytics.subscribe,
    analytics.getSnapshot,
    () => "off" as const,
  );
  const text = !eligible
    ? "Analytics is unavailable for this account. No events are sent."
    : status === "on"
      ? "Analytics is on in this tab."
      : status === "checking"
        ? "Checking your account before analytics can turn on."
        : status === "unavailable"
          ? "Analytics is unavailable here. No events are sent."
          : status === "error"
            ? "We could not check your account. No events are sent. You can turn off your choice here."
            : "Analytics is off.";
  return (
    <div className="analytics-choice">
      <p role="status" aria-live="polite">
        {text}
      </p>
      {status !== "off" ? (
        <button type="button" onClick={() => analytics.optOut()}>
          Turn off analytics
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void analytics.optIn()}
          disabled={!eligible}
        >
          Turn on analytics
        </button>
      )}
    </div>
  );
}
