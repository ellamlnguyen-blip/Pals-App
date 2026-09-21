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
          <p className="status">Coming together</p>
          <h1 id="page-heading">Good plans start with people.</h1>
          <p className="intro">
            Pals is taking shape at UNC. A place to find a Hangout and make time
            for each other.
          </p>
        </section>
        <p className="notice">
          This is a development preview. Hangouts and sign-in are not available
          yet.
        </p>
      </main>
    </div>
  );
}
