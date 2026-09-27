"use client";
import { BrandLink } from "./student-shell";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page error-page">
      <BrandLink />
      <h1>Something didn’t connect.</h1>
      <p>We couldn’t finish loading Pals. Please try again in a moment.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
