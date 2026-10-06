"use client";
import Image from "next/image";
import Link from "next/link";
import { CameraIcon } from "@phosphor-icons/react/dist/csr/Camera";
import { ProfileTopbar } from "./profile-topbar";
import type { StudentDestinations } from "../student-shell";
import { ProfileSummary } from "./profile-summary";
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
    real_name: profile.real_name ?? "",
    major: profile.major ?? "",
    hometown: profile.hometown ?? "",
    bio: profile.bio ?? "",
    graduation_year: profile.graduation_year?.toString() ?? "",
    interests: (profile.interests ?? []).join("\n"),
    down_to_do: (profile.down_to_do ?? []).join("\n"),
    favorite_music: profile.favorite_music ?? "",
    favorite_foods: profile.favorite_foods ?? "",
    weird_fact: profile.weird_fact ?? "",
    instagram: profile.instagram ?? "",
  };
  for (let i = 0; i < 3; i++) {
    values[`question_${i}`] = profile.prompts?.[i]?.question ?? "";
    values[`answer_${i}`] = profile.prompts?.[i]?.answer ?? "";
  }
  return values;
}
export function ProfileEditor({
  profile,
  email,
  peopleAvailable,
  available,
  attendanceAvailable,
}: {
  profile: OwnerProfile;
  email: string;
  peopleAvailable: boolean;
  available: StudentDestinations;
  attendanceAvailable: boolean;
}) {
  const router = useRouter();
  const photoStatus = useRef<HTMLDivElement>(null);
  const detailStatus = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const editPanel = useRef<HTMLDivElement>(null);
  const photoPanel = useRef<HTMLDetailsElement>(null);
  const photoSummary = useRef<HTMLElement>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const viewPhotoButton = useRef<HTMLButtonElement>(null);
  const closePhotoButton = useRef<HTMLButtonElement>(null);
  const photoTrigger = useRef<HTMLButtonElement | null>(null);
  const skipPhotoFocusRestore = useRef(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    slot: string;
    label: string;
  } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState(false);
  const [viewPhotoFailed, setViewPhotoFailed] = useState(false);
  useEffect(() => {
    if (!selectedPhoto || !photoDialog.current?.open) return;
    if (viewingPhoto) closePhotoButton.current?.focus();
    else viewPhotoButton.current?.focus();
  }, [selectedPhoto, viewingPhoto]);
  const restoreEditFocus = useRef(false);
  const [values, setValues] = useState(() => initialValues(profile));
  const [saved, setSaved] = useState(values);
  const [revision, setRevision] = useState(profile.revision);
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<ProfileResult>({});
  const [cleanupNeeded, setCleanupNeeded] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busyLabel, setBusyLabel] = useState("");
  const seenProfileRevision = useRef(profile.revision);
  useEffect(() => {
    // A refreshed server profile is authoritative for photos and idle details.
    // Leave an active draft and its original revision intact so a stale save
    // still reports a conflict instead of replacing newer changes.
    if (
      editing ||
      pending ||
      profile.revision === seenProfileRevision.current ||
      profile.revision < revision
    )
      return;
    const latest = initialValues(profile);
    seenProfileRevision.current = profile.revision;
    setValues(latest);
    setSaved(latest);
    setRevision(profile.revision);
  }, [editing, pending, profile, revision]);
  useEffect(() => {
    if (restoreEditFocus.current && !editing && !pending) {
      editButton.current?.focus();
      restoreEditFocus.current = false;
    }
  }, [editing, pending]);
  const [photoSlot, setPhotoSlot] = useState<string | null>(null);
  useEffect(() => {
    if (!editing) return;
    editPanel.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    editPanel.current
      ?.querySelector<HTMLInputElement>("#real_name")
      ?.focus({ preventScroll: true });
  }, [editing]);
  function openPhotos() {
    if (photoPanel.current) {
      photoPanel.current.open = true;
      photoPanel.current.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      photoSummary.current?.focus({ preventScroll: true });
    }
  }
  function selectPhoto(
    slot: string,
    label: string,
    trigger: HTMLButtonElement,
  ) {
    photoTrigger.current = trigger;
    setSelectedPhoto({ slot, label });
    setViewingPhoto(false);
    setViewPhotoFailed(false);
    photoDialog.current?.showModal();
  }
  function editSelectedPhoto() {
    const slot = selectedPhoto?.slot;
    if (!slot) return;
    skipPhotoFocusRestore.current = true;
    photoDialog.current?.close();
    openPhotos();
    requestAnimationFrame(() => {
      const input = document.getElementById(`photo-${slot}`);
      if (input instanceof HTMLInputElement) {
        input.scrollIntoView({ block: "center" });
        input.focus({ preventScroll: true });
      }
    });
  }
  function openEditor() {
    setFeedback({});
    setPhotoSlot(null);
    setEditing(true);
  }
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
    <div className="profile-page" aria-busy={pending}>
      <ProfileTopbar
        back="/hangouts"
        backLabel="Back to Hangouts"
        available={available}
        attendanceAvailable={attendanceAvailable}
      >
        <p>
          Your confirmed address on an approved UNC domain is Pals’ campus
          access signal. Pals has not separately checked enrollment or identity.
        </p>
        <p>
          {peopleAvailable
            ? "Only your selected text can appear in People after you opt in and meet its requirements. Photos, prompts, email and other details are private to you."
            : "Only you can see these profile details and photos right now."}
        </p>
        {peopleAvailable && (
          <>
            <Link href="/people/privacy">
              Preview and manage People sharing
            </Link>
            <Link href="/people/friends">Your friendships</Link>
          </>
        )}
        <p className="help">
          Your university and verified email are read-only: {email}
        </p>
      </ProfileTopbar>
      <div className="profile-hero">
        {profile.primary_photo_path ? (
          <OwnerDisplayPhoto
            key={`primary:${profile.revision}`}
            slot="primary"
            revision={profile.revision}
            alt="Your primary profile photo"
            onSelect={selectPhoto}
          />
        ) : (
          <div className="profile-hero-empty">
            <CameraIcon size={42} weight="duotone" aria-hidden="true" />
            <span>No photo yet</span>
            <button type="button" onClick={openPhotos}>
              Add your main photo
            </button>
          </div>
        )}
      </div>
      <dialog
        ref={photoDialog}
        className="profile-photo-dialog"
        aria-label={
          selectedPhoto ? `${selectedPhoto.label} options` : "Photo options"
        }
        onClose={() => {
          setViewingPhoto(false);
          if (!skipPhotoFocusRestore.current) photoTrigger.current?.focus();
          skipPhotoFocusRestore.current = false;
        }}
        onClick={(event) => {
          if (event.target === photoDialog.current)
            photoDialog.current?.close();
        }}
      >
        {selectedPhoto && (
          <div className="profile-photo-dialog-content">
            <div className="profile-photo-dialog-header">
              <h2>{selectedPhoto.label}</h2>
              <button
                ref={closePhotoButton}
                className="profile-photo-dialog-close"
                type="button"
                aria-label="Close photo"
                onClick={() => photoDialog.current?.close()}
              >
                Close
              </button>
            </div>
            {viewingPhoto ? (
              <div className="profile-photo-large">
                {viewPhotoFailed ? (
                  <p role="alert">
                    Photo couldn’t load. Close and reload your profile to try
                    again.
                  </p>
                ) : (
                  <Image
                    src={`/profile/photo?slot=${selectedPhoto.slot}&v=${profile.revision}`}
                    alt={selectedPhoto.label}
                    width={1200}
                    height={1200}
                    unoptimized
                    onError={() => setViewPhotoFailed(true)}
                  />
                )}
              </div>
            ) : (
              <div className="profile-photo-dialog-actions">
                <button
                  ref={viewPhotoButton}
                  type="button"
                  onClick={() => setViewingPhoto(true)}
                >
                  View photo
                </button>
                <button
                  type="button"
                  disabled={pending || editing}
                  onClick={editSelectedPhoto}
                >
                  Edit photo
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
      <ProfileSummary
        name={profile.real_name || "Your name"}
        hometown={profile.hometown}
        bio={
          profile.bio ||
          "Add a few words about yourself so future hangouts feel easier to start."
        }
        campus="UNC–Chapel Hill"
        major={profile.major || "Add your major"}
        graduationYear={profile.graduation_year}
        verified
        actions={
          <>
            <button
              ref={editButton}
              className="button"
              type="button"
              disabled={pending}
              onClick={openEditor}
            >
              Edit details
            </button>
            <button
              className="profile-outline-button"
              type="button"
              disabled={pending}
              onClick={openPhotos}
            >
              Manage photos
            </button>
          </>
        }
      />
      {feedback.success && photoSlot === null && !editing && (
        <p className="form-message profile-saved-status" role="status">
          {feedback.success}
        </p>
      )}
      <section
        className="profile-gallery-section"
        aria-labelledby="profile-gallery-heading"
      >
        <h2 id="profile-gallery-heading">A little more me</h2>
        <div className="profile-gallery">
          {profile.additional_photo_paths.map((_, index) => (
            <OwnerDisplayPhoto
              key={`${index}:${profile.revision}`}
              slot={String(index)}
              revision={profile.revision}
              alt={`Your extra photo ${index + 1}`}
              onSelect={selectPhoto}
            />
          ))}
          {profile.additional_photo_paths.length === 0 && (
            <button
              className="profile-gallery-empty"
              type="button"
              onClick={openPhotos}
            >
              Add a few photos of yourself and your favorite moments
            </button>
          )}
        </div>
      </section>
      <section
        className="profile-prompts"
        aria-labelledby="profile-prompts-heading"
      >
        <h2 id="profile-prompts-heading">Let’s start a conversation</h2>
        {profile.prompts.length ? (
          profile.prompts.map((prompt, index) => (
            <div className="profile-prompt" key={index}>
              <h3>{prompt.question}</h3>
              <p>{prompt.answer}</p>
            </div>
          ))
        ) : (
          <button
            type="button"
            className="profile-prompt profile-prompt-empty"
            onClick={openEditor}
          >
            Add a question and answer to make saying hi easier.
          </button>
        )}
      </section>
      {(profile.interests.length > 0 ||
        profile.down_to_do.length > 0 ||
        profile.favorite_music ||
        profile.favorite_foods ||
        profile.weird_fact ||
        profile.instagram) && (
        <section className="profile-more" aria-label="More about you">
          <h2>More about you</h2>
          {profile.interests.length > 0 && (
            <p>
              <strong>Interests</strong> {profile.interests.join(" · ")}
            </p>
          )}
          {profile.down_to_do.length > 0 && (
            <p>
              <strong>Down to do</strong> {profile.down_to_do.join(" · ")}
            </p>
          )}
          {profile.favorite_music && (
            <p>
              <strong>Favorite music</strong> {profile.favorite_music}
            </p>
          )}
          {profile.favorite_foods && (
            <p>
              <strong>Favorite foods</strong> {profile.favorite_foods}
            </p>
          )}
          {profile.weird_fact && (
            <p>
              <strong>A weird fact</strong> {profile.weird_fact}
            </p>
          )}
          {profile.instagram && (
            <p>
              <strong>Instagram</strong> @{profile.instagram}
            </p>
          )}
        </section>
      )}
      <details className="profile-photo-panel" ref={photoPanel}>
        <summary ref={photoSummary}>Photo controls</summary>
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
                key={`${slot}:${profile.revision}`}
                slot={slot}
                hasPhoto={slot !== "primary" || !!profile.primary_photo_path}
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
      </details>
      <div className="profile-details" ref={editPanel} hidden={!editing}>
        <div className="profile-toolbar">
          <h2>A little about you</h2>
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
              <label htmlFor="hometown">
                Hometown{" "}
                <span className="help">Optional · up to 100 characters</span>
                <input
                  id="hometown"
                  name="hometown"
                  value={values.hometown ?? ""}
                  disabled={!editing || pending}
                  onChange={(event) => {
                    const next = event.target.value;
                    if ([...next].length <= 100)
                      setValues({ ...values, hometown: next });
                  }}
                />
              </label>
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
function OwnerDisplayPhoto({
  slot,
  revision,
  alt,
  onSelect,
}: {
  slot: string;
  revision: number;
  alt: string;
  onSelect: (slot: string, label: string, trigger: HTMLButtonElement) => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed)
    return (
      <div className="profile-photo-error" role="status">
        <span>{alt} could not load.</span>
        <a href="/profile">Reload profile</a>
      </div>
    );
  return (
    <button
      className="profile-photo-trigger"
      type="button"
      aria-label={`Options for ${alt.toLowerCase()}`}
      onClick={(event) => onSelect(slot, alt, event.currentTarget)}
    >
      <Image
        src={`/profile/photo?slot=${slot}&v=${revision}`}
        alt={alt}
        width={slot === "primary" ? 760 : 360}
        height={slot === "primary" ? 376 : 280}
        unoptimized
        onError={() => setFailed(true)}
      />
    </button>
  );
}
function PhotoCard({
  slot,
  hasPhoto,
  revision,
  disabled,
  feedback,
  busy,
  run,
}: {
  slot: string;
  hasPhoto: boolean;
  revision: number;
  disabled: boolean;
  feedback: ProfileResult;
  busy: boolean;
  run: (label: string, work: () => Promise<ProfileResult>) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [fileError, setFileError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);
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
        {fileError && (
          <p className="form-message error" role="alert">
            {fileError}
          </p>
        )}
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
      {slot !== "new" && !hasPhoto && (
        <p className="help">No photo added yet.</p>
      )}
      {slot !== "new" &&
        hasPhoto &&
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
      {preview && (
        <div className="photo-preview">
          <p className="help">
            Selected photo preview. It is private and has not been saved.
          </p>
          <Image
            className="owner-photo"
            src={preview}
            alt={`Preview for ${label.toLowerCase()}`}
            width={240}
            height={240}
            unoptimized
          />
        </div>
      )}
      <form
        className="photo-controls"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const photo = form.get("photo");
          if (
            !(photo instanceof File) ||
            photo.size === 0 ||
            photo.size > 5 * 1024 * 1024 ||
            !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
          ) {
            setFileError("Choose a JPG, PNG or WebP photo under 5 MB.");
            return;
          }
          setFileError("");
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
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setFileError("");
              if (!file) {
                setPreview(null);
                return;
              }
              if (
                file.size === 0 ||
                file.size > 5 * 1024 * 1024 ||
                !["image/jpeg", "image/png", "image/webp"].includes(file.type)
              ) {
                setPreview(null);
                setFileError("Choose a JPG, PNG or WebP photo under 5 MB.");
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
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
