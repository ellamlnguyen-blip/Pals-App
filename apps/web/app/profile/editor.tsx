"use client";
import Image from "next/image";
import Link from "next/link";
import { CameraIcon } from "@phosphor-icons/react/dist/csr/Camera";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { ProfileTopbar } from "./profile-topbar";
import type { StudentDestinations } from "../student-shell";
import { ProfileSummary } from "./profile-summary";
import { validShortBio } from "@pals/validation";
import { SignOutForm } from "../auth-change-signal";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
  type AuthTransitionMessage,
} from "../auth-transition";
import { PrimaryPhotoEditor } from "./primary-photo-editor";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OwnerProfile } from "@pals/types";
import {
  saveProfile,
  changePhoto,
  cleanupPhotos,
  reorderPhotos,
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
  const content = useRef<HTMLDivElement>(null);
  const concealedRef = useRef(false);
  const actionEpoch = useRef(0);
  const mutationBusy = useRef(false);
  const pendingAuth = useRef(new Set<string>());
  const [concealed, setConcealed] = useState(false);
  const gallery = useRef<HTMLDivElement>(null);
  const editPhotosButton = useRef<HTMLButtonElement>(null);
  const detailStatus = useRef<HTMLDivElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const editPanel = useRef<HTMLDivElement>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const viewPhotoButton = useRef<HTMLButtonElement>(null);
  const closePhotoButton = useRef<HTMLButtonElement>(null);
  const photoTrigger = useRef<HTMLButtonElement | null>(null);
  const skipPhotoFocusRestore = useRef(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    slot: string;
    label: string;
    revision: number;
    path: string | null;
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
  const [galleryPaths, setGalleryPaths] = useState(
    profile.additional_photo_paths,
  );
  const [galleryRevision, setGalleryRevision] = useState(profile.revision);

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
      concealedRef.current ||
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
    setGalleryPaths(profile.additional_photo_paths);
    setGalleryRevision(profile.revision);
  }, [editing, pending, profile, revision]);
  useEffect(() => {
    if (
      !concealedRef.current &&
      profile.revision >= galleryRevision &&
      (profile.revision !== galleryRevision ||
        galleryPaths.some((path) => path === "pending"))
    ) {
      setGalleryPaths(profile.additional_photo_paths);
      setGalleryRevision(profile.revision);
    }
  }, [profile, galleryRevision, galleryPaths]);
  useEffect(() => {
    if (concealedRef.current) return;
    if (restoreEditFocus.current && !editing && !pending) {
      editButton.current?.focus();
      restoreEditFocus.current = false;
    }
  }, [editing, pending]);
  const [photoSlot, setPhotoSlot] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{
    slot: string;
    revision: number;
    file?: File;
    replacing?: boolean;
  } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [primaryRevision, setPrimaryRevision] = useState<number | null>(null);
  useEffect(() => {
    const epochRef = actionEpoch;
    const conceal = () => {
      epochRef.current++;
      mutationBusy.current = false;
      concealedRef.current = true;
      if (content.current) content.current.style.display = "none";
      photoDialog.current?.close();
      setSelectedPhoto(null);
      setViewingPhoto(false);
      setCropTarget(null);
      setEditing(false);
      setPrimaryRevision(null);
      setGalleryPaths([]);
      setValues({});
      setSaved({});
      setFeedback({});
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
      /* Local transitions still conceal this editor. */
    }
    if (document.hidden) conceal();
    return () => {
      epochRef.current++;
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
  const openCrop = (slot: string, file?: File, replacing = false) => {
    if (concealedRef.current || pending || cropTarget) return;
    setPhotoSlot(slot);
    setFeedback({});
    setCropTarget({ slot, revision, file, replacing });
  };
  const openPrimary = () => openCrop("primary");
  useEffect(() => {
    if (!editing || concealedRef.current) return;
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
    const firstPhoto =
      gallery.current?.querySelector<HTMLButtonElement>("button");
    firstPhoto?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "center",
    });
    firstPhoto?.focus({ preventScroll: true });
  }
  function selectPhoto(
    slot: string,
    label: string,
    trigger: HTMLButtonElement,
  ) {
    photoTrigger.current = trigger;
    setSelectedPhoto({
      slot,
      label,
      revision,
      path:
        slot === "primary"
          ? profile.primary_photo_path
          : galleryPaths[Number(slot)],
    });
    setViewingPhoto(false);
    setViewPhotoFailed(false);
    photoDialog.current?.showModal();
  }
  function editSelectedPhoto(replacing = false) {
    const slot = selectedPhoto?.slot;
    if (
      !slot ||
      !selectedPhoto ||
      selectedPhoto.revision !== revision ||
      (slot !== "primary" && selectedPhoto.path !== galleryPaths[Number(slot)])
    ) {
      setFeedback({
        error:
          "Photos changed. Reload the latest profile before editing this photo.",
      });
      photoDialog.current?.close();
      router.refresh();
      return;
    }
    skipPhotoFocusRestore.current = true;
    photoDialog.current?.close();
    openCrop(slot, undefined, replacing);
  }
  function openEditor() {
    setFeedback({});
    setPhotoSlot(null);
    setEditing(true);
  }
  function signalPhotoChange() {
    window.dispatchEvent(new Event("pals-photo-invalidated"));
    try {
      const channel = new BroadcastChannel("pals-photo-invalidated");
      channel.postMessage(null);
      channel.close();
    } catch {
      // This tab still refreshes its authorized sources.
    }
  }
  function movePhoto(from: number, to: number) {
    if (
      concealedRef.current ||
      mutationBusy.current ||
      pending ||
      cropTarget ||
      galleryPaths.includes("pending") ||
      from < 0 ||
      to < 0 ||
      from >= galleryPaths.length ||
      to >= galleryPaths.length ||
      from === to
    )
      return;
    const next = [...galleryPaths];
    const [path] = next.splice(from, 1);
    next.splice(to, 0, path);
    const form = new FormData();
    form.set("revision", String(revision));
    form.set("paths", JSON.stringify(next));
    setPhotoSlot("order");
    run(
      "Saving photo order…",
      () => reorderPhotos(form),
      (result) => {
        if (!result.error && result.revision !== undefined) {
          setGalleryPaths(next);
          setGalleryRevision(result.revision);
          signalPhotoChange();
        }
      },
    );
  }
  function removeSelectedPhoto() {
    const slot = selectedPhoto?.slot;
    if (
      !slot ||
      slot === "primary" ||
      pending ||
      cropTarget ||
      mutationBusy.current
    )
      return;
    if (
      selectedPhoto?.revision !== revision ||
      selectedPhoto.path !== galleryPaths[Number(slot)]
    ) {
      setFeedback({
        error:
          "Photos changed. Reload the latest profile before deleting this photo.",
      });
      photoDialog.current?.close();
      router.refresh();
      return;
    }
    photoDialog.current?.close();
    const form = new FormData();
    form.set("revision", String(revision));
    form.set("slot", slot);
    form.set("operation", "remove");
    setPhotoSlot(slot);
    run(
      "Removing photo…",
      () => changePhoto(form),
      (result) => {
        if (!result.error && result.revision !== undefined) {
          const paths = [...galleryPaths];
          paths.splice(Number(slot), 1);
          setGalleryPaths(paths);
          setGalleryRevision(result.revision);
          signalPhotoChange();
        }
      },
    );
  }
  function run(
    label: string,
    work: () => Promise<ProfileResult>,
    done?: (result: ProfileResult) => void,
  ) {
    if (concealedRef.current || mutationBusy.current) return;
    mutationBusy.current = true;
    const epoch = actionEpoch.current;
    setBusyLabel(label);
    setFeedback({});
    startTransition(async () => {
      try {
        const result = await work();
        if (!mayApply(epoch)) return;
        setFeedback(result);
        if (result.cleanupNeeded !== undefined)
          setCleanupNeeded(result.cleanupNeeded);
        if (result.revision !== undefined) setRevision(result.revision);
        done?.(result);
        router.refresh();
        if (!result.error && label.includes("photo"))
          editPhotosButton.current?.focus();
        if (label === "Saving your profile…") detailStatus.current?.focus();
      } catch {
        if (!mayApply(epoch)) return;
        setFeedback({
          error:
            "We couldn’t finish that request. Your text is still here. Retry, or reload to check account access and the latest saved profile.",
        });
      } finally {
        mutationBusy.current = false;
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
      "aria-describedby": name === "bio" ? "bio-help" : undefined,
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
    <div
      ref={content}
      className="profile-page"
      aria-busy={pending}
      hidden={concealed}
    >
      <ProfileTopbar
        back="/hangouts"
        backLabel="Back to Hangouts"
        available={available}
        attendanceAvailable={attendanceAvailable}
        action={
          <button
            ref={editButton}
            className="profile-top-edit"
            type="button"
            disabled={pending}
            onClick={openEditor}
          >
            Edit profile
          </button>
        }
      >
        <p>
          Your confirmed address on an approved UNC domain is Pals’ campus
          access signal. Pals has not separately checked enrollment or identity.
        </p>
        <p>
          {peopleAvailable
            ? "Your selected text can appear in Pals after you opt in and meet its requirements. Photos, hometown and prompts are shared only if you separately turn on rich sharing; your email address and other private fields are not shown."
            : "Only you can see these profile details and photos right now."}
        </p>
        {peopleAvailable && (
          <>
            <Link href="/people/privacy">
              Preview and manage Pals and rich sharing
            </Link>
            <Link href="/notifications">Friend requests</Link>
          </>
        )}
        <p className="help">
          Your university and verified email are read-only: {email}
        </p>
      </ProfileTopbar>
      <div className="profile-hero">
        {profile.primary_photo_path || primaryRevision !== null ? (
          <OwnerDisplayPhoto
            key={`primary:${primaryRevision ?? profile.revision}`}
            slot="primary"
            revision={primaryRevision ?? profile.revision}
            alt="Your primary profile photo"
            onSelect={selectPhoto}
          />
        ) : (
          <div className="profile-hero-empty">
            <CameraIcon size={42} weight="duotone" aria-hidden="true" />
            <span>No photo yet</span>
            <button type="button" onClick={openPrimary}>
              Add your main photo
            </button>
          </div>
        )}
        {(profile.primary_photo_path || primaryRevision !== null) && (
          <button
            className="profile-portrait-edit"
            type="button"
            aria-label="Edit main photo"
            disabled={pending || editing}
            onClick={openPrimary}
          >
            <PencilSimpleIcon size={22} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
      <PrimaryPhotoEditor
        open={cropTarget !== null}
        slot={cropTarget?.slot ?? "primary"}
        initialFile={cropTarget?.file}
        replacing={cropTarget?.replacing}
        revision={cropTarget?.revision ?? revision}
        hasPhoto={
          cropTarget?.slot === "primary"
            ? !!profile.primary_photo_path || primaryRevision !== null
            : cropTarget?.slot !== "new"
        }
        onClose={() => setCropTarget(null)}
        onNeedsRefresh={() => router.refresh()}
        onSaved={(result) => {
          if (concealedRef.current) return;
          setFeedback(result);
          if (result.revision !== undefined) {
            setRevision(result.revision);
            if (cropTarget?.slot === "primary")
              setPrimaryRevision(result.revision);
            else {
              const paths = [...galleryPaths];
              if (cropTarget?.slot === "new") paths.push("pending");
              else if (cropTarget) paths[Number(cropTarget.slot)] = "pending";
              setGalleryPaths(paths);
              setGalleryRevision(result.revision);
            }
          }
          if (result.cleanupNeeded !== undefined)
            setCleanupNeeded(result.cleanupNeeded);
          router.refresh();
          signalPhotoChange();
        }}
      />
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
                    src={`/profile/photo?slot=${selectedPhoto.slot}&v=${selectedPhoto.revision}`}
                    alt={selectedPhoto.label}
                    width={1200}
                    height={selectedPhoto.slot === "primary" ? 1200 : 667}
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
                  disabled={pending || editing || !!cropTarget}
                  onClick={() =>
                    editSelectedPhoto(selectedPhoto.slot !== "primary")
                  }
                >
                  {selectedPhoto.slot === "primary"
                    ? "Edit photo"
                    : "Replace photo"}
                </button>
                {selectedPhoto.slot !== "primary" && (
                  <>
                    <label className="profile-photo-position">
                      Photo position
                      <select
                        value={selectedPhoto.slot}
                        disabled={
                          pending ||
                          !!cropTarget ||
                          galleryPaths.includes("pending")
                        }
                        onChange={(event) => {
                          const from = Number(selectedPhoto.slot);
                          const to = Number(event.target.value);
                          if (
                            selectedPhoto.revision !== revision ||
                            selectedPhoto.path !== galleryPaths[from]
                          ) {
                            setFeedback({
                              error:
                                "Photos changed. Reload the latest profile before reordering.",
                            });
                            photoDialog.current?.close();
                            router.refresh();
                            return;
                          }
                          skipPhotoFocusRestore.current = true;
                          photoDialog.current?.close();
                          editPhotosButton.current?.focus();
                          movePhoto(from, to);
                        }}
                      >
                        {galleryPaths.map((_, index) => (
                          <option key={index} value={index}>
                            Position {index + 1}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={pending || !!cropTarget}
                      onClick={() => editSelectedPhoto(false)}
                    >
                      Reposition photo
                    </button>
                    <button
                      type="button"
                      disabled={pending || !!cropTarget}
                      onClick={removeSelectedPhoto}
                    >
                      Delete photo
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </dialog>
      <ProfileSummary
        name={saved.real_name || "Your name"}
        hometown={profile.hometown}
        bio={
          profile.bio ||
          "Add a few words about yourself so future hangouts feel easier to start."
        }
        campus="UNC–Chapel Hill"
        major={profile.major || ""}
        graduationYear={profile.graduation_year}
        verified
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
        <div className="profile-gallery-heading">
          <h2 id="profile-gallery-heading">Photos</h2>
          <button ref={editPhotosButton} type="button" onClick={openPhotos}>
            Edit photos <span>(Optional)</span>
          </button>
        </div>
        <div className="profile-gallery" ref={gallery}>
          {Array.from({ length: 4 }, (_, index) => {
            const occupied = index < galleryPaths.length;
            const addable = index === galleryPaths.length;
            if (!occupied && !addable) return null;
            const slot = occupied ? String(index) : "new";
            return (
              <div
                className="profile-gallery-item"
                key={`${slot}:${galleryRevision}`}
              >
                {occupied && galleryPaths[index] === "pending" ? (
                  <div className="profile-gallery-loading" role="status">
                    Updating photo…
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                    >
                      Reload profile
                    </button>
                  </div>
                ) : occupied ? (
                  <div
                    draggable={
                      !pending &&
                      !cropTarget &&
                      !galleryPaths.includes("pending")
                    }
                    onDragStart={(event) => {
                      if (pending || cropTarget) {
                        event.preventDefault();
                        return;
                      }
                      setDragIndex(index);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", String(index));
                    }}
                    onDragOver={(event) => {
                      if (dragIndex !== null && !pending && !cropTarget)
                        event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragIndex !== null) movePhoto(dragIndex, index);
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                  >
                    <OwnerDisplayPhoto
                      slot={slot}
                      revision={galleryRevision}
                      alt={`Your extra photo ${index + 1}`}
                      onSelect={selectPhoto}
                    />
                  </div>
                ) : (
                  <button
                    className="profile-gallery-empty"
                    type="button"
                    disabled={
                      pending ||
                      !!cropTarget ||
                      galleryPaths.includes("pending")
                    }
                    onClick={() => openCrop("new")}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files[0];
                      if (file && !galleryPaths.includes("pending"))
                        openCrop("new", file);
                    }}
                  >
                    Add photo {index + 1} · choose or drop
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {photoSlot !== null && feedback.error && (
          <p className="form-message error" role="alert">
            {feedback.error}
          </p>
        )}
        {photoSlot !== null && feedback.success && (
          <p className="form-message" role="status">
            {feedback.success}
          </p>
        )}
        {cleanupNeeded && (
          <div className="profile-cleanup-notice">
            <p>Unused uploads may still be stored privately.</p>
            <button
              type="button"
              className="text-button"
              disabled={pending || editing}
              onClick={() => {
                setPhotoSlot("cleanup");
                run("Checking unused photos…", cleanupPhotos);
              }}
            >
              {pending && photoSlot === "cleanup"
                ? "Checking unused photos…"
                : "Retry cleanup"}
            </button>
          </div>
        )}
      </section>
      {profile.interests.length > 0 && (
        <section
          className="profile-interests"
          aria-labelledby="profile-interests-heading"
        >
          <h2 id="profile-interests-heading">Interests</h2>
          <ul>
            {profile.interests.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
      <section
        className="profile-prompts"
        aria-labelledby="profile-prompts-heading"
      >
        <h2 id="profile-prompts-heading" className="visually-hidden">
          Conversation prompts
        </h2>
        {profile.prompts.length ? (
          profile.prompts.map((prompt, index) => (
            <div className="profile-prompt" key={index}>
              <h2>{prompt.question}</h2>
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
            if (
              values.bio.trim() !== (profile.bio ?? "").trim() &&
              !validShortBio(values.bio)
            ) {
              setFeedback({
                error: "Keep your bio to two sentences and 2,000 characters.",
              });
              document.getElementById("bio")?.focus();
              return;
            }
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
              {field("real_name", "Real name", 100, true)}
              <p className="help">
                Your name also appears in Account. Your school and confirmed
                email stay read-only.
              </p>
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
              <p className="help" id="bio-help">
                Up to two sentences and 2,000 characters. Periods in web
                addresses and common titles such as Dr. do not count as sentence
                breaks.
              </p>
              {values.bio.trim() !== (profile.bio ?? "").trim() &&
                values.bio.trim() &&
                !validShortBio(values.bio) && (
                  <p className="form-message" role="status">
                    Keep your bio to two sentences.
                  </p>
                )}
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
      <nav className="profile-owner-links" aria-label="Your account and safety">
        <Link href="/safety">Safety</Link>
        <Link href="/account/analytics">Analytics</Link>
        {attendanceAvailable && <Link href="/attendance">Attendance</Link>}
        <Link href="/account">Account</Link>
        <SignOutForm />
      </nav>
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
      {slot !== "primary" && (
        <span className="profile-gallery-edit-icon" aria-hidden="true">
          <PencilSimpleIcon size={20} weight="bold" />
        </span>
      )}
    </button>
  );
}
