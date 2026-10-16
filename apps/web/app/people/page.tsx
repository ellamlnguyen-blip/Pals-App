import Link from "next/link";
import { Frame } from "../components";
import { requireAccess } from "../../lib/access";
import {
  peopleUrl,
  readSelection,
  requireLocalPeople,
  type PeopleCard,
} from "../../lib/people";
import "../hangouts/map.css";
import "./people.css";
import { FocusReturn } from "./focus-return";
import { PeopleCardPhoto, PeopleCardPhotoBoundary } from "./card-photo";
import { resolveCardPhotoRevisions } from "../../lib/people-card-photos";
import { friendshipBadgeForPeer } from "./friendship-badge-state";
import { FriendshipBadge } from "./friendship-badge";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  requireLocalPeople();
  const { client } = await requireAccess("ready");
  const params = await searchParams;
  const focus =
    typeof params.focus === "string" &&
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
      params.focus,
    )
      ? params.focus
      : null;
  const filters = { ...params };
  delete filters.focus;
  const selection = readSelection(filters);
  if (!selection)
    return (
      <Frame signedIn navigation>
        <nav className="people-back">
          <Link href="/hangouts">Hangouts</Link>
        </nav>
        <section className="people-panel">
          <h1>Check your Pals filters</h1>
          <p role="alert">
            The filter or page link is invalid. Try a shorter major and a year
            from 1900–2200.
          </p>
          <Link href="/people">Clear filters</Link>
        </section>
      </Frame>
    );
  const { data, error } = await client.rpc("browse_people", {
    p_search: null,
    p_graduation_year: selection.year ? Number(selection.year) : null,
    p_major: selection.major || null,
    p_after_id: selection.afterId || null,
    p_limit: 24,
  });
  const cards = (data ?? []) as PeopleCard[];
  const gateOff = error?.code === "42501";
  const friendshipBadges = error
    ? {}
    : Object.fromEntries(
        await Promise.all(
          cards.slice(0, 24).map(async (card) => {
            try {
              const result = await client.rpc("get_friendship", {
                p_peer_id: card.account_id,
              });
              return [
                card.account_id,
                result.error
                  ? null
                  : friendshipBadgeForPeer(card.account_id, result.data?.[0]),
              ] as const;
            } catch {
              return [card.account_id, null] as const;
            }
          }),
        ),
      );
  const photoRevisions = error
    ? {}
    : await resolveCardPhotoRevisions(
        cards.map((card) => card.account_id),
        async (subjectId) => {
          const result = await client.rpc("get_rich_people_detail", {
            p_account_id: subjectId,
          });
          return result.error ? null : result.data?.[0];
        },
      );
  const next =
    cards.length === 24
      ? peopleUrl({
          ...selection,
          afterId: cards[23].account_id,
        })
      : null;
  const current = peopleUrl(selection);
  return (
    <Frame signedIn navigation>
      <FocusReturn
        id={focus}
        visibleIds={cards.map((card) => card.account_id)}
      />
      <div className="people-heading" id="people-heading" tabIndex={-1}>
        <div>
          <h1>Discover your next Pal!</h1>
        </div>
      </div>
      {gateOff ? (
        <section className="people-panel">
          <h2>Pals is unavailable</h2>
          <p>
            Your access or the Pals feature may have changed. You can still
            check your visibility preference.
          </p>
          <Link href="/people/privacy">Manage your visibility</Link>
        </section>
      ) : error ? (
        <section className="people-panel">
          <h2>Couldn’t load Pals</h2>
          <p role="alert">Check your connection and try again.</p>
          <Link href={current}>Retry</Link>
        </section>
      ) : (
        <>
          <form
            className="people-filters"
            action="/people"
            method="get"
            role="search"
          >
            <label htmlFor="people-year">
              Graduation year
              <input
                id="people-year"
                name="year"
                type="number"
                min="1900"
                max="2200"
                defaultValue={selection.year}
                placeholder="Any year"
              />
            </label>
            <label htmlFor="people-major">
              Major
              <input
                id="people-major"
                name="major"
                maxLength={200}
                defaultValue={selection.major}
                placeholder="Exact major"
              />
            </label>
            <button className="button">Find Pals</button>
            <Link href="/people">Clear</Link>
          </form>
          {cards.length ? (
            <>
              <PeopleCardPhotoBoundary>
                <ul className="people-grid">
                  {cards.map((card) => (
                    <li key={card.account_id}>
                      {/* Full navigation rechecks live peer access; a cached client route must not restore a hidden card. */}
                      <a
                        id={`person-${card.account_id}`}
                        href={`/people/${card.account_id}?from=${encodeURIComponent(current)}&focus=${card.account_id}`}
                      >
                        <PeopleCardPhoto
                          subjectId={card.account_id}
                          name={card.real_name}
                          revision={photoRevisions[card.account_id] ?? null}
                        />
                        <span className="people-card-name">
                          {card.real_name}
                          <FriendshipBadge
                            status={friendshipBadges[card.account_id]}
                          />
                        </span>
                        <span>{card.campus_name}</span>
                        <span>
                          Class of {card.graduation_year} · {card.major}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </PeopleCardPhotoBoundary>
              {(selection.afterId || next) && (
                <div className="people-pages">
                  {selection.afterId && <Link href="/people">Start over</Link>}
                  {next && (
                    <Link className="button" prefetch={false} href={next}>
                      Next page
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <section className="people-panel">
              <h2>
                {selection.year || selection.major
                  ? "No Pals match"
                  : "No one is visible yet"}
              </h2>
              <p>
                {selection.year || selection.major
                  ? "Try a different year or major."
                  : "Students appear here only after they choose to share their Pals profile."}
              </p>
              <Link href="/people">Clear filters</Link>
            </section>
          )}
        </>
      )}
    </Frame>
  );
}
