import Link from "next/link";
import { localPeopleAvailable } from "../../lib/people";
import { Frame, Intro } from "../components";
import { ResendForm } from "../forms";
import { access } from "../../lib/access";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  let signedIn = false;
  try {
    const account = await access();
    signedIn =
      !!account.user && !["signed_out", "restricted"].includes(account.state);
  } catch {
    /* Keep the verification view neutral while Auth is unavailable. */
  }
  return (
    <Frame signedIn={signedIn}>
      <div className="auth-layout">
        <Intro title="Check your UNC inbox.">
          Confirm your email, then we’ll make your profile feel like you.
        </Intro>
        <section className="form-panel">
          <h2>One link, then you’re in</h2>
          {params.error && (
            <p role="alert" className="form-message error">
              That link couldn’t sign you in. It may have expired, been used, or
              opened in a different browser. Sign in if you already confirmed,
              or request a new link.
            </p>
          )}
          {params.sent && (
            <p className="form-message" role="status">
              Check your inbox for a confirmation email.
            </p>
          )}
          <p>
            Open the latest confirmation link in this same browser. Check spam
            if you don’t see it.
          </p>
          <ResendForm />
          <p>
            <Link href="/continue">I’ve confirmed my email</Link>
          </p>
          {localPeopleAvailable() && (
            <p>
              <Link href="/people/privacy">Manage People sharing</Link>
            </p>
          )}
          <p>
            <Link href="/signin">Back to sign in</Link>
          </p>
        </section>
      </div>
    </Frame>
  );
}
