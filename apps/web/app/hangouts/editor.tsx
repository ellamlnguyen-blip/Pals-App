"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { campusLocal } from "../../lib/hangout-time";
import type { OwnedHangout } from "../../lib/hangouts";
import {
  createHangout,
  editHangout,
  type HangoutInput,
  type HangoutResult,
} from "./actions";
import { UNC_CENTER } from "./fixtures";

type Props = { token: string; existing?: OwnedHangout };
function initial(existing?: OwnedHangout): HangoutInput {
  return {
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    startsLocal: existing ? campusLocal(existing.starts_at) : "",
    endsLocal: existing?.ends_at ? campusLocal(existing.ends_at) : "",
    publicPlace: existing?.public_place ?? "",
    latitude: existing ? String(existing.public_latitude) : "",
    longitude: existing ? String(existing.public_longitude) : "",
    campusZone: existing?.campus_zone ?? "",
    privateInstructions: existing?.private_instructions ?? "",
  };
}
function PublicAreaPicker({
  token,
  value,
  disabled,
  onPick,
}: {
  token: string;
  value: HangoutInput;
  disabled: boolean;
  onPick: (latitude: string, longitude: string) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    if (!token.startsWith("pk.") || !element.current) {
      setState("error");
      return;
    }
    let disposed = false,
      map: MapboxMap | undefined,
      marker: Marker | undefined;
    const timer = window.setTimeout(() => {
      if (!disposed) setState("error");
    }, 20000);
    void import("mapbox-gl")
      .then((mapbox) => {
        if (disposed || !element.current) return;
        map = new mapbox.default.Map({
          container: element.current,
          accessToken: token,
          style: window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "mapbox://styles/mapbox/dark-v11"
            : "mapbox://styles/mapbox/light-v11",
          center: UNC_CENTER,
          zoom: 14,
          minZoom: 12,
          maxZoom: 16,
          renderWorldCopies: false,
          performanceMetricsCollection: false,
        });
        mapRef.current = map;
        map.addControl(
          new mapbox.default.NavigationControl({ showCompass: false }),
          "top-right",
        );
        map.on("load", () => {
          window.clearTimeout(timer);
          if (!disposed) setState("ready");
        });
        map.on("error", () => {
          if (!disposed) setState("error");
        });
        map.on("click", (event) => {
          if (disposed || disabledRef.current) return;
          const { lat, lng } = event.lngLat;
          if (lat < 35.85 || lat > 35.97 || lng < -79.13 || lng > -78.98)
            return;
          onPick(
            String(Number(lat.toFixed(3))),
            String(Number(lng.toFixed(3))),
          );
        });
        if (value.latitude && value.longitude) {
          marker = new mapbox.default.Marker({ color: "#35698e" })
            .setLngLat([Number(value.longitude), Number(value.latitude)])
            .addTo(map);
          markerRef.current = marker;
        }
      })
      .catch(() => {
        if (!disposed) setState("error");
      });
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      marker?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
    // Recreate only for the token; manual coordinates remain the accessible source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  useEffect(() => {
    if (!mapRef.current || !value.latitude || !value.longitude) return;
    const lat = Number(value.latitude),
      lng = Number(value.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (markerRef.current) markerRef.current.setLngLat([lng, lat]);
    else
      void import("mapbox-gl").then((mapbox) => {
        if (mapRef.current && !markerRef.current)
          markerRef.current = new mapbox.default.Marker({ color: "#35698e" })
            .setLngLat([lng, lat])
            .addTo(mapRef.current);
      });
  }, [value.latitude, value.longitude]);
  return (
    <div className="area-map-wrap">
      <div
        ref={element}
        className="area-map"
        aria-label="Map of UNC. Click a broad campus area to fill approximate coordinates."
      />
      {state !== "ready" && (
        <p className="area-map-state" role="status">
          {state === "loading"
            ? "Loading campus map…"
            : "Map unavailable. Enter a broad campus area and approximate coordinates below."}
        </p>
      )}
      {value.latitude && value.longitude && (
        <p className="help" role="status">
          Selected approximate area: {Number(Number(value.latitude).toFixed(3))}
          , {Number(Number(value.longitude).toFixed(3))}
        </p>
      )}
      <p className="help">
        Click a broad area. The selected coordinate is rounded to about 100
        meters; check that your public label is equally broad. Manual entry
        works without the map.
      </p>
    </div>
  );
}
export function HangoutEditor({ token, existing }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<HangoutInput>(() => initial(existing));
  const [revision, setRevision] = useState(existing?.revision ?? 0);
  const [result, setResult] = useState<HangoutResult | null>(null);
  const [pending, startTransition] = useTransition();
  const request = useRef<string | null>(null);
  const attempted = useRef<HangoutInput | null>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const set = (key: keyof HangoutInput, value: string) =>
    setValues((old) => ({ ...old, [key]: value }));
  const locked = result?.kind === "uncertain" && !existing;
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const replay = attempted.current !== null;
    const payload = attempted.current ?? { ...values };
    if (!existing) {
      request.current ??= crypto.randomUUID();
      attempted.current ??= payload;
    }
    setResult(null);
    startTransition(async () => {
      try {
        const response = existing
          ? await editHangout(
              JSON.stringify({ id: existing.id, revision, input: payload }),
            )
          : await createHangout(
              JSON.stringify({
                requestId: request.current!,
                input: payload,
                replay,
              }),
            );
        setResult(response);
        if (response.kind === "saved") {
          setRevision(response.revision);
          attempted.current = null;
          router.push(`/hangouts/owned/${response.id}`);
          router.refresh();
        } else if (response.kind !== "uncertain" && !existing && !replay) {
          request.current = null;
          attempted.current = null;
        }
      } catch {
        setResult({
          kind: "uncertain",
          message: existing
            ? "The edit response was interrupted. Reload this Hangout to review the latest saved details before trying again."
            : "The create response was interrupted. Your entries are held for a safe retry using the same request.",
        });
      } finally {
        window.setTimeout(() => feedback.current?.focus(), 0);
      }
    });
  }
  return (
    <form className="hangout-editor" onSubmit={save} aria-busy={pending}>
      <div className="hangout-editor-main form-stack">
        <label>
          What are you planning?
          <input
            required
            maxLength={120}
            value={values.title}
            disabled={pending || locked}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Anyone up for tacos?"
          />
        </label>
        <label>
          Starts · America/New_York
          <input
            required
            type="datetime-local"
            value={values.startsLocal}
            disabled={pending || locked}
            onChange={(e) => set("startsLocal", e.target.value)}
          />
        </label>
        <p className="help">
          Enter UNC campus time. Times skipped or repeated when clocks change
          need another choice.
        </p>
        <label>
          Ends · optional
          <input
            type="datetime-local"
            value={values.endsLocal}
            disabled={pending || locked}
            onChange={(e) => set("endsLocal", e.target.value)}
          />
        </label>
        <label>
          What should people know? · optional
          <textarea
            maxLength={2000}
            rows={4}
            value={values.description}
            disabled={pending || locked}
            onChange={(e) => set("description", e.target.value)}
          />
        </label>
        <div className="hangout-private">
          <h2>Meeting instructions</h2>
          <p className="help">
            Participant only. Share an exact meeting point here if needed. These
            details are separate from the public area.
          </p>
          <label>
            Private instructions · optional
            <textarea
              maxLength={2000}
              rows={4}
              value={values.privateInstructions}
              disabled={pending || locked}
              onChange={(e) => set("privateInstructions", e.target.value)}
              placeholder="Meet at the front entrance…"
            />
          </label>
          {existing && (
            <p className="help">
              Clear this field and save to remove previous instructions.
            </p>
          )}
        </div>
      </div>
      <div className="hangout-editor-area form-stack">
        <div>
          <h2>Public area</h2>
          <p className="help">
            Visible to ready UNC students. Choose an approximate campus area,
            never a home address or the private meeting point.
          </p>
        </div>
        <PublicAreaPicker
          token={token}
          value={values}
          disabled={pending || locked}
          onPick={(latitude, longitude) =>
            setValues((old) => ({ ...old, latitude, longitude }))
          }
        />
        <label>
          Broad public place label
          <input
            required
            maxLength={120}
            value={values.publicPlace}
            disabled={pending || locked}
            onChange={(e) => set("publicPlace", e.target.value)}
            placeholder="Around Polk Place"
          />
        </label>
        <label>
          Campus area · optional
          <input
            maxLength={80}
            value={values.campusZone}
            disabled={pending || locked}
            onChange={(e) => set("campusZone", e.target.value)}
            placeholder="Central campus"
          />
        </label>
        <div className="field-pair">
          <label>
            Approx. latitude
            <input
              required
              type="number"
              min="35.85"
              max="35.97"
              step="any"
              value={values.latitude}
              disabled={pending || locked}
              onChange={(e) => set("latitude", e.target.value)}
            />
          </label>
          <label>
            Approx. longitude
            <input
              required
              type="number"
              min="-79.13"
              max="-78.98"
              step="any"
              value={values.longitude}
              disabled={pending || locked}
              onChange={(e) => set("longitude", e.target.value)}
            />
          </label>
        </div>
        <p className="help">
          Campus visibility only. Restricted audiences and eligibility are
          unavailable in this local increment.
        </p>
      </div>
      <div className="hangout-editor-actions">
        <div ref={feedback} tabIndex={-1} aria-live="polite">
          {pending && <p role="status">Saving Hangout…</p>}
          {result && result.kind !== "saved" && (
            <p className="form-message error" role="alert">
              {result.message}
            </p>
          )}
          {result?.kind === "conflict" && existing && (
            <Link
              href={`/hangouts/owned/${existing.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open latest saved details in another tab
            </Link>
          )}
          {result?.kind === "uncertain" && existing && (
            <Link
              href={`/hangouts/owned/${existing.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Check saved details in another tab
            </Link>
          )}
          {locked && (
            <p className="help">
              Your original details are held for retry. Check your Hangouts
              first if the response was lost.
            </p>
          )}
        </div>
        <button
          className="button"
          type="submit"
          disabled={pending || (existing && result?.kind === "uncertain")}
        >
          {pending
            ? "Saving…"
            : locked
              ? "Retry same creation"
              : existing
                ? "Save changes"
                : "Create Hangout"}
        </button>
        <Link
          className="quiet-button"
          href={existing ? `/hangouts/owned/${existing.id}` : "/hangouts"}
        >
          Cancel and discard changes
        </Link>
      </div>
    </form>
  );
}
