import { Frame } from "../components";
import "./calendar.css";

export default function LoadingCalendar() {
  return (
    <Frame>
      <section className="calendar-empty" role="status" aria-live="polite">
        <h1>Loading Calendar</h1>
        <p>Checking your latest plans…</p>
      </section>
    </Frame>
  );
}
