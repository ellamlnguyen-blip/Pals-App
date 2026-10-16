import Link from "next/link";
import { Frame } from "../../../components";
import { chatAccess, chatUuid, readChat } from "../../../../lib/chat";
import { readSavedPublic } from "../../../../lib/saved-hangouts";
import { Thread } from "./thread";
import { SafetyActions } from "../../../safety/safety-client";
import { CombinedInbox } from "../../combined-inbox";
import { pinCue } from "../../../hangouts/saved/pin-cue";
import "../../../hangouts/map.css";
import "../../chat.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const target = await chatAccess();
  if (!target || !chatUuid.test(id))
    return (
      <Frame>
        <section className="chat-page">
          <h1>Chat unavailable</h1>
          <Link href="/chats">Back to Chats</Link>
        </section>
      </Frame>
    );
  const gate = await readChat(target.client, id);
  if (gate.kind !== "ok")
    return (
      <Frame>
        <section className="chat-page">
          <h1>Chat unavailable</h1>
          <p>Your Hangout or chat access may have changed.</p>
          <Link href="/safety">Use retained Hangout ID recovery in Safety</Link>
          <Link href="/chats">Back to Chats</Link>
        </section>
      </Frame>
    );
  const record = await readSavedPublic(target.client, id);
  if (!record || record.status !== "published")
    return (
      <Frame>
        <section className="chat-page">
          <h1>Chat unavailable</h1>
          <Link href="/chats">Back to Chats</Link>
        </section>
      </Frame>
    );
  return (
    <Frame signedIn navigation>
      <section className="chat-page" aria-labelledby="chats-title">
        <h1 id="chats-title" className="chat-page-title">
          Chats
        </h1>
        <div className="chat-shell chat-shell-thread">
          <aside className="chat-sidebar" aria-label="Conversations">
            <CombinedInbox
              actor={target.user.id}
              selected={{ kind: "hangout", id }}
            />
          </aside>
          <div className="chat-detail">
            <header className="chat-detail-header">
              <Link className="chat-back" href="/chats">
                ← All chats
              </Link>
              <div className="chat-detail-identity">
                <span
                  className="combined-avatar combined-emoji"
                  aria-hidden="true"
                >
                  {pinCue({
                    title: record.title,
                    description: record.description,
                  })}
                </span>
                <div>
                  <p>Hangout chat</p>
                  <h2 id="thread-title">{record.title}</h2>
                </div>
              </div>
            </header>
            <div className="chat-hangout-strip">
              <span>
                <time dateTime={record.starts_at}>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "America/New_York",
                  }).format(new Date(record.starts_at))}{" "}
                  ET
                </time>
                <span aria-hidden="true"> · </span>
                {record.public_place}
              </span>
              <Link href={`/hangouts/saved/${id}`}>View Hangout details →</Link>
            </div>
            <Thread
              key={`${id}:${target.user.id}`}
              id={id}
              userId={target.user.id}
              title={record.title}
            />
            <div className="chat-safety-actions">
              <SafetyActions
                actor={target.user.id}
                target={{ mode: "hangout", id }}
              />
            </div>
          </div>
        </div>
      </section>
    </Frame>
  );
}
