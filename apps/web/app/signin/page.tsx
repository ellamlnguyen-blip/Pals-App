import Link from "next/link";
import { Frame, Intro } from "../components";
import { AuthForm } from "../forms";
export default function SignIn() {
  return (
    <Frame>
      <div className="auth-layout">
        <Intro title="Hey, welcome back.">
          A little less scrolling. A little more showing up.
        </Intro>
        <section className="form-panel" aria-label="Sign in">
          <h2>Sign in to Pals</h2>
          <AuthForm mode="signin" />
          <p>
            <Link href="/verify">Need a confirmation link?</Link>
          </p>
          <p>
            New here? <Link href="/signup">Join Pals</Link>
          </p>
        </section>
      </div>
    </Frame>
  );
}
