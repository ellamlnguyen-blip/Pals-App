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
      <Frame signedIn>
        <nav className="people-back">
          <Link href="/hangouts">Hangouts</Link>
        </nav>
        <section className="people-panel">
          <h1>Check your People filters</h1>
          <p role="alert">
            The search, filter, or page link is invalid. Try a shorter name or
            major and a year from 1900–2200.
          </p>
          <Link href="/people">Clear filters</Link>
        </section>
      </Frame>
    );
  const { data, error } = await client.rpc("browse_people", {
    p_search: selection.search || null,
    p_graduation_year: selection.year ? Number(selection.year) : null,
    p_major: selection.major || null,
    p_after_id: selection.afterId || null,
    p_limit: 24,
  });
  const cards = (data ?? []) as PeopleCard[];
  const gateOff = error?.code === "42501";
  const next =
    cards.length === 24
      ? peopleUrl({
          ...selection,
          afterId: cards[23].account_id,
        })
      : null;
  const current = peopleUrl(selection);
  return (
    <Frame signedIn>
      <nav className="primary-nav" aria-label="Primary">
        <Link href="/hangouts">Hangouts</Link>
        <Link href="/calendar">Calendar</Link>
        <Link href="/people" aria-current="page">
          People
        </Link>
        <Link href="/chats">Chats</Link>
        <span>Notifications</span>
      </nav>
      <FocusReturn
        id={focus}
        visibleIds={cards.map((card) => card.account_id)}
      />
      <div className="people-heading" id="people-heading" tabIndex={-1}>
        <div>
          <p className="badge">Local UNC directory</p>
          <h1>Find a familiar face</h1>
          <p>Browse students who chose to appear in People.</p>
        </div>
        <div className="people-heading-links">
          <Link href="/people/friends">Your friendships</Link>
          <Link href="/people/privacy">Your People visibility</Link>
        </div>
      </div>
      {gateOff ? (
        <section className="people-panel">
          <h2>People is unavailable</h2>
          <p>
            Your access or the local People feature may have changed. You can
            still check your visibility preference.
          </p>
          <Link href="/people/privacy">Manage your visibility</Link>
        </section>
      ) : error ? (
        <section className="people-panel">
          <h2>Couldn’t load People</h2>
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
            <label htmlFor="people-search">
              Name
              <input
                id="people-search"
                name="search"
                maxLength={100}
                defaultValue={selection.search}
                placeholder="Search a name"
              />
            </label>
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
            <button className="button">Find people</button>
            <Link href="/people">Clear</Link>
          </form>
          {cards.length ? (
            <>
              <ul className="people-grid">
                {cards.map((card) => (
                  <li key={card.account_id}>
                    {/* Full navigation rechecks live peer access; a cached client route must not restore a hidden card. */}
                    <a
                      id={`person-${card.account_id}`}
                      href={`/people/${card.account_id}?from=${encodeURIComponent(current)}&focus=${card.account_id}`}
                    >
                      <span className="people-card-name">{card.real_name}</span>
                      <span>{card.campus_name}</span>
                      <span>
                        Class of {card.graduation_year} · {card.major}
                      </span>
                      <span className="people-card-cta">View profile →</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="people-pages">
                <span>Showing this page of People</span>
                {selection.afterId && <Link href="/people">Start over</Link>}
                {next && (
                  <Link className="button" prefetch={false} href={next}>
                    Next page
                  </Link>
                )}
              </div>
            </>
          ) : (
            <section className="people-panel">
              <h2>
                {selection.search || selection.year || selection.major
                  ? "No people match"
                  : "No one is visible yet"}
              </h2>
              <p>
                {selection.search || selection.year || selection.major
                  ? "Try a different name, year, or major."
                  : "Students appear here only after they choose to share their People profile."}
              </p>
              <Link href="/people">Clear filters</Link>
            </section>
          )}
        </>
      )}
    </Frame>
  );
}
