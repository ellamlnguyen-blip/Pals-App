import Image from "next/image";
import { requireAccess } from "../../lib/access";
import { Frame, Intro } from "../components";
export default async function Hangouts() {
  const { client, user } = await requireAccess("ready");
  const { data: profile } = await client
    .from("profiles")
    .select("real_name")
    .eq("user_id", user!.id)
    .single();
  return (
    <Frame signedIn>
      <section className="welcome">
        <Image
          className="profile-photo"
          src="/profile/photo"
          alt="Your profile photo"
          width={88}
          height={88}
          unoptimized
        />
        <p className="badge">UNC email verified</p>
        <Intro title={`You’re in, ${profile?.real_name ?? "pal"}.`}>
          Your profile is ready. Hangouts at UNC are coming next.
        </Intro>
      </section>
      <p className="notice">
        Email verification confirms access to an approved UNC email. It does not
        independently verify current enrollment.
      </p>
    </Frame>
  );
}
