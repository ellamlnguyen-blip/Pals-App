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

function croppedFile(src: string, area: Area, primary: boolean): Promise<File> {
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
      const width = Math.min(primary ? 1024 : 1440, Math.floor(area.width));
      const height = primary ? width : Math.round(width / 1.8);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
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
        width,
        height,
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

async function sourceDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  if (
    file.type === "image/png" &&
    bytes.length >= 24 &&
    bytes
      .slice(0, 8)
      .every(
        (value, index) => value === [137, 80, 78, 71, 13, 10, 26, 10][index],
      )
  )
    return { width: view.getUint32(16), height: view.getUint32(20) };
  if (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      )
        return {
          width: view.getUint16(offset + 7),
          height: view.getUint16(offset + 5),
        };
      offset += length + 2;
    }
  }
  if (
    file.type === "image/webp" &&
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X")
      return {
        width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
        height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
      };
    if (chunk === "VP8L" && bytes[20] === 0x2f)
      return {
        width: 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]),
        height:
          1 +
          (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | (bytes[22] >> 6)),
      };
    if (chunk === "VP8 " && bytes.length >= 30)
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
  }
  throw new Error(
    "This photo could not be read. Choose another still JPG, PNG or WebP.",
  );
}

export function PrimaryPhotoEditor({
  slot = "primary",
  initialFile,
  replacing = false,
  open,
  revision,
  hasPhoto,
  onClose,
  onSaved,
  onNeedsRefresh,
}: {
  slot?: string;
  initialFile?: File | null;
  replacing?: boolean;
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
  const selection = useRef(0);
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
      setSrc(hasPhoto ? `/profile/photo?slot=${slot}&v=${revision}` : null);
      if (initialFile) chooseFile(initialFile);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
      setError("");
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      if (node.open) node.close();
    }
  }, [open, hasPhoto, revision, slot, initialFile]);

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
      selection.current++;
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

  async function chooseFile(file?: File) {
    if (busyRef.current || !file) return;
    const selected = ++selection.current;
    if (!accepted.includes(file.type) || !file.size || file.size > maxBytes) {
      setInvalidSource(true);
      setError("Choose a still JPG, PNG or WebP under 5 MB.");
      return;
    }
    try {
      const { width, height } = await sourceDimensions(file);
      if (selected !== selection.current) return;
      if (
        !width ||
        !height ||
        width * height > 20_000_000 ||
        Math.min(width, height) < 256
      ) {
        setInvalidSource(true);
        setError(
          "Choose a photo with at least 256 pixels on its short side and no more than 20 megapixels.",
        );
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
    } catch (cause) {
      if (selected === selection.current) {
        setInvalidSource(true);
        setError(
          cause instanceof Error
            ? cause.message
            : "This photo could not be read.",
        );
      }
    }
  }
  function close() {
    if (busyRef.current) return;
    selection.current++;
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
      const file = await croppedFile(src, area, slot === "primary");
      // Canvas decode/export is asynchronous. An auth or lifecycle transition
      // can invalidate this actor before any server action has begun.
      if (generation.current !== current) return;
      const form = new FormData();
      form.set("photo", file);
      form.set("revision", String(baseRevision));
      form.set("slot", slot);
      form.set("operation", slot === "new" ? "add" : "replace");
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
    selection.current++;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setSrc(null);
    onClose();
  }
  return (
    <dialog
      ref={dialog}
      className="profile-crop-dialog"
      aria-label={slot === "primary" ? "Edit main photo" : "Edit extra photo"}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (open && !busyRef.current) onClose();
      }}
    >
      <div className="profile-crop-content">
        <h2>
          {slot === "primary"
            ? "Edit main photo"
            : slot === "new"
              ? "Add extra photo"
              : replacing
                ? "Replace extra photo"
                : "Reposition extra photo"}
        </h2>
        <p>
          {replacing
            ? "Choose a new photo, then drag to position it"
            : "Drag to position your photo"}{" "}
          in the {slot === "primary" ? "circle" : "rectangle"}, then save it.
        </p>
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
              aspect={slot === "primary" ? 1 : 1.8}
              cropShape={slot === "primary" ? "round" : "rect"}
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
