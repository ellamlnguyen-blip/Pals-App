"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export function PublicPlaceMap({
  token,
  latitude,
  longitude,
  place,
}: {
  token: string;
  latitude: number;
  longitude: number;
  place: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">(
    "loading",
  );
  useEffect(() => {
    if (
      !token.startsWith("pk.") ||
      !container.current ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      setState("unavailable");
      return;
    }
    let disposed = false;
    let map: MapboxMap | undefined;
    let marker: Marker | undefined;
    const timeout = window.setTimeout(() => {
      if (!disposed) setState("unavailable");
    }, 20000);
    void import("mapbox-gl")
      .then(({ default: mapbox }) => {
        if (disposed || !container.current) return;
        map = new mapbox.Map({
          container: container.current,
          accessToken: token,
          style: "mapbox://styles/mapbox/light-v11",
          center: [longitude, latitude],
          zoom: 15,
          minZoom: 10,
          maxZoom: 18,
          attributionControl: true,
          renderWorldCopies: false,
          performanceMetricsCollection: false,
        });
        map
          .getCanvas()
          .setAttribute(
            "aria-label",
            `Approximate public area for ${place}. Arrow keys pan; plus and minus zoom.`,
          );
        map.addControl(
          new mapbox.NavigationControl({ showCompass: false }),
          "top-right",
        );
        const dot = document.createElement("span");
        dot.className = "pals-detail-map-marker";
        dot.setAttribute("aria-hidden", "true");
        marker = new mapbox.Marker({ element: dot })
          .setLngLat([longitude, latitude])
          .addTo(map);
        map.on("load", () => {
          if (!disposed) {
            window.clearTimeout(timeout);
            setState("ready");
          }
        });
        map.on("error", () => {
          if (!disposed) {
            window.clearTimeout(timeout);
            setState("unavailable");
          }
        });
      })
      .catch(() => {
        if (!disposed) {
          window.clearTimeout(timeout);
          setState("unavailable");
        }
      });
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      marker?.remove();
      map?.remove();
    };
  }, [token, latitude, longitude, place]);
  return (
    <div
      className="pals-detail-map-frame"
      aria-label="Approximate public location map"
    >
      <div
        ref={container}
        className="pals-detail-map-canvas"
        data-ready={state === "ready"}
      />
      {state !== "ready" && (
        <div className="pals-detail-map-fallback" role="status">
          <span aria-hidden="true">⌖</span>
          <strong>
            {state === "loading"
              ? "Loading the campus map…"
              : "Map unavailable"}
          </strong>
          <p>
            {state === "loading"
              ? "Showing the approximate public area."
              : "You can still open the approximate public area using the link below."}
          </p>
        </div>
      )}
    </div>
  );
}
