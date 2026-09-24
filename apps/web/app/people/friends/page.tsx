import Link from "next/link";
import { redirect } from "next/navigation";
import { access, accessPath } from "../../../lib/access";
import {
  peopleId,
  requireLocalPeople,
  type PeopleDetail,
} from "../../../lib/people";
import { Frame } from "../../components";
import { FriendRow } from "./friend-row";
import { KnownRelationshipBlock } from "./known-block";
import type { Friendship } from "../friend-actions";
import "../../hangouts/map.css";
import "../people.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function FriendshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string | string[] }>;
}) {
  requireLocalPeople();
  const { client, state, user } = await access();
  if (!user || state === "signed_out" || state === "restricted")
    redirect(accessPath(state));
  const { after } = await searchParams;
  const invalid =
    after !== undefined && (typeof after !== "string" || !peopleId.test(after));
  const listed = invalid
    ? null
    : await client.rpc("list_friendships", {
        p_after_peer_id: after || null,
        p_limit: 24,
      });
  const rows = (listed?.data ?? []) as Friendship[];
  const details = await Promise.all(
    rows.map(async (row) => {
      if (state !== "ready") return null;
      try {
        const { data, error } = await client.rpc("get_people_detail", {
          p_account_id: row.peer_id,
        });
        return error ? null : ((data?.[0] ?? null) as PeopleDetail | null);
      } catch {
        return null;
      }
    }),
  );
  return (
    <Frame signedIn navigation={state === "ready"}>
      <div className="people-detail">
        <Link href={state === "ready" ? "/people" : accessPath(state)}>
          ← Back
        </Link>
        <div className="people-panel friend-heading">
          <p className="badge">Private · local UNC</p>
          <h1>Your friendships</h1>
          <p>
            Requests and friends are visible only to you. A name appears only
            while that person is currently visible to you in People.
          </p>
        </div>
        {invalid ? (
          <section className="people-panel">
            <h2>Invalid page</h2>
            <p role="alert">That relationship page link is invalid.</p>
            <Link href="/people/friends">Start over</Link>
          </section>
        ) : listed?.error ? (
          <section className="people-panel">
            <h2>Friendships unavailable</h2>
            <p role="alert">
              The local friendship feature or your account access may have
              changed. Reload to check.
            </p>
            <Link href="/people/friends">Reload</Link>
          </section>
        ) : rows.length ? (
          <>
            <ul className="friend-list">
              {rows.map((row, index) => (
                <FriendRow
                  key={row.peer_id}
                  row={row}
                  name={details[index]?.real_name ?? null}
                  canBlock={state === "ready"}
                  actor={user.id}
                />
              ))}
            </ul>
            <nav className="people-pages" aria-label="Friendship pages">
              {after && <Link href="/people/friends">Start over</Link>}
              {rows.length === 24 && (
                <Link href={`/people/friends?after=${rows[23].peer_id}`}>
                  Next page
                </Link>
              )}
            </nav>
          </>
        ) : (
          <section className="people-panel">
            <h2>No relationships on this page</h2>
            <p>
              Friend requests and accepted friendships will appear here when
              available.
            </p>
            <Link href="/people">Explore People</Link>
          </section>
        )}
        {state === "ready" && <KnownRelationshipBlock />}
      </div>
    </Frame>
  );
}
