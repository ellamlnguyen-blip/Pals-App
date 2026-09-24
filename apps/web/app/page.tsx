import Link from "next/link";
import { StudentHeader } from "./student-shell";

export default function Home() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <StudentHeader />
      <main id="main" tabIndex={-1}>
        <section className="welcome-hero" aria-labelledby="page-heading">
          <div>
            <p className="status">Meet your campus</p>
            <h1 id="page-heading">Meet up. Make it happen.</h1>
            <p className="intro">
              Make a casual plan, find a Hangout and spend more time together at
              UNC.
            </p>
            <div className="actions">
              <Link className="button" href="/signup">
                Join Pals
              </Link>
              <Link href="/signin">Already here? Sign in</Link>
            </div>
          </div>
        </section>
        <p className="notice">
          This local build includes UNC account setup and a clearly labeled mock
          Hangouts map. Saved plans require running local services.
        </p>
      </main>
    </div>
  );
}
