import { NextRequest } from "next/server";
import { ELLA_POLICY_OWNER_ID, parsePolicyIntent, policyOperatorAllowed } from "../../../lib/policy";
import { exactOrigin, privateResponse, requestClient } from "../../../lib/server";

const denial = () => privateResponse({ error: "Policy unavailable." }, 403);

export async function POST(request: NextRequest) {
  if (!exactOrigin(request)) return denial();
  let input;
  try { input = parsePolicyIntent(await request.json()); } catch { return denial(); }
  if (!input) return denial();
  const response = privateResponse({});
  try {
    const client = requestClient(request, response);
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || user.user?.id !== ELLA_POLICY_OWNER_ID) return denial();
    const [account, role, assurance, factors] = await Promise.all([
      client.from("accounts").select("status").eq("id", ELLA_POLICY_OWNER_ID).maybeSingle(),
      client.from("platform_roles").select("role").eq("user_id", ELLA_POLICY_OWNER_ID).maybeSingle(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
      client.auth.mfa.listFactors(),
    ]);
    if (
      account.error || role.error || assurance.error || factors.error ||
      !policyOperatorAllowed(user.user.id, account.data?.status, role.data?.role,
        assurance.data?.currentLevel,
        Boolean(factors.data?.totp.some((factor) => factor.status === "verified")))
    ) return denial();
    const result = await client.rpc("set_pilot_policy", {
      p_key: input.key,
      p_enabled: input.enabled,
      p_expected_revision: input.revision,
      p_reason: input.reason,
      p_request_id: input.requestId,
    });
    if (result.error || !Array.isArray(result.data) || result.data.length !== 1 ||
      result.data[0]?.enabled !== input.enabled ||
      !Number.isSafeInteger(result.data[0]?.revision)) return denial();
    const done = privateResponse({
      key: input.key,
      enabled: result.data[0].enabled,
      revision: result.data[0].revision,
      requestId: input.requestId,
    });
    response.cookies.getAll().forEach((cookie) => done.cookies.set(cookie));
    return done;
  } catch { return denial(); }
}
