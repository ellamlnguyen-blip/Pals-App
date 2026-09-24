"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { setPeopleVisibility } from "../actions";

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
