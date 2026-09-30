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
          Pals is preparing its UNC pilot. Access is limited while the pilot is
          being set up, so hangouts and other student features aren’t available
          for this account yet.
        </Intro>
      </section>
    </Frame>
  );
}
