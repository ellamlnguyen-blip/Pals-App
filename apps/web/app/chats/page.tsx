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
        <h1 id="chats-title" className="sr-only">
          Chats
        </h1>
        <CombinedInbox key={account.user.id} actor={account.user.id} />
      </section>
    </Frame>
  );
}
