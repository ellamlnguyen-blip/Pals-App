"use client";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OwnerProfile } from "@pals/types";
import {
  saveProfile,
  changePhoto,
  cleanupPhotos,
  type ProfileResult,
} from "./actions";

function initialValues(profile: OwnerProfile) {
  const values: Record<string, string> = {
    real_name: profile.real_name,
    major: profile.major,
    bio: profile.bio,
    graduation_year: String(profile.graduation_year),
    interests: profile.interests.join("\n"),
    down_to_do: profile.down_to_do.join("\n"),
    favorite_music: profile.favorite_music ?? "",
    favorite_foods: profile.favorite_foods ?? "",
    weird_fact: profile.weird_fact ?? "",
    instagram: profile.instagram ?? "",
  };
  for (let i = 0; i < 3; i++) {
    values[`question_${i}`] = profile.prompts[i]?.question ?? "";
    values[`answer_${i}`] = profile.prompts[i]?.answer ?? "";
  }
  return values;
}
export function ProfileEditor({
  profile,
  email,
}: {
  profile: OwnerProfile;
  email: string;
}) {
  const router = useRouter();
  const photoStatus = useRef<HTMLDivElement>(null);
  const detailStatus = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const restoreEditFocus = useRef(false);
  const [values, setValues] = useState(() => initialValues(profile));
  const [saved, setSaved] = useState(values);
  const [revision, setRevision] = useState(profile.revision);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<ProfileResult>({});
  const [cleanupNeeded, setCleanupNeeded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState("");
  useEffect(() => {
    if (restoreEditFocus.current && !editing && !pending) {
      editButton.current?.focus();
      restoreEditFocus.current = false;
    }
  }, [editing, pending]);
  const [photoSlot, setPhotoSlot] = useState<string | null>(null);
  function run(
    label: string,
    work: () => Promise<ProfileResult>,
    done?: (result: ProfileResult) => void,
  ) {
    setBusyLabel(label);
    setFeedback({});
    startTransition(async () => {
      try {
        const result = await work();
        setFeedback(result);
        if (result.cleanupNeeded !== undefined)
          setCleanupNeeded(result.cleanupNeeded);
        if (result.revision !== undefined) setRevision(result.revision);
        done?.(result);
        router.refresh();
        if (!result.error && label.includes("photo"))
          photoStatus.current?.focus();
        if (label === "Saving your profile…") detailStatus.current?.focus();
      } catch {
        setFeedback({
          error:
            "We couldn’t finish that request. Your text is still here. Retry, or reload to check account access and the latest saved profile.",
        });
      }
    });
  }
  function field(
    name: string,
    label: string,
    limit: number,
    required = false,
    multiline = false,
  ) {
    const props = {
      id: name,
      name,
      value: values[name] ?? "",
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setValues({ ...values, [name]: event.target.value }),
      required,
      maxLength: limit,
      disabled: !editing || pending,
    };
    return (
      <label htmlFor={name}>
        {label}
        {multiline ? (
          <textarea {...props} rows={name === "bio" ? 4 : 3} />
        ) : (
          <input {...props} />
        )}
      </label>
    );
  }
  return (
    <div className="profile-layout" aria-busy={pending}>
      <aside className="profile-sidebar">
        <div className="profile-identity">
          <p className="badge">UNC email verified</p>
          <p>University of North Carolina at Chapel Hill</p>
          <p className="help">{email}</p>
          <p className="help">
            Your university and verified email are read-only.
          </p>
        </div>
        <div className="profile-photos">
          <h2>Your photos</h2>
          <div ref={photoStatus} tabIndex={-1} aria-live="polite">
            {photoSlot !== null && feedback.success && (
              <p className="form-message">{feedback.success}</p>
            )}
          </div>
          <p className="help">
            Private to you. JPG, PNG or WebP, under 5 MB each.
          </p>
          {[
            "primary",
            ...profile.additional_photo_paths.map((_, i) => String(i)),
            ...(profile.additional_photo_paths.length < 4 ? ["new"] : []),
          ].map((slot) => (
            <PhotoCard
              key={slot}
              slot={slot}
              revision={revision}
              disabled={pending || editing}
              feedback={photoSlot === slot ? feedback : {}}
              busy={pending && photoSlot === slot}
              run={(label, work) => {
                setPhotoSlot(slot);
                run(label, work);
              }}
            />
          ))}
          <p className="help">
            Up to four extra photos. Photos save separately from your details.
            Original photo metadata is kept private with the image.
          </p>
          {cleanupNeeded && (
            <p className="form-message">
              Unused uploads may still be stored privately. Retry cleanup when
              your connection is back.
            </p>
          )}
          <button
            className="text-button"
            disabled={pending || editing}
            onClick={() => {
              setPhotoSlot("cleanup");
              run("Checking unused photos…", cleanupPhotos);
            }}
          >
            {pending && photoSlot === "cleanup"
              ? "Checking unused photos…"
              : "Clean up unused uploads"}
          </button>
          {photoSlot === "cleanup" && (
            <p role="status">{feedback.error ?? feedback.success}</p>
          )}
        </div>
      </aside>
      <div className="profile-details">
        <div className="profile-toolbar">
          <h2>A little about you</h2>
          {!editing && (
            <button
              ref={editButton}
              className="button"
              disabled={pending}
              onClick={() => {
                setFeedback({});
                setPhotoSlot(null);
                setEditing(true);
              }}
            >
              Edit details
            </button>
          )}
        </div>
        <div
          ref={detailStatus}
          tabIndex={-1}
          aria-live="polite"
          className="profile-feedback"
        >
          {pending && photoSlot === null && <p role="status">{busyLabel}</p>}
          {feedback.error && photoSlot === null && (
            <p className="form-message error" role="alert">
              {feedback.error}
            </p>
          )}
          {feedback.success && photoSlot === null && (
            <p className="form-message" role="status">
              {feedback.success}
            </p>
          )}
          {feedback.error && photoSlot === null && (
            <button
              className="text-button"
              disabled={pending}
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload latest profile (discards edits)
            </button>
          )}
        </div>
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData();
            for (const [key, value] of Object.entries(values))
              form.set(key, value);
            form.set("revision", String(revision));
            run(
              "Saving your profile…",
              () => saveProfile(form),
              (result) => {
                if (!result.error) {
                  restoreEditFocus.current = true;
                  setSaved(values);
                  setEditing(false);
                }
              },
            );
          }}
        >
          <fieldset disabled={!editing || pending}>
            <legend>Profile basics</legend>
            <div className="form-stack">
              {field("real_name", "Your real name", 100, true)}
              <label htmlFor="graduation_year">
                Graduation year
                <input
                  id="graduation_year"
                  name="graduation_year"
                  type="number"
                  min={1900}
                  max={2200}
                  required
                  value={values.graduation_year}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      graduation_year: event.target.value,
                    })
                  }
                />
              </label>
              {field("major", "Major", 200, true)}
              {field("bio", "Bio", 2000, true, true)}
            </div>
          </fieldset>
          <fieldset disabled={!editing || pending}>
            <legend>
              More about you <span>Optional</span>
            </legend>
            <div className="form-stack">
              <p className="help">
                Leave any of these blank. You can always add more later.
              </p>
              {field("interests", "Interests · one per line", 809, false, true)}
              <p className="help">
                Up to 10 unique interests, 80 characters each.
              </p>
              {field(
                "down_to_do",
                "Down to do · one per line",
                809,
                false,
                true,
              )}
              <p className="help">
                Up to 10 unique activities, 80 characters each.
              </p>
              {field("favorite_music", "Favorite music", 500, false, true)}
              {field("favorite_foods", "Favorite foods", 500, false, true)}
              {field("weird_fact", "A weird fact about you", 500, false, true)}
              {field("instagram", "Instagram handle", 31)}
              <p className="help">
                Handle only, up to 30 letters, numbers, periods or underscores.
              </p>
            </div>
          </fieldset>
          <fieldset disabled={!editing || pending}>
            <legend>
              Conversation starters <span>Optional</span>
            </legend>
            <p className="help">
              Up to three prompts. Fill in both parts, or leave both blank.
            </p>
            <div className="form-stack">
              {[0, 1, 2].map((i) => (
                <div className="prompt-pair form-stack" key={i}>
                  {field(`question_${i}`, `Prompt ${i + 1} · question`, 120)}
                  {field(
                    `answer_${i}`,
                    `Prompt ${i + 1} · your answer`,
                    500,
                    false,
                    true,
                  )}
                </div>
              ))}
            </div>
          </fieldset>
          {editing && (
            <div className="profile-save">
              <button className="button" disabled={pending}>
                {pending ? "Saving…" : "Save details"}
              </button>
              <button
                className="text-button"
                type="button"
                disabled={pending}
                onClick={() => {
                  restoreEditFocus.current = true;
                  setValues(saved);
                  setEditing(false);
                  setFeedback({});
                }}
              >
                Cancel edits
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
function PhotoCard({
  slot,
  revision,
  disabled,
  feedback,
  busy,
  run,
}: {
  slot: string;
  revision: number;
  disabled: boolean;
  feedback: ProfileResult;
  busy: boolean;
  run: (label: string, work: () => Promise<ProfileResult>) => void;
}) {
  const [failed, setFailed] = useState(false);
  const label =
    slot === "primary"
      ? "Primary photo"
      : slot === "new"
        ? "Add an extra photo"
        : `Extra photo ${Number(slot) + 1}`;
  return (
    <div className="photo-card">
      <h3>{label}</h3>
      <div aria-live="polite">
        {busy && <p role="status">Saving photo…</p>}
        {feedback.error && (
          <p className="form-message error" role="alert">
            {feedback.error}
          </p>
        )}
        {feedback.success && <p role="status">{feedback.success}</p>}
        {feedback.error && (
          <button
            className="text-button"
            disabled={disabled}
            onClick={() => window.location.reload()}
          >
            Reload latest profile
          </button>
        )}
      </div>
      {slot !== "new" &&
        (failed ? (
          <p className="help">Photo couldn’t load. Reload to try again.</p>
        ) : (
          <Image
            className="owner-photo"
            src={`/profile/photo?slot=${slot}&v=${revision}`}
            alt={label}
            width={240}
            height={240}
            unoptimized
            onError={() => setFailed(true)}
          />
        ))}
      <form
        className="photo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          form.set("revision", String(revision));
          form.set("slot", slot);
          form.set("operation", slot === "new" ? "add" : "replace");
          run("Saving photo…", () => changePhoto(form));
        }}
      >
        <label htmlFor={`photo-${slot}`}>
          {slot === "new" ? "Choose a photo" : "Choose replacement"}
          <input
            id={`photo-${slot}`}
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
            disabled={disabled}
          />
        </label>
        <button className="text-button" disabled={disabled}>
          {slot === "new" ? "Add photo" : "Replace photo"}
        </button>
        {slot !== "primary" && slot !== "new" && (
          <button
            className="text-button"
            type="button"
            disabled={disabled}
            onClick={() => {
              const form = new FormData();
              form.set("revision", String(revision));
              form.set("slot", slot);
              form.set("operation", "remove");
              run("Removing photo…", () => changePhoto(form));
            }}
          >
            Remove photo {Number(slot) + 1}
          </button>
        )}
      </form>
    </div>
  );
}
