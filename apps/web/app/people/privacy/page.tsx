import Link from "next/link";
import { redirect } from "next/navigation";
import { access, accessPath } from "../../../lib/access";
import { requireLocalPeople, peopleId } from "../../../lib/people";
import { Frame } from "../../components";
import { PrivacyControls, Unblock } from "./privacy-controls";
import "../../hangouts/map.css";
import "../people.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string | string[] }>;
}) {
  requireLocalPeople();
  const { client, user, state } = await access();
  if (!user || state === "signed_out" || state === "restricted")
    redirect(accessPath(state));
  const [
    { data: optedIn, error: preferenceError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    client.rpc("get_people_preference"),
    client
      .from("profiles")
      .select("real_name,graduation_year,major,bio,interests,down_to_do")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const after = (await searchParams).after;
  const availability =
    state === "ready"
      ? await client.rpc("browse_people", { p_limit: 1 })
      : null;
  const invalidAfter =
    after !== undefined && (typeof after !== "string" || !peopleId.test(after));
  const blocks =
    !invalidAfter && !preferenceError
      ? await client.rpc("list_people_blocked_ids", {
          p_after_id: typeof after === "string" ? after : null,
          p_limit: 24,
        })
      : null;
  const ids = (blocks?.data ?? []) as { account_id: string }[];
  return (
    <Frame signedIn>
      <div className="people-detail">
        <Link href={state === "ready" ? "/people" : accessPath(state)}>
          ← Back
        </Link>
        <section className="people-panel">
          <p className="badge">People privacy · local only</p>
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
                    <dd>Real name: {profile.real_name}</dd>
                    <dd>Campus: University of North Carolina at Chapel Hill</dd>
                    <dd>Graduation year: {profile.graduation_year}</dd>
                    <dd>Major: {profile.major}</dd>
                    <dt>Detail only</dt>
                    <dd>Bio: {profile.bio}</dd>
                    <dd>
                      Interests: {profile.interests?.join(", ") || "Not added"}
                    </dd>
                    <dd>
                      Down to do:{" "}
                      {profile.down_to_do?.join(", ") || "Not added"}
                    </dd>
                  </dl>
                  <p>
                    Future edits to these fields are also shared while your
                    choice is on and your account is ready. Photos, email, and
                    other profile fields stay private.
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
                  You can turn sharing off now. Turning it on requires a
                  complete, verified profile and local People access.
                </p>
              )}
            </>
          )}
        </section>
        <section className="people-panel">
          <h2>Blocked account IDs</h2>
          <p>
            These are outbound blocks you made. A confirmed block affects
            People, direct chat and Hangout access. Incoming blocks are never
            shown. This local tool shows IDs, not names, so copy the full ID and
            confirm it exactly before unblocking.
          </p>
          {invalidAfter ? (
            <p role="alert">
              That page link is invalid.{" "}
              <Link href="/people/privacy">Start over</Link>
            </p>
          ) : !blocks || blocks.error ? (
            <p role="status">
              Block management is unavailable while the local safety gate is off
              or your account access has changed. Your sharing choice above is
              still available.
            </p>
          ) : ids.length ? (
            <>
              <ul className="blocked-ids">
                {ids.map(({ account_id }) => (
                  <li key={account_id}>
                    <code>{account_id}</code>
                    <Unblock id={account_id} />
                  </li>
                ))}
              </ul>
              {ids.length === 24 && (
                <Link href={`/people/privacy?after=${ids[23].account_id}`}>
                  Next IDs
                </Link>
              )}
            </>
          ) : (
            <p>No outbound blocks on this page.</p>
          )}
        </section>
      </div>
    </Frame>
  );
}
