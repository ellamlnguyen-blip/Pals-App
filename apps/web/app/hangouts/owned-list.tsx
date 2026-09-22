import Link from "next/link";
import { requireLocalHangouts } from "../../lib/hangouts";
import { campusLocal } from "../../lib/hangout-time";
import { requireAccess } from "../../lib/access";
export async function OwnedHangouts() {
  requireLocalHangouts();
  const { client, user } = await requireAccess("ready");
  const { data, error } = await client
    .from("hangouts")
    .select("id,title,starts_at,status")
    .eq("host_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(6);
  return (
    <section className="owned-hangouts" aria-label="Your recent saved Hangouts">
      <h2>Your recent saved Hangouts</h2>
      {error ? (
        <p className="help">
          Saved Hangouts are unavailable. Check local access and try again.
        </p>
      ) : !data?.length ? (
        <p className="help">
          No saved Hangouts yet. Your mock map examples are separate.
        </p>
      ) : (
        <ul>
          {data.map((row) => (
            <li key={row.id}>
              <Link href={`/hangouts/owned/${row.id}`}>{row.title}</Link>
              <span>
                {campusLocal(row.starts_at).replace("T", " at ")} · {row.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
