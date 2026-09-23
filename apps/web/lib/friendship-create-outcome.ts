// Decide the empty-pair result after an authoritative read and fresh People recheck.
// A lost transport response may retry only the same request key while peer text is
// still authorized. Explicit RPC denial never leaves a request button enabled.
export function emptyCreateOutcome(
  write: "confirmed" | "denied" | "uncertain",
  peerVisible: boolean,
) {
  if (!peerVisible)
    return {
      state: "unavailable" as const,
      relationship: null,
      message:
        "This person is no longer available in People. Return to People before another action.",
    };
  if (write === "uncertain")
    return {
      state: "known" as const,
      relationship: null,
      message:
        "No current relationship is visible. This does not confirm whether the request was received. You can retry this same request key.",
    };
  return {
    state: "stale" as const,
    relationship: null,
    message:
      write === "denied"
        ? "The request was unavailable. Reload current People access before another action."
        : "No current relationship is visible. This does not confirm why it ended. Reload before another action.",
  };
}
