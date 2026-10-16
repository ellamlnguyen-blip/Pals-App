import { Frame } from "../components";
import "./people.css";

export default function PeopleLoading() {
  return (
    <Frame>
      <section className="people-panel" role="status" aria-live="polite">
        <h1>Loading Pals</h1>
        <p>Checking your latest access and Pals profiles…</p>
      </section>
    </Frame>
  );
}
