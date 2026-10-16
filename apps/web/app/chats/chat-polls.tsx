"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import "./chat-polls.css";
import { normalizedPollDraft, voteConfirmation } from "./poll-input";

type Poll = {
  poll_id: string;
  question: string;
  created_at: string;
  closed_at: string | null;
  creator_id: string | null;
  my_option_id: string | null;
  options: { id: string; label: string; ordinal: number; votes: number }[];
};
type Source = {
  kind: "hangout" | "dm";
  sourceId: string;
  peerId: string | null;
  actor: string;
};
type Pending = {
  action: "create" | "vote" | "close";
  key: string;
  question?: string;
  options?: string[];
  pollId?: string;
  optionId?: string;
};

export function ChatPolls({ kind, sourceId, peerId, actor }: Source) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error" | "denied">(
    "loading",
  );
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const [before, setBefore] = useState<{ at: string; id: string } | null>(null);
  const generation = useRef(0);
  const pendingRef = useRef<Pending | null>(null);
  const pageRef = useRef<{ at: string; id: string } | null>(null);
  const api = "/api/polls";
  const query = useCallback(
    (cursor: { at: string; id: string } | null = null) => {
      const q = new URLSearchParams({ kind, sourceId });
      if (peerId) q.set("peerId", peerId);
      if (cursor) {
        q.set("before", cursor.at);
        q.set("beforeId", cursor.id);
      }
      return `${api}?${q}`;
    },
    [kind, sourceId, peerId],
  );
  const hide = useCallback(() => {
    generation.current++;
    setPolls([]);
    setPhase("loading");
    setNote("");
    setOpen(false);
    setQuestion("");
    setOptions(["", ""]);
    setPending(null);
    pendingRef.current = null;
    setMore(false);
    setBefore(null);
    pageRef.current = null;
    setBusy(false);
  }, []);
  const read = useCallback(
    async (cursor: { at: string; id: string } | null = null) => {
      if (document.hidden) return null;
      const ticket = generation.current;
      try {
        const response = await fetch(query(cursor), {
          cache: "no-store",
          credentials: "same-origin",
          headers: { "x-pals-poll-actor": actor },
        });
        const data = (await response.json()) as {
          kind: string;
          polls?: Poll[];
        };
        if (ticket !== generation.current || document.hidden) return null;
        if (response.status === 403 || data.kind === "denied") {
          hide();
          setPhase("denied");
          return null;
        }
        if (data.kind !== "ok" || !Array.isArray(data.polls)) {
          setPhase("error");
          setPolls([]);
          return null;
        }
        setPolls(data.polls);
        setMore(data.polls.length === 24);
        setBefore(cursor);
        pageRef.current = cursor;
        setPhase("ready");
        return data.polls;
      } catch {
        if (ticket === generation.current) {
          setPolls([]);
          setPhase("error");
        }
        return null;
      }
    },
    [actor, hide, query],
  );
  useEffect(() => {
    void read();
    const onVisibility = () => {
      if (document.hidden) hide();
      else void read();
    };
    const onReturn = () => {
      hide();
      if (!document.hidden) void read();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("focus", onReturn);
    const interval = window.setInterval(() => {
      if (!document.hidden && !pendingRef.current) void read(pageRef.current);
    }, 8000);
    return () => {
      generation.current++;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [hide, read]);
  async function act(
    action: Pending["action"],
    pollId?: string,
    optionId?: string,
  ) {
    if (busy || phase !== "ready" || document.hidden) return;
    if (
      pendingRef.current &&
      (pendingRef.current.action !== action ||
        pendingRef.current.pollId !== pollId ||
        pendingRef.current.optionId !== optionId)
    ) {
      setNote("Retry or reload the earlier action first.");
      return;
    }
    const draft = normalizedPollDraft(question, options);
    if (action === "create" && !draft) {
      setNote("Add a question and 2–6 different options.");
      return;
    }
    const item = pendingRef.current ?? {
      action,
      key: crypto.randomUUID(),
      ...(action === "create"
        ? { question: draft?.question, options: draft?.options }
        : { pollId, optionId }),
    };
    pendingRef.current = item;
    setPending(item);
    setBusy(true);
    setNote("Checking current chat access…");
    const ticket = generation.current;
    if (
      !(await read(before)) ||
      ticket !== generation.current ||
      document.hidden
    ) {
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(api, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-pals-poll-actor": actor,
        },
        body: JSON.stringify({ kind, sourceId, peerId, ...item }),
      });
      const data = (await response.json()) as {
        kind: string;
        result?: unknown;
      };
      if (ticket !== generation.current || document.hidden) return;
      if (response.status === 403 || data.kind === "denied") {
        hide();
        const current = await read();
        if (current)
          setNote(
            "This poll changed or is no longer available. Review current polls.",
          );
        return;
      }
      if (data.kind === "ok") {
        pendingRef.current = null;
        setPending(null);
        if (action === "create") {
          setOpen(false);
          setQuestion("");
          setOptions(["", ""]);
        }
        const current = await read(
          action === "create" ? null : pageRef.current,
        );
        if (current && ticket === generation.current) {
          if (action === "vote") {
            const latest = current.find((poll) => poll.poll_id === item.pollId);
            const outcome = voteConfirmation(
              data.result,
              item.pollId ?? "",
              item.optionId ?? "",
              latest?.my_option_id,
            );
            setNote(
              outcome === "current"
                ? "Your choice is current."
                : outcome === "superseded"
                  ? "Your earlier retry did not change the current choice."
                  : "Choice status is unclear. Reload polls before voting again.",
            );
          } else if (action === "close") {
            const latest = current.find((poll) => poll.poll_id === item.pollId);
            setNote(
              latest?.closed_at
                ? "Poll closed."
                : "Poll status is unclear. Reload polls before another action.",
            );
          } else {
            const made =
              typeof data.result === "string" &&
              current.some((poll) => poll.poll_id === data.result);
            setNote(
              made
                ? "Poll created."
                : "Poll creation is confirmed. Reload to find it.",
            );
          }
        }
      } else if (data.kind === "conflict")
        setNote(
          "This retry differs from the original action. Reload to check the poll.",
        );
      else if (data.kind === "invalid")
        setNote(
          action === "create"
            ? "Could not create this poll. Check its details or try later; this chat allows five new polls per hour."
            : "Poll details changed. Reload to check the current options.",
        );
      else setNote("Outcome uncertain. Retry the same action.");
    } catch {
      if (ticket === generation.current)
        setNote("Outcome uncertain. Retry the same action.");
    } finally {
      if (ticket === generation.current) setBusy(false);
    }
  }
  if (phase === "denied") return null;
  return (
    <section className="chat-polls" aria-label="Chat polls">
      <div className="chat-polls-heading">
        <h2>Polls</h2>
        <span>Plan together</span>
      </div>
      {phase === "loading" && <p role="status">Checking polls…</p>}
      {phase === "error" && (
        <p role="alert">
          Polls are unavailable.{" "}
          <button
            type="button"
            className="quiet-button"
            onClick={() => void read()}
          >
            Try again
          </button>
        </p>
      )}
      {phase === "ready" && (
        <>
          {polls.length ? (
            <ol className="chat-polls-list">
              {polls.map((poll) => (
                <li key={poll.poll_id}>
                  <div className="chat-poll-top">
                    <strong>{poll.question}</strong>
                    <span>{poll.closed_at ? "Closed" : "Open"}</span>
                  </div>
                  <ul>
                    {poll.options.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          disabled={
                            busy ||
                            !!poll.closed_at ||
                            (!!pending &&
                              (pending.action !== "vote" ||
                                pending.pollId !== poll.poll_id ||
                                pending.optionId !== option.id))
                          }
                          aria-pressed={poll.my_option_id === option.id}
                          onClick={() =>
                            void act("vote", poll.poll_id, option.id)
                          }
                        >
                          <span>
                            {option.label}
                            {poll.my_option_id === option.id
                              ? " · Your choice"
                              : ""}
                          </span>
                          <span>{option.votes}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {poll.creator_id === actor && !poll.closed_at && (
                    <button
                      type="button"
                      className="quiet-button"
                      disabled={
                        busy ||
                        (!!pending &&
                          (pending.action !== "close" ||
                            pending.pollId !== poll.poll_id))
                      }
                      onClick={() => void act("close", poll.poll_id)}
                    >
                      Close poll
                    </button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="help">
              No polls yet. Ask a quick question to plan together.
            </p>
          )}
          {more && (
            <button
              type="button"
              className="quiet-button"
              disabled={busy}
              onClick={() => {
                const last = polls.at(-1);
                if (last) void read({ at: last.created_at, id: last.poll_id });
              }}
            >
              Older polls
            </button>
          )}
          {before && (
            <button
              type="button"
              className="quiet-button"
              disabled={busy}
              onClick={() => void read()}
            >
              Newest polls
            </button>
          )}
          <button
            type="button"
            className="quiet-button chat-polls-toggle"
            disabled={!!pending && pending.action !== "create"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? "Cancel" : "Create a poll"}
          </button>
          {open && (
            <form
              className="chat-polls-form"
              onSubmit={(event) => {
                event.preventDefault();
                void act("create");
              }}
            >
              <p className="help">
                Everyone currently in this chat can vote and see totals. In a
                small group, changes in totals may reveal someone’s choice. Up
                to five new polls per hour here.
              </p>
              <label>
                Question
                <input
                  required
                  maxLength={200}
                  value={question}
                  disabled={!!pending}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="When should we meet?"
                />
              </label>
              {options.map((value, index) => (
                <label key={index}>
                  Option {index + 1}
                  <span>
                    <input
                      required
                      maxLength={100}
                      value={value}
                      disabled={!!pending}
                      onChange={(event) =>
                        setOptions(
                          options.map((old, i) =>
                            i === index ? event.target.value : old,
                          ),
                        )
                      }
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="quiet-button"
                        disabled={!!pending}
                        onClick={() =>
                          setOptions(options.filter((_, i) => i !== index))
                        }
                        aria-label={`Remove option ${index + 1}`}
                      >
                        Remove
                      </button>
                    )}
                  </span>
                </label>
              ))}
              {options.length < 6 && (
                <button
                  type="button"
                  className="quiet-button"
                  disabled={!!pending}
                  onClick={() => setOptions([...options, ""])}
                >
                  Add option
                </button>
              )}
              <button type="submit" className="button" disabled={busy}>
                {pending?.action === "create"
                  ? "Retry original poll"
                  : "Create poll"}
              </button>
            </form>
          )}
          <p className="chat-status" role="status">
            {note}
          </p>
        </>
      )}
    </section>
  );
}
