"use client";

export type AuthTransitionMessage =
  { phase: "begin" | "settled"; token: string } | { phase: "revalidate" };

export const AUTH_TRANSITION_CHANNEL = "pals-auth-transition";
export const AUTH_TRANSITION_EVENT = "pals-auth-transition-local";
const pendingKey = "pals-auth-pending";

function publish(message: AuthTransitionMessage) {
  const channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
  channel.postMessage(message);
  channel.close();
  window.dispatchEvent(
    new CustomEvent(AUTH_TRANSITION_EVENT, { detail: message }),
  );
}

export function beginAuthTransition(intent: "signin" | "signout") {
  const token = crypto.randomUUID();
  sessionStorage.setItem(pendingKey, JSON.stringify({ token, intent }));
  publish({ phase: "begin", token });
}

export function settleAuthTransition(force = false) {
  const raw = sessionStorage.getItem(pendingKey);
  if (!raw) return false;
  let pending: { token: string; intent: "signin" | "signout" };
  try {
    pending = JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(pendingKey);
    return false;
  }
  const completed =
    new URLSearchParams(location.search).get("pals_auth_done") ===
    pending.intent;
  if (!force && !completed) return false;
  sessionStorage.removeItem(pendingKey);
  publish({ phase: "settled", token: pending.token });
  return true;
}

export function announceCompletedAuthCallback() {
  publish({ phase: "revalidate" });
}

export function authTransitionDecision(
  pending: Set<string>,
  message: AuthTransitionMessage,
): "mask" | "wait" | "reauthorize" {
  if (message.phase === "begin") {
    pending.add(message.token);
    return "mask";
  }
  if (message.phase === "settled") {
    if (!pending.delete(message.token)) return "wait";
  }
  return pending.size ? "wait" : "reauthorize";
}
