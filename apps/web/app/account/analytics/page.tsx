import Link from "next/link";
import { Frame } from "../../components";
import { AnalyticsChoice } from "./choice";
import { access } from "../../../lib/access";
import "./analytics.css";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const current = await access().catch(() => null);
  const eligible =
    current?.state === "onboarding" || current?.state === "ready";
  return (
    <Frame
      signedIn={Boolean(current?.user)}
      navigation={current?.state === "ready"}
    >
      <div className="analytics-page">
        <Link href="/hangouts">← Back to Hangouts</Link>
        <h1>Analytics choice</h1>
        <p>
          Help us understand which parts of making plans work well. This is
          optional.
        </p>
        <section
          className="analytics-panel"
          aria-labelledby="analytics-count-heading"
        >
          <h2 id="analytics-count-heading">What may be counted</h2>
          <p>
            We may count onboarding, Hangout map and detail views, creating,
            joining, leaving or cancelling a Hangout, and visits to Calendar,
            People profiles and Notifications. We may also count friend
            requests, a first DM request and a Hangout chat send.
          </p>
          <p>
            Message contents and recipients are excluded. Attendance and safety
            activity are excluded. We do not send identifying details, locations
            or Hangout details.
          </p>
          <p>
            Your choice lasts only in this tab. Reloading turns analytics off.
            You can turn it off here any time.
          </p>
          <AnalyticsChoice eligible={eligible} />
        </section>
      </div>
    </Frame>
  );
}
