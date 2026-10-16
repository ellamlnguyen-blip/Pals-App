"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../auth-transition";
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
  const content = useRef<HTMLDivElement>(null);
  const concealedRef = useRef(false);
  const actionEpoch = useRef(0);
  const pendingAuth = useRef(new Set<string>());
  const [concealed, setConcealed] = useState(false);

  useEffect(() => {
    const conceal = () => {
      actionEpoch.current += 1;
      concealedRef.current = true;
      if (content.current) content.current.style.display = "none";
      emailForm.current?.reset();
      passwordForm.current?.reset();
      setDraftName("");
      setDraftEmail("");
      setNameResult({});
      setEmailResult({});
      setPasswordResult({});
      setConcealed(true);
    };
    const auth = (message: AuthTransitionMessage) => {
      conceal();
      if (message.phase === "begin") pendingAuth.current.add(message.token);
      else if (message.phase !== "revalidate")
        pendingAuth.current.delete(message.token);
      if (
        !document.hidden &&
        !pendingAuth.current.size &&
        message.phase !== "begin"
      )
        window.location.reload();
    };
    const localAuth = (event: Event) =>
      auth((event as CustomEvent<AuthTransitionMessage>).detail);
    const visibility = () => {
      if (document.hidden) conceal();
      else if (concealedRef.current && !pendingAuth.current.size)
        window.location.reload();
    };
    const pageshow = () => {
      if (concealedRef.current && !document.hidden && !pendingAuth.current.size)
        window.location.reload();
    };
    window.addEventListener(AUTH_TRANSITION_EVENT, localAuth);
    window.addEventListener("pagehide", conceal);
    window.addEventListener("pageshow", pageshow);
    document.addEventListener("visibilitychange", visibility);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
        auth(event.data);
    } catch {
      // Local transitions and page lifecycle still conceal this editor.
    }
    if (document.hidden) conceal();
    return () => {
      actionEpoch.current += 1;
      window.removeEventListener(AUTH_TRANSITION_EVENT, localAuth);
      window.removeEventListener("pagehide", conceal);
      window.removeEventListener("pageshow", pageshow);
      document.removeEventListener("visibilitychange", visibility);
      channel?.close();
    };
  }, []);

  function mayApply(epoch: number) {
    return !concealedRef.current && actionEpoch.current === epoch;
  }

  function submitName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (concealedRef.current) return;
    const epoch = actionEpoch.current;
    const form = new FormData();
    form.set("real_name", draftName);
    form.set("revision", String(nameRevision));
    setNameResult({});
    startName(async () => {
      try {
        const result = await saveAccountName(form);
        if (!mayApply(epoch)) return;
        setNameResult(result);
        if (result.revision !== undefined) setNameRevision(result.revision);
        if (result.success) router.refresh();
      } catch {
        if (!mayApply(epoch)) return;
        setNameResult({
          error: "We couldn’t save your name. Your draft is still here.",
        });
      }
    });
  }

  function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (concealedRef.current) return;
    const epoch = actionEpoch.current;
    const form = new FormData(event.currentTarget);
    const passwordInput =
      event.currentTarget.elements.namedItem("current_password");
    if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
    setEmailResult({});
    startEmail(async () => {
      try {
        const result = await changeAccountEmail(form);
        if (!mayApply(epoch)) return;
        setEmailResult(result);
        if (result.success) {
          setDraftEmail("");
          router.refresh();
        }
      } catch {
        if (!mayApply(epoch)) return;
        setEmailResult({
          error: "We couldn’t request that email change. Try again.",
        });
      }
    });
  }

  function sendPasswordCode() {
    if (concealedRef.current) return;
    const epoch = actionEpoch.current;
    setPasswordResult({});
    startCode(async () => {
      try {
        const result = await requestPasswordCode();
        if (mayApply(epoch)) setPasswordResult(result);
      } catch {
        if (!mayApply(epoch)) return;
        setPasswordResult({
          error: "We couldn’t send a reauthentication code. Try again.",
        });
      }
    });
  }

  function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (concealedRef.current) return;
    const epoch = actionEpoch.current;
    const form = new FormData(event.currentTarget);
    event.currentTarget.reset();
    setPasswordResult({});
    startPassword(async () => {
      try {
        const result = await changeAccountPassword(form);
        if (mayApply(epoch)) setPasswordResult(result);
      } catch {
        if (!mayApply(epoch)) return;
        setPasswordResult({
          error: "We couldn’t change your password. Try again.",
        });
      }
    });
  }

  if (concealed) {
    return (
      <p className="account-concealed" role="status">
        Checking current account access…
      </p>
    );
  }

  return (
    <div className="account-sections" ref={content}>
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
          before it can be used for verified access. Check your inboxes for
          confirmation instructions.
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
            maxLength={128}
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
        <p>Choose at least 12 characters.</p>
        <form ref={passwordForm} onSubmit={submitPassword}>
          <label htmlFor="account-current-password">Current password</label>
          <input
            id="account-current-password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
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
          <details className="account-reauth">
            <summary>Have a security code?</summary>
            <p>
              If asked, enter the six-digit code sent to your sign-in email.
            </p>
            <label htmlFor="account-password-nonce">Security code</label>
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
          </details>
          <Feedback result={passwordResult} />
          <button disabled={passwordPending} type="submit">
            {passwordPending ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
