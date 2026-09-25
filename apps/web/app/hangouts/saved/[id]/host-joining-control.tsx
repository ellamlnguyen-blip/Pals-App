"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { changeSavedJoining } from "../actions";

const AccessLoss = createContext<{
  deny: () => void;
  hidePrivate: () => void;
  privateHidden: boolean;
}>({ deny: () => {}, hidePrivate: () => {}, privateHidden: false });
export function useDetailAccess() {
  return useContext(AccessLoss);
}
export function PrivateDetail({ children }: { children: ReactNode }) {
  const { privateHidden } = useDetailAccess();
  return privateHidden ? null : <>{children}</>;
}

export function HostDetailBoundary({ children }: { children: ReactNode }) {
  const [masked, setMasked] = useState(false);
  const [privateHidden, setPrivateHidden] = useState(false);
  function deny() {
    // A server refresh may be delayed. Remove the mounted source and private
    // details synchronously before leaving the page after an access loss.
    flushSync(() => setMasked(true));
    window.location.replace("/hangouts/saved");
  }
  if (masked)
    return (
      <div className="saved-detail" role="status">
        <h1>Hangout access unavailable</h1>
        <p>Reload after checking your account.</p>
      </div>
    );
  return (
    <AccessLoss.Provider
      value={{
        deny,
        hidePrivate: () => flushSync(() => setPrivateHidden(true)),
        privateHidden,
      }}
    >
      {children}
    </AccessLoss.Provider>
  );
}

export function HostJoiningControl({
  id,
  revision,
  joining,
  largeState,
}: {
  id: string;
  revision: number;
  joining: string;
  largeState: "large" | "small" | "unavailable" | null;
}) {
  const router = useRouter();
  const { deny } = useDetailAccess();
  const [pending, startTransition] = useTransition();
  const [needsReload, setNeedsReload] = useState(false);
  const [message, setMessage] = useState("");
  const status = useRef<HTMLParagraphElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const lastRevision = useRef(revision);
  const desired = joining === "open" ? "closed" : "open";
  const focusKey = `pals-host-joining-focus:${id}`;

  useEffect(() => {
    let requested = false;
    try {
      requested = window.sessionStorage.getItem(focusKey) === String(revision);
      if (requested) window.sessionStorage.removeItem(focusKey);
    } catch {
      // Focus still follows an in-place revision update without storage.
    }
    if (lastRevision.current === revision && !requested) return;
    lastRevision.current = revision;
    setNeedsReload(false);
    setMessage("");
    // Next's route refresh can move focus after this effect runs.
    const focusTimer = window.setTimeout(() => button.current?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [focusKey, revision]);
  useEffect(() => {
    if (message) status.current?.focus();
  }, [message]);

  return (
    <section
      className="saved-host-joining"
      aria-labelledby="saved-host-joining-title"
    >
      <h2 id="saved-host-joining-title">Joining</h2>
      {largeState === "large" && (
        <p className="saved-host-warning">
          This Hangout has a large group. Check that the meeting place works for
          everyone. You can close joining while you coordinate.
        </p>
      )}
      {largeState === "unavailable" && (
        <p className="saved-action-note">Group size unavailable right now.</p>
      )}
      <p className="saved-host-current" role="status" aria-live="polite">
        {joining === "open" ? "Joining open" : "Joining closed"}
      </p>
      <p className="help">Closing joining keeps current members joined.</p>
      <button
        ref={button}
        type="button"
        className="button"
        disabled={pending || needsReload}
        onClick={() => {
          setMessage("");
          setNeedsReload(true);
          startTransition(async () => {
            try {
              const result = await changeSavedJoining(id, revision, desired);
              if (result.kind === "denied") {
                deny();
                return;
              }
              setMessage(result.message);
              if (result.kind === "saved") {
                try {
                  window.sessionStorage.setItem(focusKey, String(revision + 1));
                } catch {
                  // The status remains available if storage is disabled.
                }
                router.refresh();
              }
            } catch {
              setMessage(
                "We could not verify the outcome. Reload this Hangout before trying again.",
              );
            }
          });
        }}
      >
        {pending
          ? "Checking…"
          : desired === "closed"
            ? "Close joining"
            : "Reopen joining"}
      </button>
      {message && (
        <p
          ref={status}
          tabIndex={-1}
          role="status"
          className="saved-action-note"
        >
          {message}{" "}
          {needsReload && (
            <button
              type="button"
              className="text-button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          )}
        </p>
      )}
    </section>
  );
}
