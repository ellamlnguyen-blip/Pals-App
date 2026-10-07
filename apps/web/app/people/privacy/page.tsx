import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { RichProfilePreference } from "@pals/types";
import { access, accessPath } from "../../../lib/access";
import { requireLocalPeople } from "../../../lib/people";
import { Frame } from "../../components";
import { PrivacyControls } from "./privacy-controls";
import { RichPrivacyControls } from "./rich-privacy-controls";
import "../../hangouts/map.css";
import "../people.css";
import "./rich-privacy.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function PrivacyPage() {
  requireLocalPeople();
  const { client, user, state } = await access();
  if (!user || state === "signed_out" || state === "restricted")
    redirect(accessPath(state));
  const [
    { data: optedIn, error: preferenceError },
    { data: richRows, error: richPreferenceError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    client.rpc("get_people_preference"),
    client.rpc("get_my_rich_profile_preference"),
    client
      .from("profiles")
      .select(
        "real_name,graduation_year,major,bio,interests,down_to_do,hometown,primary_photo_path,additional_photo_paths,prompts,revision",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const richRow = richRows?.[0] as RichProfilePreference | undefined;
  const richPreference =
    !richPreferenceError &&
    typeof richRow?.opted_in === "boolean" &&
    Number.isSafeInteger(richRow.revision) &&
    richRow.revision >= 0
      ? richRow
      : null;
  const availability =
    state === "ready"
      ? await client.rpc("browse_people", { p_limit: 1 })
      : null;
  return (
    <Frame signedIn navigation={state === "ready"}>
      <div className="people-detail">
        <Link href={state === "ready" ? "/people" : accessPath(state)}>
          ← Back
        </Link>
        <section className="people-panel">
          <p className="badge">People privacy</p>
          <h1>Your People visibility</h1>
          <p>
            Browsing People does not require sharing your profile. Your choice
            starts off.
          </p>
          {preferenceError ? (
            <p role="alert">
              Privacy settings are unavailable for this account. Check your
              connection or account access and reload.
            </p>
          ) : (
            <>
              {profileError || !profile ? (
                <p role="alert">
                  Your preview could not load. You can still turn sharing off;
                  reload before turning it on.
                </p>
              ) : (
                <div className="people-preview">
                  <h2>What other eligible students would see</h2>
                  <dl>
                    <dt>Card and detail</dt>
                    <dd>Real name: {profile.real_name || "Not added"}</dd>
                    <dd>Campus: University of North Carolina at Chapel Hill</dd>
                    <dd>
                      Graduation year: {profile.graduation_year ?? "Not added"}
                    </dd>
                    <dd>Major: {profile.major || "Not added"}</dd>
                    <dt>Detail only</dt>
                    <dd>Bio: {profile.bio || "Not added"}</dd>
                    <dd>
                      Interests: {profile.interests?.join(", ") || "Not added"}
                    </dd>
                    <dd>
                      Down to do:{" "}
                      {profile.down_to_do?.join(", ") || "Not added"}
                    </dd>
                  </dl>
                  <p>
                    Opting in does not make an incomplete profile visible.
                    People can see your profile only after your real name,
                    graduation year, major, and bio are usable, while your
                    choice remains on and your account is ready. Future edits to
                    these fields are shared under the same rule. Photos,
                    hometown and prompts require the separate rich choice below.
                    Your email address and remaining fields stay private.
                  </p>
                </div>
              )}
              {availability?.error && (
                <p role="status">
                  People discovery is unavailable right now. Your stored choice
                  remains available to turn off.
                </p>
              )}
              <PrivacyControls
                initial={!!optedIn}
                ready={
                  state === "ready" &&
                  !!profile &&
                  !profileError &&
                  !availability?.error
                }
              />
              {state !== "ready" && (
                <p className="help">
                  You can turn sharing off now. Turning it on requires current
                  account access; your profile remains hidden until your real
                  name, graduation year, major, and bio are usable.
                </p>
              )}
            </>
          )}
        </section>
        <section className="people-panel">
          <p className="badge">Separate choice · starts off</p>
          <h2>Share more of your profile</h2>
          <p>
            Choose whether to share your selected photos, self-declared hometown
            and conversation prompts with people who have confirmed approved UNC
            email addresses at your campus. Your actual email address is never
            shown. This choice starts off for everyone, including people already
            sharing text in People.
          </p>
          {profileError || !profile ? (
            <p role="alert">
              Your rich profile preview could not load. You can still turn rich
              sharing off; reload before turning it on.
            </p>
          ) : (
            <div className="people-preview">
              <h3>Preview of your current shared details</h3>
              <p>
                Eligible students would see the text in the People preview
                above, plus these details when both sharing choices are on:
              </p>
              <dl>
                <dt>Hometown</dt>
                <dd>
                  {profile.hometown ? `From ${profile.hometown}` : "Not added"}
                </dd>
                <dt>Conversation prompts</dt>
                <dd>
                  {profile.prompts?.length ? (
                    <ul>
                      {profile.prompts.map(
                        (
                          prompt: { question: string; answer: string },
                          index: number,
                        ) => (
                          <li key={index}>
                            <strong>{prompt.question}</strong> — {prompt.answer}
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    "Not added"
                  )}
                </dd>
                <dt>Selected photos</dt>
                <dd>
                  {profile.primary_photo_path ||
                  profile.additional_photo_paths?.length ? (
                    <ul className="rich-privacy-photos">
                      {profile.primary_photo_path && (
                        <li>
                          <Image
                            src={`/profile/photo?slot=primary&v=${profile.revision}`}
                            alt="Your selected primary photo"
                            width={210}
                            height={140}
                            unoptimized
                          />
                          <span>Primary photo</span>
                        </li>
                      )}
                      {profile.additional_photo_paths?.map(
                        (_: string, index: number) => (
                          <li key={index}>
                            <Image
                              src={`/profile/photo?slot=${index}&v=${profile.revision}`}
                              alt={`Your selected extra photo ${index + 1}`}
                              width={210}
                              height={140}
                              unoptimized
                            />
                            <span>Extra photo {index + 1}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    "Not added"
                  )}
                </dd>
              </dl>
            </div>
          )}
          <p>
            While rich sharing is on, future edits to these details and
            replacements in the selected photo slots are shared too. Turning it
            off stops new requests, but photos or details someone already saved
            or captured cannot be recalled. Turning People sharing off also
            turns this choice off. Turning People sharing on later will not
            restore rich sharing.
          </p>
          {richPreference ? (
            <RichPrivacyControls
              key={`${richPreference.opted_in}:${richPreference.revision}`}
              initial={richPreference}
              canOptIn={
                state === "ready" &&
                optedIn === true &&
                !preferenceError &&
                !!profile &&
                !profileError &&
                !!profile.real_name &&
                !!profile.graduation_year &&
                !!profile.major &&
                !!profile.bio &&
                !availability?.error
              }
            />
          ) : (
            <p role="alert">
              Your rich sharing choice could not be checked. Reload before
              changing it.
            </p>
          )}
          {richPreference &&
            !richPreference.opted_in &&
            (state !== "ready" ||
              optedIn !== true ||
              profileError ||
              !profile ||
              availability?.error) && (
              <p className="help">
                Turning this on needs current People access, your People sharing
                choice and a loaded preview. Turning it off stays available to
                active accounts if those conditions later change.
              </p>
            )}
        </section>
        <section className="people-panel">
          <h2>Blocked account IDs</h2>
          <p>Manage outbound blocks and retained Hangout reports in Safety.</p>
          <Link href="/safety">Open Safety</Link>
        </section>
      </div>
    </Frame>
  );
}
