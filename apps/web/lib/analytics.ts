"use client";

import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../app/auth-transition";
import {
  type AccessReply,
  type AnalyticsEvent,
  localAnalyticsConfig,
  readAnalyticsAccess,
  validCaptureArguments,
} from "./analytics-core";

export type AnalyticsStatus =
  "off" | "checking" | "on" | "unavailable" | "error";
type Listener = () => void;
const revokeChannelName = "pals-analytics-revoke";
const revokeLocalEvent = "pals-analytics-revoke-local";

export class BrowserAnalytics {
  private status: AnalyticsStatus = "off";
  private account: string | null = null;
  private choice = false;
  private pendingAuth = new Set<string>();
  private generation = 0;
  private visitId = crypto.randomUUID();
  private controllers = new Set<AbortController>();
  private listeners = new Set<Listener>();
  private installed = false;
  private authChannel: BroadcastChannel | null = null;
  private revokeChannel: BroadcastChannel | null = null;
  private config: { sink: string; token: string } | null = null;

  getSnapshot = () => this.status;
  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private update(status: AnalyticsStatus) {
    this.status = status;
    this.listeners.forEach((listener) => listener());
  }
  private stop(status: AnalyticsStatus, rotateVisit = false) {
    this.generation++;
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
    this.config = null;
    if (rotateVisit) this.visitId = crypto.randomUUID();
    this.update(status);
  }
  private clear(status: AnalyticsStatus = "off") {
    this.choice = false;
    this.account = null;
    this.stop(status, true);
  }
  private install() {
    if (this.installed) return;
    this.installed = true;
    window.addEventListener("focus", this.onReturn);
    window.addEventListener("pageshow", this.onReturn);
    window.addEventListener(
      AUTH_TRANSITION_EVENT,
      this.onLocalAuth as EventListener,
    );
    window.addEventListener(revokeLocalEvent, this.onRevoke);
    this.authChannel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    this.authChannel.onmessage = (event: MessageEvent<AuthTransitionMessage>) =>
      this.onAuth(event.data);
    this.revokeChannel = new BroadcastChannel(revokeChannelName);
    this.revokeChannel.onmessage = this.onRevoke;
  }
  private onReturn = () => {
    if (!this.choice) return;
    this.stop("checking");
    if (this.pendingAuth.size === 0) void this.revalidate();
  };
  private onLocalAuth = (event: CustomEvent<AuthTransitionMessage>) =>
    this.onAuth(event.detail);
  private onAuth = (message: AuthTransitionMessage) => {
    if (message?.phase === "begin") {
      this.pendingAuth.add(message.token);
      // A sign-out intent stops every tab before a cookie can become stale.
      if (message.intent !== "signin") this.clear();
      else if (this.choice) this.stop("checking");
      return;
    }
    if (message?.phase === "settled" || message?.phase === "cancelled")
      this.pendingAuth.delete(message.token);
    if (!this.choice) return;
    this.stop("checking");
    if (this.pendingAuth.size === 0) void this.revalidate();
  };
  private onRevoke = () => this.clear();
  private async access(): Promise<{
    reply: AccessReply;
    generation: number;
  } | null> {
    const generation = this.generation;
    const controller = new AbortController();
    this.controllers.add(controller);
    const reply = await readAnalyticsAccess(fetch, controller.signal);
    this.controllers.delete(controller);
    return generation === this.generation && this.choice
      ? { reply, generation }
      : null;
  }
  private async revalidate() {
    if (!this.choice || this.pendingAuth.size > 0) return;
    const result = await this.access();
    if (!result) return;
    const { reply, generation } = result;
    if (
      reply.kind === "denied" ||
      (reply.kind === "ok" && this.account && reply.actor !== this.account)
    ) {
      this.clear();
      return;
    }
    if (reply.kind === "off") {
      this.stop("unavailable", true);
      return;
    }
    if (reply.kind !== "ok") {
      this.stop("error", true);
      return;
    }
    if (
      generation !== this.generation ||
      !this.choice ||
      this.pendingAuth.size > 0
    )
      return;
    this.account = reply.actor;
    this.config = { sink: reply.sink, token: reply.token };
    this.update("on");
  }
  async optIn() {
    this.install();
    this.choice = true;
    this.stop("checking", true);
    if (this.pendingAuth.size === 0) await this.revalidate();
  }
  optOut() {
    this.clear();
    const channel = new BroadcastChannel(revokeChannelName);
    channel.postMessage({ revoke: true });
    channel.close();
    window.dispatchEvent(new Event(revokeLocalEvent));
  }
  dispose() {
    this.clear();
    if (!this.installed) return;
    window.removeEventListener("focus", this.onReturn);
    window.removeEventListener("pageshow", this.onReturn);
    window.removeEventListener(
      AUTH_TRANSITION_EVENT,
      this.onLocalAuth as EventListener,
    );
    window.removeEventListener(revokeLocalEvent, this.onRevoke);
    this.authChannel?.close();
    this.revokeChannel?.close();
    this.pendingAuth.clear();
    this.installed = false;
  }
  async capture(...args: [AnalyticsEvent]): Promise<void> {
    // The rest tuple catches casts and JavaScript callers that supply extra properties.
    if (
      !validCaptureArguments(args) ||
      !this.choice ||
      this.pendingAuth.size > 0 ||
      this.status !== "on" ||
      !this.account ||
      !this.config
    )
      return;
    const expectedAccount = this.account;
    const expectedVisit = this.visitId;
    const result = await this.access();
    if (!result) return;
    const { reply, generation } = result;
    if (
      reply.kind === "denied" ||
      (reply.kind === "ok" && reply.actor !== expectedAccount)
    ) {
      this.clear();
      return;
    }
    if (reply.kind !== "ok") {
      this.stop(reply.kind === "off" ? "unavailable" : "error", true);
      return;
    }
    if (
      generation !== this.generation ||
      this.status !== "on" ||
      !this.choice ||
      this.pendingAuth.size > 0 ||
      this.account !== expectedAccount ||
      this.visitId !== expectedVisit ||
      !localAnalyticsConfig("local", reply.sink, reply.token)
    )
      return;
    const controller = new AbortController();
    this.controllers.add(controller);
    try {
      await fetch(reply.sink, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        redirect: "error",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: reply.token,
          event: args[0],
          distinct_id: expectedVisit,
          properties: { schema_version: 1, $process_person_profile: false },
        }),
        signal: controller.signal,
      });
    } catch {
      // Best effort; never queue or retry.
    } finally {
      this.controllers.delete(controller);
    }
  }
}

// Module state belongs to the current browser tab and is rebuilt off after reload.
export const analytics = new BrowserAnalytics();
