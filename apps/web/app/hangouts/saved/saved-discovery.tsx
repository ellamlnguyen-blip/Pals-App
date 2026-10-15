"use client";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  UNC_BOUNDS,
  validPeriodMask,
  type Bounds,
  type PeriodMask,
  type SavedFilter,
  type SavedPin,
} from "../../../lib/saved-hangouts-types";
import { searchSaved, changeSavedMembership } from "./actions";
import { SavedMap } from "./map";
import { AnalyticsView } from "../../analytics-view";
import {
  parseBrowseContext,
  restoredSavedFilters,
  type BrowseContext,
} from "./browse-context";
import { pinCue } from "./pin-cue";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../../auth-transition";
import { calendarAuthMayReload } from "../../../lib/calendar-auth";

type Preview = {
  kind: "ok";
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  publicPlace: string;
  status: string;
  joining: string;
  ownState: string;
  canJoin: boolean;
  people: { role: string; name: string | null; photo: string | null }[];
  rosterPageAtLimit: boolean;
};
const browseKey = "pals-saved-browse-context";
const periods = [
  { label: "Today", bit: 0 },
  { label: "Tomorrow", bit: 1 },
  { label: "This week", bit: 2 },
  { label: "Later", bit: 3 },
] as const;
const stamp = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
function readBrowseContext(): BrowseContext | null {
  try {
    const context = parseBrowseContext(
      sessionStorage.getItem(browseKey),
      Date.now(),
    );
    sessionStorage.removeItem(browseKey);
    return context;
  } catch {
    return null;
  }
}
export function SavedDiscovery({ token }: { token: string }) {
  const router = useRouter();
  const [bounds, setBounds] = useState<Bounds | null>(UNC_BOUNDS);
  const [filters, setFilters] = useState<SavedFilter>({
    time: "1111" as PeriodMask,
    joining: "any",
  });
  const [items, setItems] = useState<SavedPin[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "denied">(
    "loading",
  );
  const [truncated, setTruncated] = useState(false);
  const [rankingMode, setRankingMode] = useState<
    "small_first" | "chronological" | null
  >(null);
  const [refresh, setRefresh] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");
  const [joining, setJoining] = useState(false);
  const [anchor, setAnchor] = useState({ left: 0, top: 0 });
  const [concealed, setConcealed] = useState(false);
  const generation = useRef(0);
  const previewGeneration = useRef(0);
  const request = useRef<AbortController | null>(null);
  const activeRef = useRef<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const wantFocus = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewTitle = useRef<HTMLHeadingElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocus = useRef(false);
  const dismissedTrigger = useRef<HTMLElement | null>(null);
  const overTrigger = useRef(false);
  const overPreview = useRef(false);
  const concealedRef = useRef(false);
  const authPending = useRef(new Set<string>());
  const listTitle = useRef<HTMLHeadingElement>(null);
  const returnScroll = useRef<number | null>(null);
  const [mapSettled, setMapSettled] = useState(false);
  const onMapSettled = useCallback(() => setMapSettled(true), []);
  function closePreview(returnFocus = false) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    if (returnFocus) dismissedTrigger.current = trigger.current;
    request.current?.abort();
    previewGeneration.current++;
    activeRef.current = null;
    setActive(null);
    setPreview(null);
    setPreviewError(false);
    setJoinMessage("");
    setJoining(false);
    wantFocus.current = false;
    overTrigger.current = false;
    overPreview.current = false;
    if (returnFocus && trigger.current?.isConnected) {
      suppressFocus.current = true;
      trigger.current.focus();
      requestAnimationFrame(() => {
        suppressFocus.current = false;
      });
    }
  }
  function deferClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      if (
        !overTrigger.current &&
        !overPreview.current &&
        !previewRef.current?.contains(document.activeElement) &&
        !trigger.current?.contains(document.activeElement)
      )
        closePreview();
    }, 360);
  }
  function leaveTrigger(element: HTMLElement) {
    if (dismissedTrigger.current === element) dismissedTrigger.current = null;
    if (trigger.current !== element) return;
    overTrigger.current = false;
    deferClose();
  }
  function show(
    id: string,
    element: HTMLElement,
    moveFocus = false,
    pointerOver = false,
    explicitActivation = false,
  ) {
    if (concealedRef.current) return;
    if (dismissedTrigger.current === element) {
      if (!explicitActivation) return;
      dismissedTrigger.current = null;
    }
    if (suppressFocus.current && !explicitActivation) {
      suppressFocus.current = false;
      return;
    }
    suppressFocus.current = false;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    if (trigger.current !== element) overPreview.current = false;
    overTrigger.current = pointerOver;
    trigger.current = element;
    const frame = element.closest(".saved-map-frame") as HTMLElement | null;
    const rect = element.getBoundingClientRect();
    const box = frame?.getBoundingClientRect();
    if (box) {
      const cardWidth = Math.min(374, box.width - 24);
      const right = rect.right - box.left + 8;
      const left = rect.left - box.left - cardWidth - 8;
      const horizontal =
        right + cardWidth + 12 <= box.width
          ? right
          : left >= 12
            ? left
            : Math.max(12, Math.min(right, box.width - cardWidth - 12));
      setAnchor({
        left: horizontal,
        top: Math.max(12, Math.min(rect.top - box.top - 24, box.height - 390)),
      });
    } else if (moveFocus) {
      setAnchor({ left: 16, top: 110 });
      document
        .querySelector(".saved-map-frame")
        ?.scrollIntoView({ block: "center" });
    }
    if (activeRef.current === id) {
      if (moveFocus) {
        wantFocus.current = true;
        previewTitle.current?.focus();
      }
      return;
    }
    request.current?.abort();
    const seq = ++previewGeneration.current;
    const controller = new AbortController();
    request.current = controller;
    activeRef.current = id;
    wantFocus.current = moveFocus;
    setActive(id);
    setPreview(null);
    setPreviewError(false);
    setJoinMessage("");
    void fetch(`/api/calendar/${id}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<Preview>;
      })
      .then((data) => {
        if (data.kind !== "ok" || data.id !== id)
          throw new Error("unavailable");
        if (
          !controller.signal.aborted &&
          seq === previewGeneration.current &&
          activeRef.current === id
        ) {
          setPreview(data);
          if (wantFocus.current)
            requestAnimationFrame(() => {
              if (seq === previewGeneration.current)
                previewTitle.current?.focus();
            });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted && seq === previewGeneration.current) {
          // A fresh source denial can invalidate earlier pin/list rows too.
          // Conceal the entire view before requesting it anew.
          concealedRef.current = true;
          generation.current++;
          closePreview();
          setItems([]);
          setStatus("loading");
          setConcealed(true);
          window.location.reload();
        }
      });
  }
  const showRef = useRef(show);
  useEffect(() => {
    showRef.current = show;
  });
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = readBrowseContext();
      if (!context) return;
      returnScroll.current = context.scrollY;
      setFilters(restoredSavedFilters(context));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!mapSettled || status !== "ok" || returnScroll.current === null) return;
    const y = returnScroll.current;
    returnScroll.current = null;
    const frame = requestAnimationFrame(() => {
      listTitle.current?.focus({ preventScroll: true });
      window.scrollTo({ top: y, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [status, items, mapSettled]);
  function rememberBrowseContext() {
    try {
      sessionStorage.setItem(
        browseKey,
        JSON.stringify({
          time: filters.time,
          joining: "any",
          scrollY: window.scrollY,
          savedAt: Date.now(),
        } satisfies BrowseContext),
      );
    } catch {
      /* Navigation still works without storage. */
    }
  }
  const onBounds = useCallback((value: Bounds | null) => {
    generation.current++;
    setBounds(value);
    setStatus(value ? "loading" : "ok");
    setItems([]);
    setTruncated(false);
    setRankingMode(null);
    request.current?.abort();
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    trigger.current = null;
    dismissedTrigger.current = null;
    overTrigger.current = false;
    overPreview.current = false;
    previewGeneration.current++;
    activeRef.current = null;
    setActive(null);
    setPreview(null);
    setPreviewError(false);
    setJoinMessage("");
    setJoining(false);
  }, []);
  useEffect(() => {
    const seq = ++generation.current;
    if (!bounds || concealedRef.current) return;
    void searchSaved(bounds, filters)
      .then((result) => {
        if (generation.current !== seq || concealedRef.current) return;
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
      })
      .catch(() => {
        if (generation.current === seq && !concealedRef.current) {
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
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden && !concealedRef.current) {
        closePreview();
        setStatus("loading");
        setRefresh((value) => value + 1);
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && activeRef.current) closePreview(true);
    };
    const conceal = () => {
      concealedRef.current = true;
      generation.current++;
      closePreview();
      setItems([]);
      setStatus("loading");
      setConcealed(true);
    };
    const auth = (message: AuthTransitionMessage) => {
      const mayReload = calendarAuthMayReload(authPending.current, message);
      conceal();
      if (mayReload && !document.hidden) window.location.reload();
    };
    const localAuth = (event: Event) =>
      auth((event as CustomEvent<AuthTransitionMessage>).detail);
    const photoInvalidated = () => {
      if (concealedRef.current || authPending.current.size || document.hidden)
        return;
      const id = activeRef.current;
      const element = trigger.current;
      if (!id || !element?.isConnected) return;
      const restoreFocus = !!previewRef.current?.contains(
        document.activeElement,
      );
      closePreview();
      showRef.current(id, element, restoreFocus, element.matches(":hover"));
    };
    const visibility = () => {
      if (document.hidden) conceal();
      else if (concealedRef.current && !authPending.current.size)
        window.location.reload();
    };
    const pageshow = () => {
      if (concealedRef.current && !document.hidden && !authPending.current.size)
        window.location.reload();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener(AUTH_TRANSITION_EVENT, localAuth);
    window.addEventListener("pals-photo-invalidated", photoInvalidated);
    window.addEventListener("pagehide", conceal);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
        auth(event.data);
    } catch {
      /* Local transition and lifecycle events still conceal. */
    }
    let photoChannel: BroadcastChannel | null = null;
    try {
      photoChannel = new BroadcastChannel("pals-photo-invalidated");
      photoChannel.onmessage = photoInvalidated;
    } catch {
      /* Local photo invalidation still refreshes the preview. */
    }
    if (document.hidden) conceal();
    const currentGeneration = generation;
    const currentRequest = request;
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener(AUTH_TRANSITION_EVENT, localAuth);
      window.removeEventListener("pals-photo-invalidated", photoInvalidated);
      window.removeEventListener("pagehide", conceal);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
      channel?.close();
      photoChannel?.close();
      currentGeneration.current++;
      currentRequest.current?.abort();
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);
  function changeMask(bit: number) {
    if (!validPeriodMask(filters.time)) return;
    const next = filters.time.split("");
    next[bit] = next[bit] === "1" ? "0" : "1";
    const mask = next.join("");
    if (!validPeriodMask(mask)) return;
    returnScroll.current = null;
    closePreview();
    setItems([]);
    setStatus("loading");
    setFilters((value) => ({ ...value, time: mask }));
    try {
      sessionStorage.removeItem(browseKey);
    } catch {}
  }
  async function join() {
    if (!preview?.canJoin || joining) return;
    const id = preview.id;
    const seq = previewGeneration.current;
    setJoining(true);
    setJoinMessage("");
    try {
      const result = await changeSavedMembership(id, "join");
      if (seq !== previewGeneration.current || concealedRef.current) return;
      setJoining(false);
      if (result.kind === "saved") {
        closePreview();
        setStatus("loading");
        setRefresh((value) => value + 1);
        router.refresh();
      } else {
        setJoinMessage(result.message);
        setPreview(null);
        setPreviewError(true);
      }
    } catch {
      if (seq !== previewGeneration.current || concealedRef.current) return;
      setJoining(false);
      setJoinMessage(
        "Outcome uncertain. Reload this Hangout before trying again.",
      );
      setPreview(null);
      setPreviewError(true);
    }
  }
  const count = items.length;
  return (
    <>
      <AnalyticsView
        event="hangout_map_viewed"
        ready={status === "ok" && !!bounds && !concealed}
      />
      <SavedMap
        token={token}
        items={concealed ? [] : items}
        selected={active}
        onSelect={show}
        onLeave={leaveTrigger}
        onBounds={onBounds}
        onSettled={onMapSettled}
      >
        <Link
          className="saved-create"
          href="/hangouts/new"
          aria-label="Create Hangout"
          title="Create Hangout"
        >
          <PlusIcon size={24} weight="bold" aria-hidden="true" />
        </Link>
        <fieldset className="saved-periods" disabled={concealed}>
          <legend className="sr-only">When are you free?</legend>
          {periods.map(({ label, bit }) => (
            <label key={bit}>
              <input
                type="checkbox"
                checked={
                  validPeriodMask(filters.time) && filters.time[bit] === "1"
                }
                onChange={() => changeMask(bit)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        {active && !concealed && (
          <div
            className="saved-map-preview"
            ref={previewRef}
            tabIndex={-1}
            style={{ left: anchor.left, top: anchor.top }}
            onPointerEnter={() => {
              overPreview.current = true;
              if (closeTimer.current) clearTimeout(closeTimer.current);
            }}
            onPointerLeave={() => {
              overPreview.current = false;
              deferClose();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                closePreview(true);
              }
            }}
          >
            <button
              className="saved-preview-close"
              type="button"
              onClick={() => closePreview(true)}
              aria-label="Close Hangout preview"
            >
              ×
            </button>
            {preview ? (
              <>
                <h2 ref={previewTitle} tabIndex={-1}>
                  {preview.title}
                </h2>
                <div className="saved-preview-hosts">
                  {preview.people
                    .filter(
                      (person) =>
                        person.role === "host" || person.role === "cohost",
                    )
                    .slice(0, 2)
                    .map((person, index) => (
                      <div key={index} className="saved-preview-person">
                        {person.photo ? (
                          <Image
                            src={person.photo}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                          />
                        ) : (
                          <span
                            className="saved-preview-avatar"
                            aria-hidden="true"
                          >
                            {person.name?.slice(0, 1) ?? "P"}
                          </span>
                        )}
                        <span>
                          <strong>{person.name ?? "Pal"}</strong>
                          <small>
                            {person.role === "host" ? "Host" : "Co-host"}
                          </small>
                        </span>
                      </div>
                    ))}
                </div>
                {preview.people.some(
                  (person) => person.role === "participant",
                ) && (
                  <div className="saved-preview-attending">
                    <strong>Pals attending</strong>
                    <div>
                      {preview.people
                        .filter((person) => person.role === "participant")
                        .slice(0, 5)
                        .map((person, index) =>
                          person.photo ? (
                            <Image
                              key={index}
                              src={person.photo}
                              alt={person.name ?? "Attendee"}
                              width={36}
                              height={36}
                              unoptimized
                            />
                          ) : (
                            <span
                              key={index}
                              className="saved-preview-avatar"
                              title={person.name ?? "Pal"}
                            >
                              {person.name?.slice(0, 1) ?? "P"}
                            </span>
                          ),
                        )}
                      {(preview.rosterPageAtLimit ||
                        preview.people.filter(
                          (person) => person.role === "participant",
                        ).length > 5) && (
                        <Link
                          href={`/hangouts/saved/${preview.id}`}
                          onClick={rememberBrowseContext}
                        >
                          View attendees
                        </Link>
                      )}
                    </div>
                  </div>
                )}
                <div className="saved-preview-facts">
                  <p>
                    ▣{" "}
                    <span>
                      {stamp(preview.startsAt)}
                      {preview.endsAt ? `–${stamp(preview.endsAt)}` : ""}
                    </span>
                  </p>
                  <p>
                    ⌖{" "}
                    <span>
                      {preview.publicPlace}
                      <small>Approximate public area</small>
                    </span>
                  </p>
                </div>
                {preview.description && (
                  <p className="saved-preview-description">
                    {preview.description}
                  </p>
                )}
                <div className="saved-preview-actions">
                  <Link
                    href={`/hangouts/saved/${preview.id}`}
                    onClick={rememberBrowseContext}
                  >
                    View Hangout
                  </Link>
                  {preview.canJoin && (
                    <button
                      type="button"
                      disabled={joining}
                      onClick={() => void join()}
                    >
                      {joining ? "Joining…" : "Join"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p role="status">
                {previewError
                  ? "Preview unavailable. Open the Hangout to check current access."
                  : "Checking current Hangout access…"}
              </p>
            )}
            {joinMessage && <p role="status">{joinMessage}</p>}
          </div>
        )}
      </SavedMap>
      <div className="saved-results-heading">
        <div>
          <h2 ref={listTitle} tabIndex={-1}>
            Hangouts in this area
          </h2>
          {(concealed || status !== "ok" || !bounds) && (
            <p role="status" aria-live="polite">
              {concealed
                ? "Checking current access…"
                : status === "loading"
                  ? "Loading Hangouts…"
                  : status === "error"
                    ? "Hangouts couldn't load. Try refreshing."
                    : status === "denied"
                      ? "Hangout access is unavailable. Reload after checking your account."
                      : "Move the map back toward UNC to see Hangouts."}
            </p>
          )}
        </div>
      </div>
      {status === "ok" && truncated && (
        <p className="saved-limit" role="status">
          Showing the first 100{" "}
          {rankingMode === "small_first"
            ? "with smaller groups first"
            : "by scheduled start"}
          . Zoom in or select fewer periods to see more.
        </p>
      )}
      {status === "ok" && count === 0 && (
        <div className="saved-empty">
          <h3>
            {filters.time === "0000"
              ? "Choose a time period"
              : "No Hangouts here yet"}
          </h3>
          <p>
            {filters.time === "0000"
              ? "Select at least one period to see upcoming Hangouts."
              : "Try another area or time period, or create a Hangout."}
          </p>
        </div>
      )}
      {status === "error" && (
        <button
          className="quiet-button"
          onClick={() => {
            setStatus("loading");
            setRefresh((value) => value + 1);
          }}
        >
          Try again
        </button>
      )}
      {count > 0 && (
        <ul className="saved-result-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={(event) => show(item.id, event.currentTarget, true)}
                onFocus={(event) => show(item.id, event.currentTarget)}
              >
                <span aria-hidden="true">{pinCue(item)}</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {stamp(item.starts_at)} · {item.public_place}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
