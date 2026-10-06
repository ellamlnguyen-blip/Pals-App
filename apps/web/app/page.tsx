import Link from "next/link";
import { StudentHeader } from "./student-shell";

export default function Home() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <StudentHeader
        available={{
          calendar: true,
          people: true,
          chats: true,
          notifications: true,
        }}
      />
      <main id="main" tabIndex={-1}>
        <section className="welcome-hero" aria-labelledby="page-heading">
          <div>
            <h1 id="page-heading">
              <span>Meet up.</span>
              <span>Make it happen.</span>
            </h1>
            <p className="intro">
              College is too short to wait around for good things to come to
              you. Do fun things, meet your next friends, and have the time of
              your life for these 4 short years.
            </p>
          </div>
          <Link className="button" href="/signup">
            Join Pals
          </Link>
        </section>
        <p className="notice">
          Find your people at UNC Chapel Hill. Confirm your UNC email to explore
          Hangouts, make a plan and meet up.
        </p>
        <div className="actions">
          <Link href="/signin">Already here? Sign in</Link>
        </div>
      </main>
    </div>
  );
}
