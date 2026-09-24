"use client";
import { StudentHeader } from "../student-shell";
import "./calendar.css";

export default function CalendarError() {
  return (
    <div className="page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <StudentHeader signedIn />
      <main id="main" tabIndex={-1}>
        <section className="calendar-empty" role="alert">
          <h1>Calendar unavailable</h1>
          <p>We couldn’t verify your plans. Reload to try again.</p>
          <a href="/calendar">Reload Calendar</a>
        </section>
      </main>
    </div>
  );
}
