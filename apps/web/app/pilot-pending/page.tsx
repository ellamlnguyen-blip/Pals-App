import { redirect } from "next/navigation";
import { access, accessPath } from "../../lib/access";
import { Frame, Intro } from "../components";

export default async function PilotPending() {
  const { state } = await access();
  if (state !== "pilot_unavailable") redirect(accessPath(state));

  return (
    <Frame signedIn>
      <section className="welcome">
        <Intro title="Your email is confirmed.">
          Student access is temporarily unavailable. Pals is currently open to
          active UNC students with confirmed email, current campus verification,
          and a complete profile. Check your account status or try again later.
        </Intro>
      </section>
    </Frame>
  );
}
