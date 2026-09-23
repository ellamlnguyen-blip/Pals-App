import Link from "next/link";
import { Frame } from "../components";
import { chatAccess, chatUuid, readChat } from "../../lib/chat";
import "../hangouts/map.css";
import "./chat.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const target = await chatAccess();
  if (!target)
    return (
      <Frame signedIn>
        <section className="chat-page">
          <h1>Chats unavailable</h1>
          <p>Your access may have changed. Sign in and try again.</p>
        </section>
      </Frame>
    );
  const after = (await searchParams).after;
  if (after && !chatUuid.test(after))
    return (
      <Frame signedIn>
        <section className="chat-page">
          <h1>Check the page link</h1>
          <Link href="/chats">Return to Chats</Link>
        </section>
      </Frame>
    );
  let query = target.client
    .from("hangout_participants")
    .select("hangout_id,hangouts!inner(id,title,starts_at,status,visibility)")
    .eq("account_id", target.user.id)
    .eq("hangouts.status", "published")
    .eq("hangouts.visibility", "campus")
    .order("hangout_id", { ascending: true })
    .limit(25);
  if (after) query = query.gt("hangout_id", after);
  const { data, error } = await query;
  const page = (data ?? []).slice(0, 24);
  const rows = await Promise.all(
    page.map(async (row) => {
      const detail = Array.isArray(row.hangouts)
        ? row.hangouts[0]
        : row.hangouts;
      const gate = await readChat(target.client, row.hangout_id);
      return {
        id: row.hangout_id,
        title: detail?.title ?? "Hangout",
        kind: gate.kind,
      };
    }),
  );
  return (
    <Frame signedIn>
      <nav className="primary-nav" aria-label="Primary">
        <Link href="/hangouts">Hangouts</Link>
        <Link href="/calendar">Calendar</Link>
        <Link href="/people">People</Link>
        <Link href="/chats" aria-current="page">
          Chats
        </Link>
        <span>Notifications</span>
      </nav>
      <section className="chat-page" aria-labelledby="chats-title">
        <p className="badge">Saved Hangouts · local only</p>
        <h1 id="chats-title">Your Hangout chats</h1>
        <p>Coordinate with the plans you are currently part of.</p>
        {error ? (
          <p role="alert">
            Chats could not load. <Link href="/chats">Try again</Link>
          </p>
        ) : rows.length === 0 ? (
          <div className="chat-empty">
            <h2>No current Hangout chats</h2>
            <p>Join a saved Hangout to see whether its chat is available.</p>
            <Link href="/hangouts/saved">Find Hangouts</Link>
          </div>
        ) : (
          <ul className="chat-list">
            {rows.map((row) => (
              <li key={row.id}>
                <strong>{row.title}</strong>
                {row.kind === "ok" ? (
                  <Link href={`/chats/hangouts/${row.id}`}>Open chat</Link>
                ) : (
                  <span>
                    {row.kind === "denied"
                      ? "Chat unavailable"
                      : "Could not check chat. Reload to try again."}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {(data?.length ?? 0) > 24 && (
          <Link
            className="quiet-button"
            href={`/chats?after=${page[23].hangout_id}`}
          >
            Load more Hangouts
          </Link>
        )}
      </section>
    </Frame>
  );
}
