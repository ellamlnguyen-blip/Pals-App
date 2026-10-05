"use client";

import { useState } from "react";
import { POLICY_KEYS, policyTarget, type PolicyIntent, type PolicyKey } from "../lib/policy";

type Receipt = { key: PolicyKey; enabled: boolean; revision: number; requestId: string };

export default function PolicyPanel({ onDenied }: { onDenied: () => void }) {
  const [key, setKey] = useState<PolicyKey>("availability");
  const [enabled, setEnabled] = useState(false);
  const [revision, setRevision] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<PolicyIntent | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(intent: PolicyIntent) {
    setPending(intent);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent),
        credentials: "same-origin",
        cache: "no-store",
      });
      if (response.status === 403) { onDenied(); return; }
      if (!response.ok) throw new Error("Uncertain");
      const result = await response.json() as Receipt;
      if (result.requestId !== intent.requestId || result.key !== intent.key || result.enabled !== intent.enabled || !Number.isSafeInteger(result.revision)) throw new Error("Uncertain");
      setPending(null);
      setReceipt(result);
      setConfirmed(false);
      setRevision("");
      setReason("");
      setMessage("Policy request recorded. Verify the current state in the read-only preflight before another change.");
    } catch {
      setMessage("Outcome unconfirmed. Reconcile this request ID against the audit before retrying the exact same request.");
    } finally {
      setBusy(false);
    }
  }

  function prepare(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !confirmed || !Number.isSafeInteger(Number(revision)) || Number(revision) < 1 ||
      !reason.trim() || [...reason.trim()].length > 2000) return;
    setReceipt(null);
    void submit({ key, enabled, revision: Number(revision), reason: reason.trim(),
      requestId: crypto.randomUUID(), confirmTarget: policyTarget(key, enabled) });
  }

  return (
    <section className="policy-panel" aria-labelledby="policy-heading">
      <p className="eyebrow">Launch policy</p>
      <h2 id="policy-heading">Change one gate</h2>
      <p>Use the current revision from the separately reviewed, read-only staging preflight. Enable capabilities before availability. Disable availability first when closing access.</p>
      <form onSubmit={prepare}>
        <label>Gate
          <select value={key} disabled={busy || !!pending} onChange={(event) => { setKey(event.target.value as PolicyKey); setConfirmed(false); }}>
            {POLICY_KEYS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label>Desired state
          <select value={enabled ? "on" : "off"} disabled={busy || !!pending} onChange={(event) => { setEnabled(event.target.value === "on"); setConfirmed(false); }}>
            <option value="off">Off</option><option value="on">On</option>
          </select>
        </label>
        <label>Current revision from preflight
          <input type="number" min="1" step="1" inputMode="numeric" required value={revision} disabled={busy || !!pending}
            onChange={(event) => { setRevision(event.target.value); setConfirmed(false); }} />
        </label>
        <label>Reason
          <textarea required maxLength={2000} rows={3} value={reason} disabled={busy || !!pending}
            onChange={(event) => { setReason(event.target.value); setConfirmed(false); }} />
        </label>
        <label className="policy-confirm">
          <input type="checkbox" checked={confirmed} disabled={busy || !!pending}
            onChange={(event) => setConfirmed(event.target.checked)} />
          <span>I confirm <strong>{policyTarget(key, enabled)}</strong> at current revision <strong>{revision || "not entered"}</strong>.</span>
        </label>
        <button disabled={busy || !!pending || !confirmed}>{busy ? "Recording…" : "Record this change"}</button>
      </form>
      {pending && <div className="retry" role="status">
        <strong>Outcome unconfirmed</strong>
        <p>Request {pending.requestId} · {policyTarget(pending.key, pending.enabled)} · revision {pending.revision}</p>
        <button disabled={busy} onClick={() => void submit(pending)}>Retry exact request</button>
      </div>}
      {receipt && <div className="policy-receipt" role="status">
        <strong>Recorded</strong>
        <p>{policyTarget(receipt.key, receipt.enabled)} · revision {receipt.revision}<br />Request {receipt.requestId}</p>
      </div>}
      {message && <p className="message" role="status">{message}</p>}
    </section>
  );
}
