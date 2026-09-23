"use client";
import { useEffect } from "react";

export function FocusReturn({
  id,
  visibleIds,
}: {
  id: string | null;
  visibleIds: string[];
}) {
  useEffect(() => {
    const requested =
      id ?? new URLSearchParams(window.location.search).get("focus");
    if (
      !requested ||
      !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        requested,
      )
    )
      return;
    const focus = () => {
      const target = visibleIds.includes(requested)
        ? document.getElementById(`person-${requested}`)
        : null;
      const destination = target ?? document.getElementById("people-heading");
      destination?.focus();
      return !!destination;
    };
    const observer = new MutationObserver(() => {
      if (focus()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = requestAnimationFrame(focus);
    const settled = window.setTimeout(() => {
      focus();
      observer.disconnect();
    }, 1000);
    window.addEventListener("pageshow", focus);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settled);
      window.removeEventListener("pageshow", focus);
      observer.disconnect();
    };
  }, [id, visibleIds]);
  return null;
}
