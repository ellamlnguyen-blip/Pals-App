"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HangoutsMap } from "./map";
import { filterMockHangouts, MOCK_HANGOUTS } from "./fixtures";
import { StudentNav } from "../student-shell";

export function HangoutsShell({
  token,
  createEnabled,
  peopleEnabled,
  notificationsEnabled,
}: {
  token: string;
  createEnabled: boolean;
  peopleEnabled: boolean;
  notificationsEnabled: boolean;
}) {
  const [category, setCategory] = useState("All");
  const [time, setTime] = useState("Any time");
  const [selected, setSelected] = useState<string | null>(null);
  const [shell, setShell] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const items = useMemo(
    () => filterMockHangouts(category, time),
    [category, time],
  );
  const current = items.find((item) => item.id === selected);
  const select = useCallback((id: string, element: HTMLElement) => {
    trigger.current = element;
    setSelected(id);
    previewHeading.current?.focus();
  }, []);
  useEffect(() => {
    if (selected) previewHeading.current?.focus();
  }, [selected]);
  function closePreview() {
    setSelected(null);
    if (trigger.current?.isConnected) trigger.current.focus();
    else listHeading.current?.focus();
  }
  function showShell(name: string) {
    setShell(name);
  }
  useEffect(() => {
    if (shell) dialog.current?.showModal();
  }, [shell]);
  function reset() {
    setCategory("All");
    setTime("Any time");
    setSelected(null);
  }
  return (
    <>
      <StudentNav
        available={{
          calendar: createEnabled,
          people: peopleEnabled,
          chats: createEnabled,
          notifications: notificationsEnabled,
        }}
        onUnavailable={showShell}
      />
      <main id="main" className="hangouts-main" tabIndex={-1}>
        <div className="hangouts-heading">
          <div>
            <h1>Hangouts around UNC</h1>
            <p>Start around campus. See what sounds like you.</p>
          </div>
          {createEnabled ? (
            <Link className="button create-button" href="/hangouts/new">
              + Create Hangout
            </Link>
          ) : (
            <button
              className="button create-button"
              onClick={() => showShell("Create Hangout")}
            >
              + Create Hangout
            </button>
          )}
        </div>
        <p className="fixture-notice">
          <strong>Mock Hangouts</strong> · These are development examples, not
          real plans or student activity.
        </p>
        <div className="filter-bar" aria-label="Filter mock Hangouts">
          <div
            className="category-filters"
            role="group"
            aria-label="Example category"
          >
            {["All", "Food", "Study", "Outside"].map((value) => (
              <button
                key={value}
                className="filter-button"
                aria-pressed={category === value}
                onClick={() => {
                  setCategory(value);
                  setSelected(null);
                }}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="time-filter">
            Example time
            <select
              value={time}
              onChange={(event) => {
                setTime(event.target.value);
                setSelected(null);
              }}
            >
              <option>Any time</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>
          </label>
          {(category !== "All" || time !== "Any time") && (
            <button className="text-button" onClick={reset}>
              Reset filters
            </button>
          )}
        </div>
        <div className="discovery-layout">
          <HangoutsMap
            token={token}
            items={items}
            selected={selected}
            onSelect={select}
          />
          <aside className="discovery-rail" aria-label="Mock Hangout examples">
            <h2 ref={listHeading} tabIndex={-1}>
              A few possibilities
            </h2>
            <p className="rail-help" role="status">
              {items.length} mock {items.length === 1 ? "Hangout" : "Hangouts"}.
              Pick one to preview.
            </p>
            {current && (
              <section
                className="hangout-preview"
                aria-label="Hangout preview"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    closePreview();
                  }
                }}
              >
                <button
                  className="text-button preview-close"
                  onClick={closePreview}
                >
                  Close preview
                </button>
                <p className="example-label">Mock Hangout</p>
                <h3 ref={previewHeading} tabIndex={-1}>
                  {current.title}
                </h3>
                <p>
                  {current.category} · Example {current.time.toLowerCase()}
                </p>
                <p>
                  <strong>{current.place}</strong>
                  <br />
                  Approximate public area
                </p>
                <p>{current.description}</p>
                <p className="help">
                  This is a preview only. There is no real host, scheduled time
                  or joining.
                </p>
              </section>
            )}
            {items.length === 0 ? (
              <div className="empty-examples">
                <h3>No examples match</h3>
                <p>Try another category or time.</p>
                <button className="quiet-button" onClick={reset}>
                  Show all examples
                </button>
              </div>
            ) : (
              <ul className="example-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      aria-pressed={selected === item.id}
                      onClick={(event) => select(item.id, event.currentTarget)}
                    >
                      <span className="example-number" aria-hidden="true">
                        {MOCK_HANGOUTS.indexOf(item) + 1}
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <span>{item.place}</span>
                        <span>
                          {item.category} · Example {item.time.toLowerCase()}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </main>
      <dialog
        ref={dialog}
        onClose={() => setShell(null)}
        className="shell-dialog"
        aria-labelledby="shell-title"
        aria-describedby="shell-description"
      >
        <p className="example-label">Pals preview</p>
        <h2 id="shell-title">
          {shell === "Create Hangout"
            ? "Your next Hangout starts here"
            : `${shell} is coming later`}
        </h2>
        <p id="shell-description">
          {shell === "Create Hangout"
            ? "Soon, a title, a rough time and a place will be enough to get people together. Creation isn't available in this map preview."
            : `This map preview focuses on Hangouts. ${shell} isn't available yet.`}
        </p>
        {shell === "Create Hangout" && (
          <p className="fixture-notice">Nothing has been saved or published.</p>
        )}
        <form method="dialog">
          <button className="button">Back to Hangouts</button>
        </form>
      </dialog>
    </>
  );
}
