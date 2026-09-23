"use client";
import { useEffect } from "react";
// Full document navigations avoid router-prefetched Calendar data. Browsers
// restoring a document from BFCache must fetch current membership again.
export function CalendarRefresh() {
  useEffect(() => {
    function refresh(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", refresh);
    return () => window.removeEventListener("pageshow", refresh);
  }, []);
  return null;
}
