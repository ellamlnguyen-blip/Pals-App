import { Frame } from "../../components";
import "../people.css";

export default function PersonLoading() {
  return (
    <Frame signedIn navigation>
      <section className="people-panel" role="status" aria-live="polite">
        <h1>Loading profile</h1>
        <p>Checking if this person is still available in People…</p>
      </section>
    </Frame>
  );
}
