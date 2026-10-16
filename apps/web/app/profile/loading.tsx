import { Frame } from "../components";
import "./profile.css";

export default function LoadingProfile() {
  return (
    <Frame profileChrome>
      <section className="profile-loading" role="status" aria-live="polite">
        <h1>Loading your profile</h1>
        <p>Checking your private details…</p>
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
