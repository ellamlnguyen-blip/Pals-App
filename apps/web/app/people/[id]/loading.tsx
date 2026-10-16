import { Frame } from "../../components";
import "../people.css";

export default function PersonLoading() {
  return (
    <Frame profileChrome>
      <section className="people-panel" role="status" aria-live="polite">
        <h1>Loading profile</h1>
        <p>Checking if this person is still available in People…</p>
        <div className="profile-loading-portrait" aria-hidden="true" />
        <div className="profile-loading-line" aria-hidden="true" />
        <div className="profile-loading-gallery" aria-hidden="true">
          <span />
          <span />
        </div>
      </section>
    </Frame>
  );
}
