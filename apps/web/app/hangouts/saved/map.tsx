"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  campusViewport,
  readViewport,
  rememberViewport,
} from "./browse-context";
import { UNC_CENTER, campusLocation } from "../fixtures";
import {
  UNC_BOUNDS,
  type Bounds,
  type SavedPin,
} from "../../../lib/saved-hangouts-types";
import { pinCue, pinPeriod } from "./pin-cue";

export function SavedMap({
  token,
  items,
  selected,
  onSelect,
  onLeave,
  onBounds,
  onSettled,
  children,
}: {
  token: string;
  items: SavedPin[];
  selected: string | null;
  onSelect: (
    id: string,
    trigger: HTMLElement,
    moveFocus?: boolean,
    pointerOver?: boolean,
  ) => void;
  onLeave: (trigger: HTMLElement) => void;
  onBounds: (bounds: Bounds | null) => void;
  onSettled: () => void;
  children?: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const selectedRef = useRef(selected);
  const callback = useRef(onBounds);
  const choose = useRef(onSelect);
  const leave = useRef(onLeave);
  const settled = useRef(onSettled);
  const located = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState(
    "Location is optional. Pins are approximate Hangout areas, never people.",
  );
  useEffect(() => {
    callback.current = onBounds;
    choose.current = onSelect;
    leave.current = onLeave;
    settled.current = onSettled;
  }, [onBounds, onSelect, onLeave, onSettled]);
  useEffect(() => {
    if (!token.startsWith("pk.") || !container.current) {
      setState("error");
      settled.current();
      return;
    }
    const activeMarkers = markers.current;
    let disposed = false;
    let map: MapboxMap | undefined;
    const deadline = window.setTimeout(() => {
      if (!disposed) {
        setState("error");
        settled.current();
      }
    }, 20000);
    async function initialize() {
      const mapbox = (await import("mapbox-gl")).default;
      if (disposed || !container.current) return;
      const previous = readViewport();
      map = new mapbox.Map({
        container: container.current,
        accessToken: token,
        style: "mapbox://styles/mapbox/streets-v12",
        center: previous ? [previous.longitude, previous.latitude] : UNC_CENTER,
        zoom: previous?.zoom ?? 15,
        minZoom: 10,
        maxZoom: 19,
        attributionControl: true,
        renderWorldCopies: false,
        performanceMetricsCollection: false,
      });
      mapRef.current = map;
      map.addControl(
        new mapbox.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      map
        .getCanvas()
        .setAttribute(
          "aria-label",
          "Saved Hangouts map. Arrow keys pan; plus and minus zoom.",
        );
      const moved = () => {
        if (!map || disposed) return;
        const b = map.getBounds();
        if (!b) return;
        const bounds = {
          west: Math.max(UNC_BOUNDS.west, b.getWest()),
          south: Math.max(UNC_BOUNDS.south, b.getSouth()),
          east: Math.min(UNC_BOUNDS.east, b.getEast()),
          north: Math.min(UNC_BOUNDS.north, b.getNorth()),
        };
        // Remember only a coarse, campus-bounded manually explored camera.
        // Locate-me orientation is excluded from return memory.
        if (!located.current) {
          const center = map.getCenter();
          rememberViewport(
            campusViewport(
              {
                longitude: center.lng,
                latitude: center.lat,
                zoom: map.getZoom(),
              },
              UNC_BOUNDS,
            ),
          );
        }
        callback.current(
          bounds.west < bounds.east && bounds.south < bounds.north
            ? bounds
            : null,
        );
      };
      map.on("load", () => {
        if (disposed) return;
        window.clearTimeout(deadline);
        setState("ready");
        moved();
        settled.current();
      });
      map.on("dragstart", () => {
        located.current = false;
      });
      map.on("moveend", moved);
      map.on("error", () => {
        if (!disposed) {
          window.clearTimeout(deadline);
          setState("error");
          settled.current();
        }
      });
    }
    void initialize().catch(() => {
      if (!disposed) {
        setState("error");
        settled.current();
      }
    });
    return () => {
      disposed = true;
      window.clearTimeout(deadline);
      activeMarkers.forEach((m) => m.remove());
      activeMarkers.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [token, attempt]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || state !== "ready") return;
    let cancelled = false;
    const activeMarkers = markers.current;
    void import("mapbox-gl").then(({ default: mapbox }) => {
      if (cancelled || mapRef.current !== map) return;
      const visible = new Set(items.map((item) => item.id));
      for (const [id, marker] of activeMarkers) {
        if (!visible.has(id)) {
          marker.remove();
          activeMarkers.delete(id);
        }
      }
      items.forEach((item) => {
        if (cancelled || mapRef.current !== map) return;
        const existing = activeMarkers.get(item.id);
        if (existing) {
          const button = existing.getElement();
          const period = pinPeriod(item, new Date());
          button.querySelector(".saved-pin-cue")!.textContent = pinCue(item);
          button.dataset.period = period;
          button.setAttribute(
            "aria-label",
            `Preview ${period === "thisWeek" ? "this week" : period} Hangout: ${item.title}`,
          );
          existing.setLngLat([item.public_longitude, item.public_latitude]);
          return;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-pin saved-pin";
        const cue = document.createElement("span");
        cue.className = "saved-pin-cue";
        cue.textContent = pinCue(item);
        button.append(cue);
        const period = pinPeriod(item, new Date());
        button.dataset.period = period;
        button.setAttribute(
          "aria-label",
          `Preview ${period === "thisWeek" ? "this week" : period} Hangout: ${item.title}`,
        );
        button.setAttribute(
          "aria-pressed",
          String(selectedRef.current === item.id),
        );
        button.addEventListener("pointerenter", () =>
          choose.current(item.id, button, false, true),
        );
        button.addEventListener("pointerleave", () => leave.current(button));
        button.addEventListener("blur", () => leave.current(button));
        button.addEventListener("focus", () =>
          choose.current(item.id, button, false),
        );
        button.addEventListener("click", () =>
          choose.current(item.id, button, true),
        );
        const marker = new mapbox.Marker({ element: button })
          .setLngLat([item.public_longitude, item.public_latitude])
          .addTo(map);
        button.setAttribute("role", "button");
        activeMarkers.set(item.id, marker);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [items, state]);
  useEffect(() => {
    selectedRef.current = selected;
    for (const [id, marker] of markers.current)
      marker.getElement().setAttribute("aria-pressed", String(id === selected));
  }, [selected, items]);
  function locate() {
    const map = mapRef.current;
    if (!map || !navigator.geolocation) {
      setMessage("Location is unavailable. Explore with the map or list.");
      return;
    }
    setMessage("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (mapRef.current !== map) return;
        const center = campusLocation(
          position.coords.longitude,
          position.coords.latitude,
        );
        located.current = true;
        rememberViewport(null);
        map.jumpTo({ center: center ?? UNC_CENTER, zoom: 15 });
        setMessage(
          center
            ? "Map centered near you. Your location was not saved or shared."
            : "Outside the UNC area. Keeping the map on campus.",
        );
      },
      () => setMessage("Location unavailable. Explore with the map or list."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }
  const ready = state === "ready";
  return (
    <div className="map-column">
      <div
        className="map-frame saved-map-frame"
        aria-label="Saved Hangout areas around UNC"
      >
        <div className="map-canvas" ref={container} data-ready={ready} />
        {children}
        <div className="saved-map-tools" aria-label="Map controls">
          <button
            className="saved-map-tool"
            disabled={!ready}
            onClick={() => {
              located.current = false;
              mapRef.current?.jumpTo({ center: UNC_CENTER, zoom: 15 });
            }}
            aria-label="Back to UNC"
            title="Back to UNC"
          >
            ⌂
          </button>
          <button
            className="saved-map-tool"
            disabled={!ready}
            onClick={locate}
            aria-label="Locate me"
            title="Locate me"
          >
            ◎
          </button>
        </div>
        {!ready && (
          <div className="map-state" role="status">
            <span className="map-state-label">UNC Chapel Hill</span>
            <h2>
              {state === "error"
                ? "The map couldn't load"
                : "Loading the campus map…"}
            </h2>
            <p>
              The saved Hangout list remains available without the map or
              location permission.
            </p>
            {state === "error" && token.startsWith("pk.") && (
              <button
                className="button"
                onClick={() => {
                  setState("loading");
                  setAttempt((v) => v + 1);
                }}
              >
                Retry map
              </button>
            )}
          </div>
        )}
      </div>
      <p className="map-help" role="status">
        {message}
      </p>
    </div>
  );
}
