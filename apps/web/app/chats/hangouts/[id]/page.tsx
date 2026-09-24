import Link from "next/link";
import { Frame } from "../../../components";
import { chatAccess, chatUuid, readChat } from "../../../../lib/chat";
import { readSavedPublic } from "../../../../lib/saved-hangouts";
import { Thread } from "./thread";
import { SafetyActions } from "../../../safety/safety-client";
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
      <section className="chat-page" aria-labelledby="thread-title">
        <Link href="/chats">← All chats</Link>
        <p className="badge">Hangout chat · local only</p>
        <h1 id="thread-title">{record.title}</h1>
        <Link href={`/hangouts/saved/${id}`}>View Hangout details</Link>
        <Thread
          key={`${id}:${target.user.id}`}
          id={id}
          userId={target.user.id}
        />
        <SafetyActions
          actor={target.user.id}
          target={{ mode: "hangout", id }}
        />
      </section>
    </Frame>
  );
}
