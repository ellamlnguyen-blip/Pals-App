import {
  authVerificationDecision,
  type AuthTransitionMessage,
} from "../auth-transition.ts";

type SettledMessage = Extract<AuthTransitionMessage, { token: string }>;

export function createDmAuthVerifier({
  pending,
  settled,
  revision,
  active,
  probe,
  deny,
  reauthorize,
}: {
  pending: Set<string>;
  settled: Map<string, "settled" | "cancelled">;
  revision: () => number;
  active: (startedAt: number) => boolean;
  probe: () => Promise<number>;
  deny: () => void;
  reauthorize: () => void;
}) {
  const verify = async (message: SettledMessage): Promise<void> => {
    if (!pending.has(message.token)) return;
    const startedAt = revision();
    if (!active(startedAt)) return;
    try {
      const status = await probe();
      if (!active(startedAt)) return;
      const decision = authVerificationDecision(pending, message, status);
      const cleared = !pending.has(message.token);
      if (cleared) settled.delete(message.token);
      if (decision === "deny") deny();
      else if (decision === "reauthorize") reauthorize();
      else if (cleared) {
        // A later transition can invalidate an earlier in-flight probe. Once
        // this token clears, retry settled tokens that are still pending.
        for (const [token, phase] of settled)
          if (pending.has(token)) void verify({ token, phase });
      }
    } catch {
      // An uncertain account probe must leave request text masked.
    }
  };
  return verify;
}
