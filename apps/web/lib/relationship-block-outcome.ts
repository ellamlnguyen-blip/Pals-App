// A fresh outbound-ID match is the only confirmed block result. Any other
// outcome locks the current control until a full reload rechecks access.
export function blockReviewOutcome(state: string): "confirmed" | "unknown" {
  return state === "hidden" ? "confirmed" : "unknown";
}
