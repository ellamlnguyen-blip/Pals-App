import { NextRequest } from "next/server";
import { mayEnrollOperator } from "../../../lib/config";
import { factorMayChallenge } from "../../../lib/security";
import {
  exactOrigin,
  privateResponse,
  requestClient,
} from "../../../lib/server";

const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export async function POST(request: NextRequest) {
  const denied = () =>
    privateResponse({ error: "Authenticator unavailable." }, 403);
  if (!exactOrigin(request)) return denied();
  try {
    const input = await request.json();
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      !["enroll", "challenge", "verify"].includes(input.op)
    )
      return denied();
    const response = privateResponse({});
    const client = requestClient(request, response);
    const { data: user, error: authError } = await client.auth.getUser();
    if (authError || !user.user) return denied();
    const [account, ownRole] = await Promise.all([
      client
        .from("accounts")
        .select("status")
        .eq("id", user.user.id)
        .maybeSingle(),
      client
        .from("platform_roles")
        .select("role")
        .eq("user_id", user.user.id)
        .maybeSingle(),
    ]);
    if (
      account.data?.status !== "active" ||
      !["admin", "moderator"].includes(ownRole.data?.role ?? "")
    )
      return denied();
    const factors = await client.auth.mfa.listFactors();
    if (factors.error || !factors.data) return denied();
    const verified = factors.data.totp.some(
      (factor) => factor.status === "verified",
    );
    if (input.op === "enroll") {
      if (
        Object.keys(input).length !== 1 ||
        verified ||
        !mayEnrollOperator(user.user.id)
      )
        return denied();
      const result = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Pals moderation",
      });
      if (result.error || !result.data?.totp) return denied();
      const done = privateResponse({
        factorId: result.data.id,
        qrCode: result.data.totp.qr_code,
        manualKey: result.data.totp.secret,
      });
      response.cookies.getAll().forEach((cookie) => done.cookies.set(cookie));
      return done;
    }
    if (!uuid(input.factorId)) return denied();
    const selectedFactor = factors.data.all.find(
      (factor) => factor.id === input.factorId && factor.factor_type === "totp",
    );
    if (
      !selectedFactor ||
      !factorMayChallenge(
        selectedFactor.status,
        mayEnrollOperator(user.user.id),
      )
    )
      return denied();
    if (input.op === "challenge") {
      if (Object.keys(input).length !== 2) return denied();
      const result = await client.auth.mfa.challenge({
        factorId: input.factorId,
      });
      if (result.error || !result.data?.id) return denied();
      const done = privateResponse({ challengeId: result.data.id });
      response.cookies.getAll().forEach((cookie) => done.cookies.set(cookie));
      return done;
    }
    if (
      Object.keys(input).length !== 4 ||
      !uuid(input.challengeId) ||
      typeof input.code !== "string" ||
      !/^\d{6}$/.test(input.code)
    )
      return denied();
    const result = await client.auth.mfa.verify({
      factorId: input.factorId,
      challengeId: input.challengeId,
      code: input.code,
    });
    if (result.error) return denied();
    const done = privateResponse({ ok: true });
    response.cookies.getAll().forEach((cookie) => done.cookies.set(cookie));
    return done;
  } catch {
    return denied();
  }
}
