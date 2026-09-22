import { redirect } from "next/navigation";
import { access, accessPath } from "../../lib/access";
import { Frame, Intro } from "../components";
export default async function Restricted() {
  const { state } = await access();
  if (state !== "restricted") redirect(accessPath(state));
  return (
    <Frame signedIn>
      <section className="welcome">
        <Intro title="Your account is restricted.">
          You can’t access Pals while this restriction is in place.
        </Intro>
      </section>
    </Frame>
  );
}
