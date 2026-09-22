import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "./actions";
export function Frame({
  children,
  signedIn = false,
}: {
  children: ReactNode;
  signedIn?: boolean;
}) {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header>
        <Link className="wordmark" href="/">
          Pals
        </Link>
        <span className="campus">UNC Chapel Hill</span>
        {signedIn && (
          <form action={signOut}>
            <button className="text-button">Sign out</button>
          </form>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
export function Intro({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="form-intro">
      <h1>{title}</h1>
      <p className="intro">{children}</p>
    </div>
  );
}
