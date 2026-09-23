"use client";
import { useRef, useState } from "react";
import { blockPerson } from "../actions";
import { blockReviewOutcome } from "../../../lib/relationship-block-outcome";

export function KnownRelationshipBlock() {
  const [id, setId] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [outcome, setOutcome] = useState<"ready" | "unknown" | "confirmed">(
    "ready",
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const valid =
    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
  return (
    <section className="people-panel">
      <h2>Block a current relationship by ID</h2>
      <p>
        If that person is no longer visible in People, use their full account ID
        from your current relationship. The database checks current
        participation.
      </p>
      <label>
        Account ID{" "}
        <input
          value={id}
          onChange={(event) => setId(event.target.value.trim())}
          autoComplete="off"
        />
      </label>
      <button
        ref={trigger}
        className="text-button"
        disabled={!valid || busy || outcome !== "ready"}
        onClick={() => dialog.current?.showModal()}
      >
        Review block
      </button>
      <p role="status">{message}</p>
      {outcome !== "ready" && (
        <p>
          {/* Full navigation rechecks live access after an uncertain block. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/people/friends">Reload current access</a> ·{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/people/privacy">Check outbound blocked IDs</a>
        </p>
      )}
      <dialog
        ref={dialog}
        onClose={() => {
          setTyped("");
          trigger.current?.focus();
        }}
        aria-labelledby="known-block-title"
      >
        <h3 id="known-block-title">Block this account ID in People?</h3>
        <p>
          <code>{id}</code>
        </p>
        <p>
          Blocking ends any current request or friendship and People visibility,
          even if friendship status cannot be checked. Existing Hangout
          participation and private instructions do not change.
        </p>
        <label>
          Type the full ID to confirm{" "}
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="people-dialog-actions">
          <button
            className="button"
            disabled={typed !== id || busy}
            onClick={async () => {
              dialog.current?.close();
              setBusy(true);
              setMessage("Checking outbound block status…");
              try {
                const result = await blockPerson(id);
                setMessage(result.message);
                setOutcome(blockReviewOutcome(result.state));
              } catch {
                setMessage(
                  "Block outcome unknown. Reload outbound blocked IDs before another action.",
                );
                setOutcome("unknown");
              } finally {
                setBusy(false);
              }
            }}
          >
            Block in People
          </button>
          <button
            className="text-button"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </section>
  );
}
