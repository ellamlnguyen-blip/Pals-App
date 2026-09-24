import { NextRequest } from "next/server";
import { privateResponse, requestClient } from "../../../lib/server";

export async function GET(request: NextRequest) {
  const response = privateResponse({ signedIn: false });
  try {
    const client = requestClient(request, response);
    const { data } = await client.auth.getUser();
    let role: "admin" | "moderator" | null = null;
    if (data.user) {
      const [account, ownRole] = await Promise.all([
        client
          .from("accounts")
          .select("status")
          .eq("id", data.user.id)
          .maybeSingle(),
        client
          .from("platform_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .maybeSingle(),
      ]);
      if (
        account.data?.status === "active" &&
        (ownRole.data?.role === "admin" || ownRole.data?.role === "moderator")
      )
        role = ownRole.data.role;
    }
    const done = privateResponse({ signedIn: Boolean(data.user), role });
    response.cookies.getAll().forEach((c) => done.cookies.set(c));
    return done;
  } catch {
    return response;
  }
}

export async function POST(request: NextRequest) {
  const response = privateResponse({ ok: false }, 400);
  if (request.headers.get("origin") !== "http://127.0.0.1:3001")
    return response;
  try {
    const body = await request.json();
    if (body?.op === "out") {
      await requestClient(request, response).auth.signOut();
      const done = privateResponse({ ok: true });
      response.cookies.getAll().forEach((c) => done.cookies.set(c));
      return done;
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
    ).auth.signInWithPassword({ email: body.email, password: body.password });
    const done = privateResponse({ ok: !error }, error ? 403 : 200);
    response.cookies.getAll().forEach((c) => done.cookies.set(c));
    return done;
  } catch {
    return response;
  }
}
