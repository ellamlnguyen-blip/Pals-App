import Link from "next/link";

export default function Home() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <span className="wordmark">Pals</span>
        <span className="campus">UNC Chapel Hill</span>
      </header>
      <main id="main" tabIndex={-1}>
        <section aria-labelledby="page-heading">
          <p className="status">Meet your campus</p>
          <h1 id="page-heading">Good plans start with people.</h1>
          <p className="intro">
            Find your people at UNC. Start with your campus email and a little
            about yourself.
          </p>
          <div className="actions">
            <Link className="button" href="/signup">
              Join Pals
            </Link>
            <Link href="/signin">Already here? Sign in</Link>
          </div>
        </section>
        <p className="notice">
          Pals is taking shape. Account setup is ready; Hangouts are coming
          next.
        </p>
      </main>
    </div>
  );
}
