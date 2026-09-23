"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setPeopleVisibility, unblockPerson } from "../actions";

export function PrivacyControls({
  initial,
  ready,
}: {
  initial: boolean;
  ready: boolean;
}) {
  const [on, setOn] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="privacy-toggle">
      <p role="status">
        <strong>Stored sharing choice: {on ? "On" : "Off"}</strong>
      </p>
      <button
        type="button"
        className="button"
        disabled={busy || (!on && !ready)}
        onClick={async () => {
          setBusy(true);
          setMessage("Checking your latest sharing choice…");
          try {
            const result = await setPeopleVisibility(!on);
            if (result.state === "on" || result.state === "off")
              setOn(result.state === "on");
            setMessage(result.message);
            router.refresh();
          } catch {
            setMessage(
              "We could not confirm your sharing choice. Reload to check before trying again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Checking…" : on ? "Turn sharing off" : "Turn sharing on"}
      </button>
      <p role="status">{message}</p>
    </div>
  );
}

export function Unblock({ id }: { id: string }) {
  const dialog = useRef<HTMLDialogElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <div className="unblock-control">
      <button
        ref={trigger}
        className="text-button"
        onClick={() => dialog.current?.showModal()}
      >
        Unblock ID
      </button>
      <dialog
        ref={dialog}
        onClose={() => {
          setTyped("");
          trigger.current?.focus();
        }}
        aria-labelledby={`unblock-${id}`}
      >
        <h3 id={`unblock-${id}`}>Unblock this account ID?</h3>
        <p>
          <code>{id}</code>
        </p>
        <p>
          Removing your block may allow future People and Hangout access under
          the usual rules. It does not restore past friendship, direct chat or
          Hangout attendance.
        </p>
        <label>
          Type the full ID to confirm
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
          />
        </label>
        <div className="people-dialog-actions">
          <button
            className="button"
            disabled={busy || typed !== id}
            onClick={async () => {
              setBusy(true);
              setMessage("Checking latest outbound blocks…");
              try {
                const result = await unblockPerson(id);
                setMessage(result.message);
                dialog.current?.close();
                router.refresh();
              } catch {
                setMessage(
                  "We could not confirm the unblock. Reload the list before another action.",
                );
                dialog.current?.close();
              } finally {
                setBusy(false);
              }
            }}
          >
            Unblock this ID
          </button>
          <button
            className="text-button"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </div>
      </dialog>
      <span role="status">{message}</span>
    </div>
  );
}
