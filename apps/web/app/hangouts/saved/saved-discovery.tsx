"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  UNC_BOUNDS,
  type Bounds,
  type SavedFilter,
  type SavedPin,
} from "../../../lib/saved-hangouts-types";
import { searchSaved } from "./actions";
import { SavedMap } from "./map";
import { AnalyticsView } from "../../analytics-view";

export function SavedDiscovery({ token }: { token: string }) {
  const [bounds, setBounds] = useState<Bounds | null>(UNC_BOUNDS);
  const [filters, setFilters] = useState<SavedFilter>({
    time: "upcoming",
    joining: "any",
  });
  const [items, setItems] = useState<SavedPin[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "denied">(
    "loading",
  );
  const [truncated, setTruncated] = useState(false);
  const [rankingMode, setRankingMode] = useState<
    "small_first" | "chronological" | null
  >(null);
  const [refresh, setRefresh] = useState(0);
  const generation = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const previewTitle = useRef<HTMLHeadingElement>(null);
  const listTitle = useRef<HTMLHeadingElement>(null);
  const current = items.find((item) => item.id === selected);
  const onBounds = useCallback((value: Bounds | null) => {
    generation.current++;
    setBounds(value);
    setSelected(null);
    setStatus(value ? "loading" : "ok");
    setItems([]);
    setTruncated(false);
    setRankingMode(null);
  }, []);
  const select = useCallback((id: string, element: HTMLElement) => {
    trigger.current = element;
    setSelected(id);
  }, []);
  useEffect(() => {
    if (selected) previewTitle.current?.focus();
  }, [selected]);
  useEffect(() => {
    const seq = ++generation.current;
    if (!bounds) return;
    void searchSaved(bounds, filters)
      .then((result) => {
        if (generation.current !== seq) return;
        if (result.kind === "ok") {
          setItems(result.items);
          setTruncated(result.truncated);
          setRankingMode(result.rankingMode);
          setStatus("ok");
        } else {
          setItems([]);
          setTruncated(false);
          setRankingMode(null);
          setStatus(result.kind === "denied" ? "denied" : "error");
        }
        setSelected(null);
      })
      .catch(() => {
        if (generation.current === seq) {
          setItems([]);
          setTruncated(false);
          setRankingMode(null);
          setStatus("error");
        }
      });
    const currentGeneration = generation;
    return () => {
      currentGeneration.current++;
    };
  }, [bounds, filters, refresh]);
  function closePreview() {
    setSelected(null);
    if (trigger.current?.isConnected) trigger.current.focus();
    else listTitle.current?.focus();
  }
  return (
    <>
      <AnalyticsView
        event="hangout_map_viewed"
        ready={status === "ok" && !!bounds}
      />
      <div className="saved-filters" aria-label="Saved Hangout filters">
        <label>
          Time{" "}
          <select
            value={filters.time}
            onChange={(e) => {
              generation.current++;
              setItems([]);
              setTruncated(false);
              setRankingMode(null);
              setSelected(null);
              setStatus("loading");
              setFilters((f) => ({
                ...f,
                time: e.target.value as SavedFilter["time"],
              }));
            }}
          >
            <option value="upcoming">Upcoming starts</option>
            <option value="all">Any scheduled time</option>
          </select>
        </label>
        <label>
          Joining{" "}
          <select
            value={filters.joining}
            onChange={(e) => {
              generation.current++;
              setItems([]);
              setTruncated(false);
              setRankingMode(null);
              setSelected(null);
              setStatus("loading");
              setFilters((f) => ({
                ...f,
                joining: e.target.value as SavedFilter["joining"],
              }));
            }}
          >
            <option value="any">Any joining state</option>
            <option value="open">Open to join</option>
          </select>
        </label>
        <button
          className="quiet-button"
          onClick={() => {
            generation.current++;
            setItems([]);
            setTruncated(false);
            setRankingMode(null);
            setSelected(null);
            setStatus("loading");
            setRefresh((v) => v + 1);
          }}
        >
          Refresh saved plans
        </button>
      </div>
      <div className="discovery-layout">
        <SavedMap
          token={token}
          items={items}
          selected={selected}
          onSelect={select}
          onBounds={onBounds}
        />
        <aside
          className="discovery-rail"
          aria-label="Saved Hangouts in this map area"
        >
          <h2 ref={listTitle} tabIndex={-1}>
            In this area
          </h2>
          <p className="rail-help" role="status" aria-live="polite">
            {status === "loading"
              ? "Loading saved Hangouts…"
              : status === "error"
                ? "Saved Hangouts couldn't load. Try refreshing."
                : status === "denied"
                  ? "Saved Hangout access is unavailable. Reload after checking your account."
                  : !bounds
                    ? "Move the map back toward UNC to see saved Hangouts."
                    : `${items.length} saved ${items.length === 1 ? "Hangout" : "Hangouts"} in this area.`}
          </p>
          {status === "ok" &&
            bounds &&
            rankingMode === "small_first" &&
            items.length > 0 && (
              <p className="saved-limit" role="status">
                {truncated
                  ? "Showing up to 100 Hangouts in this area. Smaller groups appear first. Zoom in or narrow the filters to see more."
                  : "Smaller groups appear first in this area."}
              </p>
            )}
          {status === "ok" &&
            bounds &&
            rankingMode === "chronological" &&
            truncated && (
              <p className="saved-limit" role="status">
                Showing the first 100 by scheduled start. Zoom in or narrow the
                filters to see more.
              </p>
            )}
          {current && (
            <section
              className="hangout-preview"
              aria-label="Saved Hangout preview"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
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
              <p className="example-label">Saved Hangout</p>
              <h3 ref={previewTitle} tabIndex={-1}>
                {current.title}
              </h3>
              <p>
                {new Date(current.starts_at).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                ·{" "}
                {current.joining_state === "open"
                  ? "Open to join"
                  : "Joining closed"}
              </p>
              <p>
                <strong>{current.public_place}</strong>
                <br />
                Approximate public area
              </p>
              <p>{current.description || "No description added."}</p>
              <Link className="button" href={`/hangouts/saved/${current.id}`}>
                View details
              </Link>
            </section>
          )}
          {status === "ok" && bounds && items.length === 0 && (
            <div className="empty-examples">
              <h3>No saved Hangouts here</h3>
              <p>
                Try moving around campus, changing filters or creating a plan.
              </p>
            </div>
          )}
          <ul className="example-list saved-list">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  aria-pressed={selected === item.id}
                  onClick={(e) => select(item.id, e.currentTarget)}
                >
                  <span className="example-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <span>{item.public_place}</span>
                    <span>
                      {new Date(item.starts_at).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
