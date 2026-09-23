import type { AuthTransitionMessage } from "../auth-transition";
export type SettledPhase = "settled" | "cancelled";
export function notificationTransitionState(
  pending: Set<string>,
  settled: Map<string, SettledPhase>,
  event: AuthTransitionMessage,
): "mask" | "verify" | "reauthorize" | "wait" {
  if (event.phase === "begin") {
    pending.add(event.token);
    return "mask";
  }
  if (event.phase === "settled" || event.phase === "cancelled") {
    if (!pending.has(event.token)) return "wait";
    settled.set(event.token, event.phase);
    return "verify";
  }
  return pending.size ? "wait" : "reauthorize";
}
export function notificationProbeState(
  pending: Set<string>,
  settled: Map<string, SettledPhase>,
  token: string,
  status: number,
  actorMatches: boolean,
): "wait" | "deny" | "read" | "retry" {
  if (!pending.has(token)) return "wait";
  if (status === 403) return "deny";
  if (status !== 200 || !actorMatches) return "wait";
  pending.delete(token);
  settled.delete(token);
  return pending.size ? "retry" : "read";
}
