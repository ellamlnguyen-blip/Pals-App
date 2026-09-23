import { Frame } from "../components";
import "./people.css";

export default function PeopleLoading() {
  return (
    <Frame signedIn>
      <section className="people-panel" role="status" aria-live="polite">
        <h1>Loading People</h1>
        <p>Checking your latest access and People profiles…</p>
      </section>
    </Frame>
  );
}
