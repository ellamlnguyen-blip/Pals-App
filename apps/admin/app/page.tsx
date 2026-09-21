export default function Home() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <span className="wordmark">Pals Admin</span>
        <span className="campus">UNC Chapel Hill</span>
      </header>
      <main id="main" tabIndex={-1}>
        <section aria-labelledby="page-heading">
          <p className="status">Coming together</p>
          <h1 id="page-heading">A safer campus starts here.</h1>
          <p className="intro">
            The Pals team workspace is being built. Moderation tools are not
            available yet.
          </p>
        </section>
        <p className="notice">
          Development preview only. No student data or administrative actions
          are available.
        </p>
      </main>
    </div>
  );
}
