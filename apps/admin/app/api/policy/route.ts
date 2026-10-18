import { NextRequest } from "next/server";
import {
  ELLA_POLICY_OWNER_ID,
  parsePolicyIntent,
  policyAuthStatus,
  policyOperatorAllowed,
  policyRpcStatus,
} from "../../../lib/policy";
import {
  exactOrigin,
  privateResponse,
  requestClient,
} from "../../../lib/server";

const denial = () => privateResponse({ error: "Policy unavailable." }, 403);
const uncertain = () =>
  privateResponse({ error: "Policy outcome unconfirmed." }, 503);

export async function POST(request: NextRequest) {
  if (!exactOrigin(request)) return denial();
  let input;
  try {
    input = parsePolicyIntent(await request.json());
  } catch {
    return denial();
  }
  if (!input) return denial();
  const response = privateResponse({});
  try {
    const client = requestClient(request, response);
    const { data: user, error: authError } = await client.auth.getUser();
    const authStatus = policyAuthStatus(authError, user.user?.id);
    if (authStatus === 403) return denial();
    if (authStatus !== 200) return uncertain();
    const [account, assurance, factors] = await Promise.all([
      client
        .from("accounts")
        .select("status")
        .eq("id", ELLA_POLICY_OWNER_ID)
        .maybeSingle(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
      client.auth.mfa.listFactors(),
    ]);
    if (account.error || assurance.error || factors.error) return uncertain();
    if (
      !policyOperatorAllowed(
        user.user?.id,
        account.data?.status,
        assurance.data?.currentLevel,
        Boolean(
          factors.data?.totp.some((factor) => factor.status === "verified"),
        ),
      )
    )
      return denial();
    const result = await client.rpc("set_pilot_policy", {
      p_key: input.key,
      p_enabled: input.enabled,
      p_expected_revision: input.revision,
      p_reason: input.reason,
      p_request_id: input.requestId,
    });
    const validReceipt =
      Array.isArray(result.data) &&
      result.data.length === 1 &&
      result.data[0]?.enabled === input.enabled &&
      Number.isSafeInteger(result.data[0]?.revision);
    const status = policyRpcStatus(result.error, validReceipt);
    if (status === 403) return denial();
    if (status !== 200) return uncertain();
    const done = privateResponse({
      key: input.key,
      enabled: result.data[0].enabled,
      revision: result.data[0].revision,
      requestId: input.requestId,
    });
    response.cookies.getAll().forEach((cookie) => done.cookies.set(cookie));
    return done;
  } catch {
    return uncertain();
  }
}
