import Link from "next/link";
import { Frame } from "../../../components";
import { dmId } from "../../../../lib/dm";
import { DirectSafetyBoundary } from "./safety-boundary";
import { CombinedInbox } from "../../combined-inbox";
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
      <Frame>
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
    <Frame signedIn navigation={local.state === "ready"}>
      <section className="chat-page" aria-labelledby="chats-title">
        <h1 id="chats-title" className="sr-only">
          Chats
        </h1>
        <div className="chat-shell chat-shell-thread">
          <aside className="chat-sidebar" aria-label="Conversations">
            <CombinedInbox
              actor={local.user!.id}
              selected={{ kind: "dm", id }}
            />
          </aside>
          <div className="chat-detail">
            <DirectSafetyBoundary
              key={`${id}:${local.user?.id}`}
              id={id}
              actor={local.user!.id}
              knownPair={knownPair}
            />
          </div>
        </div>
      </section>
    </Frame>
  );
}
