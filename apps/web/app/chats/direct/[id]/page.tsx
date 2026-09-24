import Link from "next/link";
import { Frame } from "../../../components";
import { dmId } from "../../../../lib/dm";
import { DirectThread } from "./thread";
import { SafetyActions } from "../../../safety/safety-client";
import "../../../hangouts/map.css";
import "../../chat.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export default async function DirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await import("../../../../lib/access");
  const { localPeopleAvailable } = await import("../../../../lib/people");
  let result = null;
  try {
    result = localPeopleAvailable() && dmId.test(id) ? await access() : null;
  } catch {
    result = null;
  }
  const local = result?.user && result.state !== "restricted" ? result : null;
  if (!local || !dmId.test(id))
    return (
      <Frame signedIn>
        <section className="chat-page">
          <h1>Direct chat unavailable</h1>
          <Link href="/safety">Open Safety</Link>
          <Link href="/chats">Back to Chats</Link>
        </section>
      </Frame>
    );
  const status = await local.client.rpc("get_dm_status", { p_peer_id: id });
  const knownPair = !status.error && !!status.data?.[0];
  return (
    <Frame signedIn>
      <nav className="primary-nav" aria-label="Primary">
        <Link href="/hangouts">Hangouts</Link>
        <Link href="/calendar">Calendar</Link>
        <Link href="/people">People</Link>
        <Link href="/chats" aria-current="page">
          Chats
        </Link>
        <Link href="/notifications">Notifications</Link>
      </nav>
      <section className="chat-page" aria-labelledby="direct-title">
        <Link href="/chats">← All chats</Link>
        <p className="badge">Direct chat · local only</p>
        <h1 id="direct-title">Direct chat</h1>
        <DirectThread
          key={`${id}:${local.user?.id}`}
          id={id}
          actor={local.user!.id}
          ready={local.state === "ready"}
        />
        {knownPair && (
          <SafetyActions
            actor={local.user!.id}
            target={{ mode: "user", id }}
            allowBlock
          />
        )}
      </section>
    </Frame>
  );
}
