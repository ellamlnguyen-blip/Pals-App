"use client";

import { useSyncExternalStore, useState } from "react";
import { analytics } from "../../../lib/analytics";

export function AnalyticsChoice({ eligible }: { eligible: boolean }) {
  const status = useSyncExternalStore(
    analytics.subscribe,
    analytics.getSnapshot,
    () => "off" as const,
  );
  const [busy, setBusy] = useState(false);
  const turnOn = async () => {
    setBusy(true);
    try {
      await analytics.optIn();
    } finally {
      setBusy(false);
    }
  };
  const text = !eligible
    ? "Analytics is unavailable for this account. No events are sent."
    : status === "on"
      ? "Analytics is on in this tab."
      : status === "checking" || busy
        ? "Checking your account before analytics can turn on."
        : status === "unavailable"
          ? "Analytics is unavailable here. No events are sent."
          : status === "error"
            ? "We could not check your account. Analytics is off. Try again later."
            : "Analytics is off.";
  return (
    <div className="analytics-choice">
      <p role="status" aria-live="polite">
        {text}
      </p>
      {eligible && status === "on" ? (
        <button type="button" onClick={() => analytics.optOut()}>
          Turn off analytics
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void turnOn()}
          disabled={
            !eligible ||
            busy ||
            status === "checking" ||
            status === "unavailable"
          }
        >
          Turn on analytics
        </button>
      )}
    </div>
  );
}
