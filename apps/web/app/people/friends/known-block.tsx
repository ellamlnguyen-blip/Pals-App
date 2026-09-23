"use client";

export function KnownRelationshipBlock() {
  return (
    <section className="people-panel">
      <h2>Block a current relationship by ID</h2>
      <p>
        Creating a block is temporarily unavailable in this local build. A
        confirmed block now affects Hangout access and may end shared
        attendance.
      </p>
      <button className="text-button" disabled>
        New blocking temporarily unavailable
      </button>
    </section>
  );
}
