"use client";

import { useState } from "react";
import type { RichProfilePreference } from "@pals/types";
import { setRichProfileSharing } from "../actions";

export function RichPrivacyControls({
  initial,
  canOptIn,
}: {
  initial: RichProfilePreference;
  canOptIn: boolean;
}) {
  const [preference, setPreference] = useState(initial);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function change() {
    setBusy(true);
    setMessage("Checking your latest rich sharing choice…");
    try {
      const result = await setRichProfileSharing(
        !preference.opted_in,
        preference.revision,
      );
      if (result.preference) {
        setPreference(result.preference);
        setUnderstood(false);
      }
      setMessage(result.message);
    } catch {
      setMessage(
        "We could not confirm your rich sharing choice. Reload before trying again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="privacy-toggle">
      <p role="status">
        <strong>
          Stored rich sharing choice: {preference.opted_in ? "On" : "Off"}
        </strong>
      </p>
      {!preference.opted_in && canOptIn && (
        <label className="rich-privacy-confirm">
          <input
            type="checkbox"
            checked={understood}
            disabled={busy}
            onChange={(event) => setUnderstood(event.target.checked)}
          />{" "}
          I have reviewed the preview and understand future edits and selected
          photo replacements will be shared while this choice is on.
        </label>
      )}
      <p>
        <button
          type="button"
          className="button"
          disabled={
            busy || (!preference.opted_in && (!canOptIn || !understood))
          }
          onClick={change}
        >
          {busy
            ? "Checking…"
            : preference.opted_in
              ? "Turn rich sharing off"
              : "Turn rich sharing on"}
        </button>
      </p>
      <p role="status">{message}</p>
    </div>
  );
}
