"use client";
export default function CalendarError() {
  return (
    <section role="alert">
      <h1>Calendar unavailable</h1>
      <p>We couldn’t verify your plans. Reload to try again.</p>
      <a href="/calendar">Reload Calendar</a>
    </section>
  );
}
