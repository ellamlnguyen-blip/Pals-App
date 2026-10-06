import { NextRequest } from "next/server";
import { mayEnrollOperator } from "../../../lib/config";
import {
  exactOrigin,
  privateResponse,
  requestClient,
} from "../../../lib/server";

function withCookies(
  response: ReturnType<typeof privateResponse>,
  source: ReturnType<typeof privateResponse>,
) {
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export async function GET(request: NextRequest) {
  const response = privateResponse({
    signedIn: false,
    role: null,
    mfa: "denied",
  });
  try {
    const client = requestClient(request, response);
    const { data: user, error } = await client.auth.getUser();
    if (error || !user.user) return response;
    const [account, ownRole, factors, assurance] = await Promise.all([
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
      client.auth.mfa.listFactors(),
      client.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    const role =
      account.data?.status === "active" &&
      (ownRole.data?.role === "admin" || ownRole.data?.role === "moderator")
        ? ownRole.data.role
        : null;
    const verifiedFactor = factors.data?.totp?.find(
      (factor) => factor.status === "verified",
    );
    const verified = Boolean(verifiedFactor);
    const mfa =
      !role || factors.error || assurance.error
        ? "denied"
        : assurance.data?.currentLevel === "aal2" && verified
          ? "ready"
          : verified
            ? "challenge"
            : mayEnrollOperator(user.user.id)
              ? "enroll"
              : "denied";
    return withCookies(
      privateResponse({
        signedIn: true,
        role,
        mfa,
        factorId: mfa === "challenge" ? verifiedFactor?.id : null,
      }),
      response,
    );
  } catch {
    return response;
  }
}

export async function POST(request: NextRequest) {
  const response = privateResponse({ ok: false }, 400);
  if (!exactOrigin(request)) return response;
  try {
    const body = await request.json();
    if (body?.op === "out") {
      const { error } = await requestClient(request, response).auth.signOut();
      if (error) return privateResponse({ ok: false }, 503);
      return withCookies(privateResponse({ ok: true }), response);
    }
    if (
      body?.op !== "in" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      body.email.length > 320 ||
      body.password.length > 1024
    )
      return response;
    const { error } = await requestClient(
      request,
      response,
    ).auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    return withCookies(
      privateResponse({ ok: !error }, error ? 403 : 200),
      response,
    );
  } catch {
    return response;
  }
}
