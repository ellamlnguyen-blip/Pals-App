import Link from "next/link";
import type { RichPeopleDetail } from "@pals/types";
import { Frame, frameAvailableDestinations } from "../../components";
import { localAttendanceAvailable } from "../../../lib/attendance";
import { requireAccess } from "../../../lib/access";
import {
  peopleId,
  requireLocalPeople,
  safeReturn,
  type PeopleDetail,
} from "../../../lib/people";
import { readFriendship } from "../friend-actions";
import { PersonView } from "./person-view";
import type { PeerDmState } from "./request-control";
import "../../hangouts/map.css";
import "../people.css";
import "../../profile/profile.css";
import "./peer-profile.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string | string[];
    focus?: string | string[];
  }>;
}) {
  requireLocalPeople();
  const { client, user } = await requireAccess("ready");
  const { id } = await params;
  const query = await searchParams;
  const baseBack = safeReturn(query.from);
  const back =
    typeof query.focus === "string" && query.focus === id
      ? `${baseBack}${baseBack.includes("?") ? "&" : "?"}focus=${id}`
      : baseBack;
  const richResult = peopleId.test(id)
    ? await client.rpc("get_rich_people_detail", { p_account_id: id })
    : { data: [], error: null };
  const richDetail = (richResult.data?.[0] ?? null) as RichPeopleDetail | null;
  // An absent rich row is a normal default-off outcome. An RPC error is not:
  // do not silently turn an authorization failure into a text-only profile.
  const textResult =
    !richResult.error && !richDetail && peopleId.test(id)
      ? await client.rpc("get_people_detail", { p_account_id: id })
      : { data: [], error: null };
  const detail =
    richDetail ?? ((textResult.data?.[0] ?? null) as PeopleDetail | null);
  const error = richResult.error || textResult.error;
  const [friendship, dmStatus] = detail
    ? await Promise.all([
        readFriendship(id),
        client.rpc("get_dm_status", { p_peer_id: id }),
      ])
    : [null, null];
  const dmRow = dmStatus?.data?.[0] as { state?: unknown } | undefined;
  const dmState: PeerDmState = dmStatus?.error
    ? "unknown"
    : dmRow?.state === "accepted" || dmRow?.state === "pending"
      ? dmRow.state
      : dmRow
        ? "unknown"
        : "none";
  return (
    <Frame signedIn navigation profileChrome={!!detail && !error}>
      <div className="people-detail">
        {error ? (
          <section className="people-panel">
            <a href={back}>← Back to People</a>
            <h1>Profile unavailable</h1>
            <p role="alert">
              We couldn’t confirm this profile’s current sharing. Return to
              People and try again.
            </p>
            <Link href="/people">Return to People</Link>
          </section>
        ) : !detail ? (
          <section className="people-panel">
            <a href={back}>← Back to People</a>
            <h1>Person unavailable</h1>
            <p>This profile is not available in People.</p>
            <Link href="/people">Return to People</Link>
          </section>
        ) : (
          <PersonView
            key={`${id}:${dmState}`}
            detail={detail}
            richDetail={richDetail}
            back={back}
            friendship={friendship!}
            initialDmState={dmState}
            actor={user!.id}
            available={frameAvailableDestinations()}
            attendanceAvailable={localAttendanceAvailable()}
          />
        )}
      </div>
    </Frame>
  );
}
