"use client";

import { useEffect, useRef } from "react";
import { analytics } from "../lib/analytics";
import type { AnalyticsEvent } from "../lib/analytics-core";

/** Mount only beside a successfully rendered, authorized result. */
export function AnalyticsView({
  event,
  ready = true,
}: {
  event: AnalyticsEvent;
  ready?: boolean;
}) {
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current || !ready) return;
    recorded.current = true;
    void analytics.capture(event);
  }, [event, ready]);
  return null;
}
