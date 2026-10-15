"use client";

import Cropper, { type Area, type CropperProps } from "react-easy-crop";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { changePhoto, type ProfileResult } from "./actions";
import {
  AUTH_TRANSITION_CHANNEL,
  AUTH_TRANSITION_EVENT,
} from "../auth-transition";

const maxBytes = 5 * 1024 * 1024;
const accepted = ["image/jpeg", "image/png", "image/webp"];
// The package's exported class render type uses global JSX; React 19's types
// expose that namespace differently. Runtime props remain the package API.
const CropperControl = Cropper as unknown as ComponentType<
  Partial<CropperProps> &
    Pick<CropperProps, "image" | "crop" | "zoom" | "onCropChange">
>;

function squareFile(src: string, area: Area): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (
        image.naturalWidth * image.naturalHeight > 20_000_000 ||
        Math.min(image.naturalWidth, image.naturalHeight) < 256 ||
        !Number.isFinite(area.x + area.y + area.width + area.height) ||
        area.width < 128 ||
        area.height < 128
      ) {
        reject(
          new Error(
            "Choose a still photo with at least 256 pixels on its short side and a clear crop.",
          ),
        );
        return;
      }
      const size = Math.min(
        1024,
        Math.floor(Math.min(area.width, area.height)),
      );
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context)
        return reject(
          new Error("The photo could not be prepared on this device."),
        );
      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        size,
        size,
      );
      canvas.toBlob((blob) => {
        canvas.width = canvas.height = 0;
        if (!blob || blob.size > maxBytes)
          return reject(
            new Error("The edited photo is too large. Try a different crop."),
          );
        resolve(new File([blob], "profile.png", { type: "image/png" }));
      }, "image/png");
    };
    image.onerror = () =>
      reject(
        new Error(
          "The photo could not be opened. Choose another JPG, PNG or WebP.",
        ),
      );
    image.src = src;
  });
}

export function PrimaryPhotoEditor({
  open,
  revision,
  hasPhoto,
  onClose,
  onSaved,
  onNeedsRefresh,
}: {
  open: boolean;
  revision: number;
  hasPhoto: boolean;
  onClose: () => void;
  onSaved: (result: ProfileResult) => void;
  onNeedsRefresh: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const objectUrl = useRef<string | null>(null);
  const busyRef = useRef(false);
  const generation = useRef(0);
  const wasOpen = useRef(false);
  const onCloseRef = useRef(onClose);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [baseRevision, setBaseRevision] = useState(revision);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [invalidSource, setInvalidSource] = useState(false);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      node.showModal();
      chooseButton.current?.focus({ preventScroll: true });
      setBaseRevision(revision);
      setNeedsRefresh(false);
      setInvalidSource(false);
      setSrc(hasPhoto ? `/profile/photo?v=${revision}` : null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
      setError("");
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      if (node.open) node.close();
    }
  }, [open, hasPhoto, revision]);

  useEffect(() => {
    if (!src) return;
    let active = true;
    const probe = new Image();
    probe.onload = () => {
      if (!active) return;
      const invalid =
        probe.naturalWidth * probe.naturalHeight > 20_000_000 ||
        Math.min(probe.naturalWidth, probe.naturalHeight) < 256;
      setInvalidSource(invalid);
      if (invalid)
        setError(
          "Choose a photo with at least 256 pixels on its short side and no more than 20 megapixels.",
        );
    };
    probe.onerror = () => {
      if (!active) return;
      setInvalidSource(true);
      setError("This photo could not load. Choose another JPG, PNG or WebP.");
    };
    probe.src = src;
    return () => {
      active = false;
      probe.src = "";
    };
  }, [src]);

  useEffect(() => {
    const currentGeneration = generation;
    const authChannel = new BroadcastChannel(AUTH_TRANSITION_CHANNEL);
    const invalidate = () => {
      currentGeneration.current++;
      busyRef.current = false;
      setBusy(false);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
      setSrc(null);
      dialog.current?.close();
      onCloseRef.current();
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") invalidate();
    };
    window.addEventListener(AUTH_TRANSITION_EVENT, invalidate);
    authChannel.addEventListener("message", invalidate);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener(AUTH_TRANSITION_EVENT, invalidate);
      authChannel.removeEventListener("message", invalidate);
      authChannel.close();
      document.removeEventListener("visibilitychange", onHidden);
      currentGeneration.current++;
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    };
  }, []);

  function chooseFile(file?: File) {
    if (busyRef.current) return;
    if (!file) return;
    if (!accepted.includes(file.type) || !file.size || file.size > maxBytes) {
      setError("Choose a still JPG, PNG or WebP under 5 MB.");
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(file);
    setSrc(objectUrl.current);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError("");
    setInvalidSource(false);
  }
  function close() {
    if (busyRef.current) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setSrc(null);
    onClose();
  }
  async function save() {
    if (busyRef.current || !src || !area) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    const current = ++generation.current;
    try {
      const file = await squareFile(src, area);
      // Canvas decode/export is asynchronous. An auth or lifecycle transition
      // can invalidate this actor before any server action has begun.
      if (generation.current !== current) return;
      const form = new FormData();
      form.set("photo", file);
      form.set("revision", String(baseRevision));
      form.set("slot", "primary");
      form.set("operation", "replace");
      const result = await changePhoto(form);
      if (generation.current !== current) return;
      if (result.error) {
        setError(result.error);
        if (result.requiresRefresh) {
          setNeedsRefresh(true);
          onNeedsRefresh();
        }
        return;
      }
      onSaved(result);
      closeAfterSave();
    } catch (cause) {
      if (generation.current === current)
        setError(
          cause instanceof Error
            ? cause.message
            : "The photo could not save. Please retry.",
        );
    } finally {
      if (generation.current === current) {
        busyRef.current = false;
        setBusy(false);
      }
    }
  }
  function closeAfterSave() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setSrc(null);
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="profile-crop-dialog"
      aria-label="Edit main photo"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (open && !busyRef.current) onClose();
      }}
    >
      <div className="profile-crop-content">
        <h2>Edit main photo</h2>
        <p>Drag to position your photo in the circle, then save it.</p>
        <div
          className="profile-crop-drop"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (busyRef.current) return;
            chooseFile(event.dataTransfer.files[0]);
          }}
        >
          {src ? (
            <CropperControl
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={(next) => {
                if (!busyRef.current) setCrop(next);
              }}
              onCropComplete={(_, pixels) => {
                if (!busyRef.current) setArea(pixels);
              }}
              onZoomChange={(next) => {
                if (!busyRef.current) setZoom(next);
              }}
              onTouchRequest={() => !busyRef.current}
              onWheelRequest={() => !busyRef.current}
              onMediaLoaded={({ naturalWidth, naturalHeight }) => {
                const invalid =
                  naturalWidth * naturalHeight > 20_000_000 ||
                  Math.min(naturalWidth, naturalHeight) < 256;
                setInvalidSource(invalid);
                if (invalid) {
                  setError(
                    "Choose a photo with at least 256 pixels on its short side and no more than 20 megapixels.",
                  );
                }
              }}
            />
          ) : (
            <p>Drop a photo here or choose one below.</p>
          )}
        </div>
        <input
          ref={picker}
          className="visually-hidden"
          tabIndex={-1}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="profile-crop-tools">
          <button
            ref={chooseButton}
            type="button"
            disabled={busy}
            onClick={() => picker.current?.click()}
          >
            Choose photo
          </button>
          <label>
            Zoom
            <input
              aria-label="Zoom photo"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              disabled={!src || busy}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            disabled={!src || busy}
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
          >
            Reset
          </button>
        </div>
        {error && (
          <p className="form-message error" role="alert">
            {error}
          </p>
        )}
        {needsRefresh && (
          <p className="help">
            Check the latest saved photo, then reopen this editor if you still
            want to replace it.
          </p>
        )}
        <p className="help">
          Use arrow keys while the crop is focused to adjust its position. Pinch
          or scroll to zoom.
        </p>
        <div className="profile-crop-actions">
          <button type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!src || !area || busy || needsRefresh || invalidSource}
            onClick={save}
          >
            {busy ? "Saving…" : "Save photo"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
