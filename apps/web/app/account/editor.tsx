"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveAccountName,
  changeAccountEmail,
  changeAccountPassword,
  requestPasswordCode,
  type AccountResult,
} from "./actions";

function Feedback({ result }: { result: AccountResult }) {
  return result.error ? (
    <p className="account-feedback error" role="alert">
      {result.error}
    </p>
  ) : result.success ? (
    <p className="account-feedback success" role="status">
      {result.success}
    </p>
  ) : null;
}

export function AccountEditor({
  name,
  revision,
  currentEmail,
  pendingEmail,
}: {
  name: string;
  revision: number;
  currentEmail: string;
  pendingEmail: string | null;
}) {
  const router = useRouter();
  const [draftName, setDraftName] = useState(name);
  const [nameRevision, setNameRevision] = useState(revision);
  const [draftEmail, setDraftEmail] = useState("");
  const [nameResult, setNameResult] = useState<AccountResult>({});
  const [emailResult, setEmailResult] = useState<AccountResult>({});
  const [passwordResult, setPasswordResult] = useState<AccountResult>({});
  const [namePending, startName] = useTransition();
  const [emailPending, startEmail] = useTransition();
  const [passwordPending, startPassword] = useTransition();
  const [codePending, startCode] = useTransition();
  const emailForm = useRef<HTMLFormElement>(null);
  const passwordForm = useRef<HTMLFormElement>(null);

  function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData();
    form.set("real_name", draftName);
    form.set("revision", String(nameRevision));
    setNameResult({});
    startName(async () => {
      try {
        const result = await saveAccountName(form);
        setNameResult(result);
        if (result.revision !== undefined) setNameRevision(result.revision);
        if (result.success) router.refresh();
      } catch {
        setNameResult({
          error: "We couldn’t save your name. Your draft is still here.",
        });
      }
    });
  }

  function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setEmailResult({});
    startEmail(async () => {
      try {
        const result = await changeAccountEmail(form);
        setEmailResult(result);
        if (result.success) {
          setDraftEmail("");
          router.refresh();
        }
      } catch {
        setEmailResult({
          error: "We couldn’t request that email change. Try again.",
        });
      } finally {
        emailForm.current?.reset();
      }
    });
  }

  function sendPasswordCode() {
    setPasswordResult({});
    startCode(async () => {
      try {
        setPasswordResult(await requestPasswordCode());
      } catch {
        setPasswordResult({
          error: "We couldn’t send a reauthentication code. Try again.",
        });
      }
    });
  }

  function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPasswordResult({});
    startPassword(async () => {
      try {
        setPasswordResult(await changeAccountPassword(form));
      } catch {
        setPasswordResult({
          error: "We couldn’t change your password. Try again.",
        });
      } finally {
        passwordForm.current?.reset();
      }
    });
  }

  return (
    <div className="account-sections">
      <section className="account-section" aria-labelledby="account-name-title">
        <h2 id="account-name-title">Your name</h2>
        <p>Shown on your profile and Hangouts.</p>
        <form onSubmit={submitName}>
          <label htmlFor="account-real-name">Real name</label>
          <input
            id="account-real-name"
            autoComplete="name"
            required
            maxLength={100}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            disabled={namePending}
          />
          <Feedback result={nameResult} />
          <button disabled={namePending} type="submit">
            {namePending ? "Saving…" : "Save name"}
          </button>
        </form>
      </section>

      <section
        className="account-section"
        aria-labelledby="account-email-title"
      >
        <h2 id="account-email-title">Sign-in email</h2>
        <p className="account-email-fact">
          <strong>Current email</strong>
          <span>{currentEmail}</span>
        </p>
        {pendingEmail && pendingEmail !== currentEmail && (
          <p className="account-email-fact pending">
            <strong>Awaiting confirmation</strong>
            <span>{pendingEmail}</span>
          </p>
        )}
        <p>
          Use an approved UNC address. Your new address needs confirmation
          before it can be used for verified access. Your provider may also ask
          you to confirm the current address.
        </p>
        <form ref={emailForm} onSubmit={submitEmail}>
          <label htmlFor="account-new-email">New UNC email</label>
          <input
            id="account-new-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            disabled={emailPending}
          />
          <label htmlFor="account-email-password">Current password</label>
          <input
            id="account-email-password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            disabled={emailPending}
          />
          <Feedback result={emailResult} />
          <button disabled={emailPending} type="submit">
            {emailPending ? "Requesting…" : "Request email change"}
          </button>
        </form>
      </section>

      <section
        className="account-section"
        aria-labelledby="account-password-title"
      >
        <h2 id="account-password-title">Password</h2>
        <p>
          Choose at least 12 characters. Some accounts may receive a six-digit
          reauthentication code by email.
        </p>
        <form ref={passwordForm} onSubmit={submitPassword}>
          <label htmlFor="account-current-password">Current password</label>
          <input
            id="account-current-password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            disabled={passwordPending}
          />
          <label htmlFor="account-new-password">New password</label>
          <input
            id="account-new-password"
            name="new_password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={passwordPending}
          />
          <label htmlFor="account-confirm-password">Confirm new password</label>
          <input
            id="account-confirm-password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            disabled={passwordPending}
          />
          <label htmlFor="account-password-nonce">
            Reauthentication code, if received
          </label>
          <input
            id="account-password-nonce"
            name="nonce"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            autoComplete="one-time-code"
            disabled={passwordPending}
          />
          <button
            className="account-code-button"
            type="button"
            onClick={sendPasswordCode}
            disabled={codePending || passwordPending}
          >
            {codePending ? "Sending…" : "Send a code"}
          </button>
          <Feedback result={passwordResult} />
          <button disabled={passwordPending} type="submit">
            {passwordPending ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
