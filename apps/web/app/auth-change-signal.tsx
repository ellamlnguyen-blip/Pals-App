"use client";
import { signOut } from "./actions";
import { beginAuthTransition } from "./auth-transition";

export function SignOutForm() {
  return (
    <form action={signOut} onSubmit={() => beginAuthTransition("signout")}>
      <button className="text-button" type="submit">
        Sign out
      </button>
    </form>
  );
}
