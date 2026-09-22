"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker, GeoJSONSource } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  campusLocation,
  mapFeatures,
  MOCK_HANGOUTS,
  UNC_CENTER,
  type MockHangout,
} from "./fixtures";

type MapState = "loading" | "ready" | "error";
export function HangoutsMap({
  token,
  items,
  selected,
  onSelect,
}: {
  token: string;
  items: MockHangout[];
  selected: string | null;
  onSelect: (id: string, trigger: HTMLElement) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const itemsRef = useRef(items);
  const selectedRef = useRef(selected);
  const [state, setState] = useState<MapState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [locationMessage, setLocationMessage] = useState("");
  const [tileWarning, setTileWarning] = useState(false);
  const [locating, setLocating] = useState(false);
  const validToken = token.startsWith("pk.");

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    selectedRef.current = selected;
    for (const [id, marker] of markers.current)
      if (!id.startsWith("cluster-"))
        marker
          .getElement()
          .setAttribute("aria-pressed", String(id === selected));
  }, [selected]);

  useEffect(() => {
    if (!validToken || !container.current) return;
    let disposed = false;
    let loaded = false;
    let map: MapboxMap | undefined;
    const activeMarkers = markers.current;
    const deadline = window.setTimeout(() => {
      if (!disposed) setState("error");
    }, 20000);
    const fail = () => {
      if (!disposed) {
        window.clearTimeout(deadline);
        setState("error");
      }
    };
    async function initialize() {
      const mapbox = (await import("mapbox-gl")).default;
      if (disposed || !container.current) return;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      map = new mapbox.Map({
        container: container.current,
        accessToken: token,
        style: dark
          ? "mapbox://styles/mapbox/dark-v11"
          : "mapbox://styles/mapbox/light-v11",
        center: UNC_CENTER,
        zoom: 14,
        minZoom: 10,
        maxZoom: 19,
        attributionControl: true,
        renderWorldCopies: false,
        // Never collect tile performance metrics or attach device coordinates.
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
          "UNC Hangout map. Use arrow keys to pan, plus and minus to zoom.",
        );
      const syncMarkers = () => {
        if (disposed || !map?.isSourceLoaded("mock-hangouts")) return;
        const visible = new Set<string>();
        for (const feature of map.querySourceFeatures("mock-hangouts")) {
          if (feature.geometry.type !== "Point") continue;
          const coordinates = feature.geometry.coordinates as [number, number];
          if (!map.getBounds()?.contains(coordinates)) continue;
          const props = feature.properties!;
          const cluster = Boolean(props.cluster);
          const id = cluster ? `cluster-${props.cluster_id}` : String(props.id);
          if (visible.has(id)) continue;
          visible.add(id);
          if (activeMarkers.has(id)) continue;
          const button = document.createElement("button");
          button.type = "button";
          button.className = cluster ? "map-pin map-cluster" : "map-pin";
          button.textContent = cluster
            ? String(props.point_count)
            : String(MOCK_HANGOUTS.findIndex((item) => item.id === id) + 1);
          button.setAttribute(
            "aria-label",
            cluster
              ? `Expand cluster of ${props.point_count} mock Hangouts`
              : `Preview mock Hangout: ${props.title}`,
          );
          if (!cluster)
            button.setAttribute(
              "aria-pressed",
              String(selectedRef.current === id),
            );
          button.addEventListener("click", () => {
            if (!map || disposed) return;
            if (cluster) {
              (
                map.getSource("mock-hangouts") as GeoJSONSource
              ).getClusterExpansionZoom(
                Number(props.cluster_id),
                (error, zoom) => {
                  if (disposed || !map) return;
                  if (error || zoom === null || zoom === undefined) {
                    fail();
                    return;
                  }
                  map.easeTo({
                    center: coordinates,
                    zoom: zoom + 0.2,
                    duration: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? 0
                      : 300,
                  });
                  map.getCanvas().focus();
                },
              );
            } else onSelect(id, button);
          });
          const marker = new mapbox.Marker({ element: button })
            .setLngLat(coordinates)
            .addTo(map);
          // Mapbox assigns role=img to marker elements, including buttons.
          button.setAttribute("role", "button");
          activeMarkers.set(id, marker);
        }
        for (const [id, marker] of activeMarkers)
          if (!visible.has(id)) {
            marker.remove();
            activeMarkers.delete(id);
          }
      };
      map.on("error", () => {
        if (disposed) return;
        if (loaded) setTileWarning(true);
        else fail();
      });
      map.on("load", () => {
        if (!map || disposed) return;
        map.addSource("mock-hangouts", {
          type: "geojson",
          data: mapFeatures(itemsRef.current),
          cluster: true,
          clusterRadius: 60,
          clusterMaxZoom: 16,
        });
        // A source-backed layer keeps source tiles loaded; accessible HTML buttons
        // render the visible pins and clusters instead of canvas-only targets.
        map.addLayer({
          id: "mock-source",
          type: "circle",
          source: "mock-hangouts",
          paint: { "circle-radius": 0, "circle-opacity": 0 },
        });
        window.clearTimeout(deadline);
        loaded = true;
        setState("ready");
      });
      map.on("idle", syncMarkers);
      map.on("moveend", syncMarkers);
      map.on("sourcedata", syncMarkers);
    }
    void initialize().catch(fail);
    return () => {
      disposed = true;
      window.clearTimeout(deadline);
      for (const marker of activeMarkers.values()) marker.remove();
      activeMarkers.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [token, validToken, attempt, onSelect]);

  useEffect(() => {
    const source = mapRef.current?.getSource("mock-hangouts") as
      GeoJSONSource | undefined;
    if (state === "ready" && source) {
      for (const marker of markers.current.values()) marker.remove();
      markers.current.clear();
      source.setData(mapFeatures(items));
    }
  }, [items, state]);

  function locate() {
    const map = mapRef.current;
    if (!map || locating) return;
    if (!navigator.geolocation) {
      setLocationMessage(
        "Location is unavailable. You can still explore UNC by moving the map.",
      );
      return;
    }
    setLocating(true);
    setLocationMessage("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (mapRef.current !== map) return;
        setLocating(false);
        const center = campusLocation(
          position.coords.longitude,
          position.coords.latitude,
        );
        map.jumpTo({ center: center ?? UNC_CENTER, zoom: 15 });
        setLocationMessage(
          center
            ? "Map centered near you. Your location is not saved or shared with other users."
            : "You're outside the UNC area. Keeping the map on campus.",
        );
      },
      (error) => {
        if (mapRef.current !== map) return;
        setLocating(false);
        setLocationMessage(
          error.code === 1
            ? "Location permission was declined. You can still explore UNC by moving the map."
            : "Couldn't find your location. Try again or move the map to explore.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
    );
  }
  const ready = validToken && state === "ready";
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
        <button
          className="quiet-button"
          disabled={!ready || locating}
          onClick={locate}
        >
          {locating ? "Locating…" : "Locate me"}
        </button>
      </div>
      <div className="map-frame" aria-label="Mock Hangouts around UNC">
        <div className="map-canvas" ref={container} data-ready={ready} />
        {!ready && (
          <div className="map-state" role="status">
            <span className="map-state-label">UNC Chapel Hill</span>
            <h2>
              {!validToken
                ? "The map needs a connection"
                : state === "error"
                  ? "The map couldn't load"
                  : "Loading the campus map…"}
            </h2>
            <p>
              {!validToken
                ? "A public Mapbox token is needed for this preview. You can still explore the mock Hangouts below."
                : state === "error"
                  ? "Check your connection and try again. The mock examples are still available."
                  : "Getting the map ready. Location permission isn't needed."}
            </p>
            {validToken && state === "error" && (
              <button
                className="button"
                onClick={() => {
                  setState("loading");
                  setLocating(false);
                  setLocationMessage("");
                  setAttempt((value) => value + 1);
                }}
              >
                Retry map
              </button>
            )}
          </div>
        )}
      </div>
      {tileWarning && (
        <p className="map-help" role="status">
          Some map details could not load. You can still explore the examples.{" "}
          <button
            className="text-button"
            onClick={() => {
              setTileWarning(false);
              setState("loading");
              setLocating(false);
              setLocationMessage("");
              setAttempt((value) => value + 1);
            }}
          >
            Reload map
          </button>
        </p>
      )}
      <p className="map-help" role="status">
        {locationMessage ||
          "Location is optional. Pins show example places, never people."}
      </p>
    </div>
  );
}
