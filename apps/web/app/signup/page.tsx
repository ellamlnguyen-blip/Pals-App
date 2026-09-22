import Link from "next/link";
import { Frame, Intro } from "../components";
import { AuthForm } from "../forms";
export default function SignUp() {
  return (
    <Frame>
      <div className="auth-layout">
        <Intro title="More plans. More pals.">
          Your next Hangout starts here. Join with your UNC email.
        </Intro>
        <section className="form-panel" aria-label="Create your account">
          <h2>Join Pals</h2>
          <AuthForm mode="signup" />
          <p className="help" id="domains">
            Use live.unc.edu, unc.edu, ad.unc.edu, business.unc.edu or
            kenan-flagler.unc.edu. We’ll send a link to confirm it’s yours.
          </p>
          <p>
            Already have an account? <Link href="/signin">Sign in</Link>
          </p>
        </section>
      </div>
    </Frame>
  );
}
