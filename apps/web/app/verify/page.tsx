import Link from "next/link";
import { Frame, Intro } from "../components";
import { ResendForm } from "../forms";
export default async function Verify({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <Frame>
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
          <p>
            <Link href="/signin">Back to sign in</Link>
          </p>
        </section>
      </div>
    </Frame>
  );
}
