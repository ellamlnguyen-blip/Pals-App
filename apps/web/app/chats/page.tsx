import { Frame } from "../components";
import { access } from "../../lib/access";
import { localPeopleAvailable } from "../../lib/people";
import { CombinedInbox } from "./combined-inbox";
import "../hangouts/map.css";
import "./chat.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export default async function ChatsPage() {
  const account = localPeopleAvailable() ? await access() : null;
  if (!account?.user || account.state === "restricted")
    return (
      <Frame>
        <section className="chat-page">
          <h1>Chats unavailable</h1>
          <p>Your access may have changed. Sign in and try again.</p>
        </section>
      </Frame>
    );
  return (
    <Frame signedIn navigation={account.state === "ready"}>
      <section className="chat-page" aria-labelledby="chats-title">
        <h1 id="chats-title" className="chat-page-title">
          Chats
        </h1>
        <div className="chat-shell">
          <aside className="chat-sidebar" aria-label="Conversations">
            <CombinedInbox key={account.user.id} actor={account.user.id} />
          </aside>
          <div className="chat-detail chat-detail-empty">
            <div className="chat-selection-empty">
              <span className="chat-selection-mark" aria-hidden="true">
                ✦
              </span>
              <h2>Pick a conversation</h2>
              <p>Choose a Hangout or message to make a plan together.</p>
            </div>
          </div>
        </div>
      </section>
    </Frame>
  );
}
