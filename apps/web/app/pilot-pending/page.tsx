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
          Pals is not open at UNC yet. When the launch opens, an active account
          with a confirmed email from an approved UNC domain can get started. No
          roster or completed profile is required.
        </Intro>
      </section>
    </Frame>
  );
}
