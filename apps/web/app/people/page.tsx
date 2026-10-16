import Link from "next/link";
import { Frame } from "../components";
import { requireAccess } from "../../lib/access";
import { peopleUrl, readSelection, requireLocalPeople } from "../../lib/people";
import { parseSimilarPalsPage } from "../../lib/similar-pals-page";
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
  const { data, error } = await client.rpc("browse_similar_pals", {
    p_graduation_year: selection.year ? Number(selection.year) : null,
    p_major: selection.major || null,
    p_cursor: selection.cursor || null,
    p_limit: 24,
  });
  const page = error ? null : parseSimilarPalsPage(data);
  const cards = page?.items ?? [];
  const gateOff = error?.code === "42501";
  const stale = !!selection.cursor && error?.code === "22023";
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
  const next = page?.has_more
    ? peopleUrl({ ...selection, cursor: page.next_cursor! })
    : null;
  const current = peopleUrl(selection);
  const firstPage = peopleUrl({ ...selection, cursor: "" });
  const showFilters = !gateOff && !stale && !error && !!page;
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 25 },
    (_, index) => currentYear - 10 + index,
  ).filter((year) => year >= 1900 && year <= 2200);
  const linkedYear = selection.year ? Number(selection.year) : null;
  return (
    <Frame signedIn navigation>
      <FocusReturn
        id={focus}
        visibleIds={cards.map((card) => card.account_id)}
      />
      <div className="people-heading" id="people-heading" tabIndex={-1}>
        <h1>Discover your next Pal!</h1>
        {showFilters && (
          <form
            className="people-filters"
            action="/people"
            method="get"
            role="search"
          >
            <label htmlFor="people-year">
              Graduation year
              <select
                id="people-year"
                name="year"
                defaultValue={selection.year}
              >
                <option value="">Any year</option>
                {linkedYear !== null && !yearOptions.includes(linkedYear) && (
                  <option value={linkedYear}>{linkedYear}</option>
                )}
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="people-major">
              Major
              <input
                id="people-major"
                name="major"
                maxLength={200}
                defaultValue={selection.major}
                placeholder="Major"
              />
            </label>
            <button className="button">Find Pals</button>
            <Link href="/people">Clear</Link>
          </form>
        )}
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
      ) : stale ? (
        <section className="people-panel">
          <h2>Pals changed</h2>
          <p role="alert">Refresh the list to see who is available now.</p>
          <Link href={firstPage}>Refresh Pals</Link>
        </section>
      ) : error || !page ? (
        <section className="people-panel">
          <h2>Couldn’t load Pals</h2>
          <p role="alert">Check your connection and try again.</p>
          <Link href={firstPage}>Retry</Link>
        </section>
      ) : (
        <>
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
              {(selection.cursor || next) && (
                <div className="people-pages">
                  {selection.cursor && <Link href={firstPage}>Start over</Link>}
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
                {selection.cursor
                  ? "No more Pals on this page"
                  : selection.year || selection.major
                    ? "No Pals match"
                    : "No one is visible yet"}
              </h2>
              <p>
                {selection.cursor
                  ? "The list may have changed since you started browsing."
                  : selection.year || selection.major
                    ? "Try a different year or major."
                    : "Students appear here only after they choose to share their Pals profile."}
              </p>
              <Link href={selection.cursor ? firstPage : "/people"}>
                {selection.cursor ? "Refresh Pals" : "Clear filters"}
              </Link>
            </section>
          )}
        </>
      )}
    </Frame>
  );
}
