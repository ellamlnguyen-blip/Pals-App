import { Frame } from "../components";
import "./profile.css";

export default function LoadingProfile() {
  return (
    <Frame signedIn navigation>
      <section className="profile-loading" role="status" aria-live="polite">
        <h1>Loading your profile</h1>
        <p>Checking your private details…</p>
        <div className="loading-block" aria-hidden="true" />
      </section>
    </Frame>
  );
}
