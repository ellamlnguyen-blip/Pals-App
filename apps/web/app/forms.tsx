"use client";
import { useActionState } from "react";
import {
  signIn,
  signUp,
  resendConfirmation,
  completeProfile,
  type FormState,
} from "./actions";
function Feedback({ state }: { state: FormState }) {
  return (
    <div aria-live="polite">
      {state.error && (
        <p className="form-message error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="form-message">{state.success}</p>}
    </div>
  );
}
export function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const [state, action, pending] = useActionState(
    mode === "signup" ? signUp : signIn,
    {},
  );
  return (
    <form action={action} className="form-stack" aria-busy={pending}>
      <label htmlFor="email">
        UNC email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          required
          maxLength={254}
          aria-describedby={mode === "signup" ? "domains" : undefined}
        />
      </label>
      <label htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 12 : undefined}
          maxLength={128}
          aria-describedby={mode === "signup" ? "password-help" : undefined}
        />
      </label>
      {mode === "signup" && (
        <p className="help" id="password-help">
          At least 12 characters. A few memorable words work well.
        </p>
      )}
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending
          ? mode === "signup"
            ? "Sending confirmation…"
            : "Signing in…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </button>
    </form>
  );
}
export function ResendForm() {
  const [state, action, pending] = useActionState(resendConfirmation, {});
  return (
    <form action={action} className="form-stack" aria-busy={pending}>
      <label htmlFor="email">
        UNC email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          required
          maxLength={254}
        />
      </label>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Sending…" : "Send a new link"}
      </button>
    </form>
  );
}
export function OnboardingForm({
  profile,
}: {
  profile: {
    real_name: string | null;
    major: string | null;
    bio: string | null;
    graduation_year: number | null;
  };
}) {
  const [state, action, pending] = useActionState(completeProfile, {});
  return (
    <form action={action} className="form-stack" aria-busy={pending}>
      <label htmlFor="real_name">
        Your real name
        <input
          id="real_name"
          name="real_name"
          autoComplete="name"
          required
          maxLength={100}
          defaultValue={state.values?.real_name ?? profile.real_name ?? ""}
        />
      </label>
      <div className="field-pair">
        <label htmlFor="graduation_year">
          Graduation year
          <input
            id="graduation_year"
            name="graduation_year"
            type="number"
            min={1900}
            max={2200}
            required
            placeholder="2028"
            defaultValue={
              state.values?.graduation_year ?? profile.graduation_year ?? ""
            }
          />
        </label>
        <label htmlFor="major">
          Major
          <input
            id="major"
            name="major"
            required
            maxLength={200}
            defaultValue={state.values?.major ?? profile.major ?? ""}
          />
        </label>
      </div>
      <label htmlFor="bio">
        A little about you
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={2000}
          required
          defaultValue={state.values?.bio ?? profile.bio ?? ""}
          aria-describedby="bio-help"
        />
      </label>
      <p className="help" id="bio-help">
        What do you enjoy doing when you’re not in class?
      </p>
      <label htmlFor="photo">
        Your primary photo
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          aria-describedby="photo-help"
        />
      </label>
      <p className="help" id="photo-help">
        Choose a clear photo of yourself. JPG, PNG or WebP, up to 5 MB. For now,
        your photo is visible only to you.
      </p>
      <Feedback state={state} />
      <button className="button" disabled={pending}>
        {pending ? "Saving your profile…" : "Finish profile"}
      </button>
    </form>
  );
}
