export const POLICY_KEYS = [
  "availability",
  "onboarding",
  "hangouts",
  "hangout_chat",
  "calendar",
  "people",
  "friendship",
  "dm",
  "notifications",
  "attendance",
  "optional_profile",
  "extra_photos",
] as const;

export type PolicyKey = (typeof POLICY_KEYS)[number];
export type PolicyIntent = {
  key: PolicyKey;
  enabled: boolean;
  revision: number;
  reason: string;
  requestId: string;
  confirmTarget: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ELLA_POLICY_OWNER_ID = "8ebd74bb-2a72-4689-9580-72268106d91b";

export function policyOperatorAllowed(
  userId: string | undefined,
  accountStatus: string | undefined,
  aal: string | null | undefined,
  verifiedTotp: boolean,
) {
  return userId === ELLA_POLICY_OWNER_ID && accountStatus === "active" &&
    aal === "aal2" && verifiedTotp;
}

export function policyRpcStatus(error: { code?: string } | null, validReceipt: boolean) {
  if (error?.code === "42501") return 403;
  return error || !validReceipt ? 503 : 200;
}

export function policyAuthStatus(error: { status?: number } | null, userId: string | undefined) {
  if (error) return [400, 401, 403].includes(error.status ?? 0) ? 403 : 503;
  return userId === ELLA_POLICY_OWNER_ID ? 200 : 403;
}

export function policyTarget(key: string, enabled: boolean) {
  return `${key}:${enabled ? "on" : "off"}`;
}

export function parsePolicyIntent(value: unknown): PolicyIntent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).length !== 6 ||
    !["key", "enabled", "revision", "reason", "requestId", "confirmTarget"].every((k) => k in v) ||
    !POLICY_KEYS.includes(v.key as PolicyKey) ||
    typeof v.enabled !== "boolean" ||
    typeof v.revision !== "number" ||
    !Number.isSafeInteger(v.revision) ||
    v.revision < 1 ||
    typeof v.reason !== "string" ||
    v.reason !== v.reason.trim() ||
    [...v.reason].length < 1 ||
    [...v.reason].length > 2000 ||
    typeof v.requestId !== "string" ||
    !uuid.test(v.requestId) ||
    v.confirmTarget !== policyTarget(v.key as string, v.enabled)
  ) return null;
  return v as PolicyIntent;
}
