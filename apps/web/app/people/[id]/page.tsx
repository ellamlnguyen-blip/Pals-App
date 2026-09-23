import Link from "next/link";
import { Frame } from "../../components";
import { requireAccess } from "../../../lib/access";
import {
  peopleId,
  requireLocalPeople,
  safeReturn,
  type PeopleDetail,
} from "../../../lib/people";
import { readFriendship } from "../friend-actions";
import { PersonView } from "./person-view";
import "../../hangouts/map.css";
import "../people.css";

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
  const { client } = await requireAccess("ready");
  const { id } = await params;
  const query = await searchParams;
  const baseBack = safeReturn(query.from);
  const back =
    typeof query.focus === "string" && query.focus === id
      ? `${baseBack}${baseBack.includes("?") ? "&" : "?"}focus=${id}`
      : baseBack;
  const result = peopleId.test(id)
    ? await client.rpc("get_people_detail", { p_account_id: id })
    : { data: [], error: null };
  const detail = (result.data?.[0] ?? null) as PeopleDetail | null;
  const friendship = detail ? await readFriendship(id) : null;
  return (
    <Frame signedIn>
      <div className="people-detail">
        <a href={back}>← Back to People</a>
        {result.error ? (
          <section className="people-panel">
            <h1>People unavailable</h1>
            <p role="alert">
              Your access or connection may have changed. Try again from People.
            </p>
            <Link href="/people">Return to People</Link>
          </section>
        ) : !detail ? (
          <section className="people-panel">
            <h1>Person unavailable</h1>
            <p>This profile is not available in People.</p>
            <Link href="/people">Return to People</Link>
          </section>
        ) : (
          <PersonView detail={detail} back={back} friendship={friendship!} />
        )}
      </div>
    </Frame>
  );
}
