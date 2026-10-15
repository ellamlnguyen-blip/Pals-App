# ADR-0041 — Notification bell attention

Status: Proposed (disposable-local candidate only; not hosted authorization)

Context: Ella requests a bell with a red dot that clears after opening Notifications, plus envelope/header and inbox display cleanup. Existing owner-only notification ledger already stores read_at; the accepted per-item reader remains compatible.

Proposal: Add owner-gated summary and snapshot acknowledgment RPCs over the existing ledger/read_at, via a new committed migration. Summary returns only caller-owned unread boolean and a server timestamp boundary. Successful inbox display acknowledges through that boundary; concurrent later arrivals remain unread. Follow existing gate/recipient-lock order and READ COMMITTED active-account checks, auth-bound no-store web APIs, lifecycle concealment and poll/focus refresh. No new tables, browser-persisted owner data, source disclosures, platforms or changed preference rules. A failed load/ack does not falsely clear the dot. Retain hidden accessible title and labeled icon controls.

Scope: isolated local implementation and verification. Hosted migration/application release and accepted application-main integration remain behind existing parent review and Ella sign-off gates. This Proposed record does not accept itself or waive any release gate.
