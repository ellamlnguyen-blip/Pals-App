import Link from "next/link";
import type { ReactNode } from "react";
import { SignOutForm } from "./auth-change-signal";
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
        {signedIn && <Link href="/safety">Safety</Link>}
        {signedIn && <SignOutForm />}
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
