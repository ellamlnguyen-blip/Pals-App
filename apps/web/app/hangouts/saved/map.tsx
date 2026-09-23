"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { UNC_CENTER, campusLocation } from "../fixtures";
import {
  UNC_BOUNDS,
  type Bounds,
  type SavedPin,
} from "../../../lib/saved-hangouts-types";

export function SavedMap({
  token,
  items,
  selected,
  onSelect,
  onBounds,
}: {
  token: string;
  items: SavedPin[];
  selected: string | null;
  onSelect: (id: string, trigger: HTMLElement) => void;
  onBounds: (bounds: Bounds | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const selectedRef = useRef(selected);
  const callback = useRef(onBounds);
  const choose = useRef(onSelect);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState(
    "Location is optional. Pins are approximate Hangout areas, never people.",
  );
  useEffect(() => {
    callback.current = onBounds;
    choose.current = onSelect;
  }, [onBounds, onSelect]);
  useEffect(() => {
    if (!token.startsWith("pk.") || !container.current) {
      setState("error");
      return;
    }
    const activeMarkers = markers.current;
    let disposed = false;
    let map: MapboxMap | undefined;
    const deadline = window.setTimeout(() => {
      if (!disposed) setState("error");
    }, 20000);
    async function initialize() {
      const mapbox = (await import("mapbox-gl")).default;
      if (disposed || !container.current) return;
      map = new mapbox.Map({
        container: container.current,
        accessToken: token,
        style: window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/light-v11",
        center: UNC_CENTER,
        zoom: 14,
        minZoom: 10,
        maxZoom: 19,
        attributionControl: true,
        renderWorldCopies: false,
        performanceMetricsCollection: false,
      });
      mapRef.current = map;
      map.addControl(
        new mapbox.NavigationControl({ showCompass: false }),
        "top-right",
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
      });
      map.on("moveend", moved);
      map.on("error", () => {
        if (!disposed) {
          window.clearTimeout(deadline);
          setState("error");
        }
      });
    }
    void initialize().catch(() => {
      if (!disposed) setState("error");
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
    activeMarkers.forEach((m) => m.remove());
    activeMarkers.clear();
    void import("mapbox-gl").then(({ default: mapbox }) => {
      if (cancelled || mapRef.current !== map) return;
      items.forEach((item, index) => {
        if (cancelled || mapRef.current !== map) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-pin saved-pin";
        button.textContent = String(index + 1);
        button.setAttribute(
          "aria-label",
          `Preview saved Hangout: ${item.title}`,
        );
        button.setAttribute(
          "aria-pressed",
          String(selectedRef.current === item.id),
        );
        button.addEventListener("click", () => choose.current(item.id, button));
        const marker = new mapbox.Marker({ element: button })
          .setLngLat([item.public_longitude, item.public_latitude])
          .addTo(map);
        button.setAttribute("role", "button");
        activeMarkers.set(item.id, marker);
      });
    });
    return () => {
      cancelled = true;
      activeMarkers.forEach((m) => m.remove());
      activeMarkers.clear();
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
      <div className="map-toolbar" aria-label="Map controls">
        <button
          className="quiet-button"
          disabled={!ready}
          onClick={() =>
            mapRef.current?.jumpTo({ center: UNC_CENTER, zoom: 14 })
          }
        >
          Back to UNC
        </button>
        <button className="quiet-button" disabled={!ready} onClick={locate}>
          Locate me
        </button>
      </div>
      <div className="map-frame" aria-label="Saved Hangout areas around UNC">
        <div className="map-canvas" ref={container} data-ready={ready} />
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
