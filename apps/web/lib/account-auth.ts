import "server-only";
import { createClient } from "@supabase/supabase-js";
import { authConfig } from "./config";
import { access } from "./access";

// Password proof uses an isolated, memory-only Auth client. It never replaces
// the signed-in cookie session, and the proof is bound to that exact actor.
export async function verifyAccountPassword(
  actorId: string,
  email: string,
  password: string,
) {
  const { url, key } = authConfig();
  const isolated = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  try {
    const { data, error } = await isolated.auth.signInWithPassword({
      email,
      password,
    });
    if (error || data.user?.id !== actorId) return false;
    const live = await access();
    return (
      live.user?.id === actorId &&
      live.state === "ready" &&
      live.user.email?.toLowerCase() === email.toLowerCase()
    );
  } finally {
    await isolated.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}
