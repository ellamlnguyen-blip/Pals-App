import { requireAccess } from "../../lib/access";
import Link from "next/link";
import { localPeopleAvailable } from "../../lib/people";
import { Frame, Intro } from "../components";
import { OnboardingForm } from "../forms";
export default async function Onboarding() {
  const { client, user } = await requireAccess("onboarding");
  const { data: profile, error } = await client
    .from("profiles")
    .select("real_name,major,bio,graduation_year")
    .eq("user_id", user!.id)
    .single();
  if (error || !profile)
    throw new Error("Your profile could not load. Please try again.");
  return (
    <Frame signedIn>
      <div className="auth-layout">
        <Intro title="A face. A name. You.">
          Help your future pals recognize you when you meet.
        </Intro>
        <section className="form-panel">
          <p className="badge">UNC email verified</p>
          <h2>Make yourself at home</h2>
          <p className="help">University of North Carolina at Chapel Hill</p>
          <p className="help">{user!.email}</p>
          <OnboardingForm profile={profile} />
          {localPeopleAvailable() && (
            <p>
              <Link href="/people/privacy">Manage People sharing</Link>
            </p>
          )}
        </section>
      </div>
    </Frame>
  );
}
