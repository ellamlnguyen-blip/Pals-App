import type { SavedFilter } from "../../../lib/saved-hangouts-types";

export type BrowseViewport = {
  longitude: number;
  latitude: number;
  zoom: number;
};
// Camera stays in this tab's module memory only, never in browser storage.
let returnViewport: { view: BrowseViewport; savedAt: number } | null = null;
export function rememberViewport(
  view: BrowseViewport | null,
  now = Date.now(),
) {
  returnViewport = view ? { view, savedAt: now } : null;
}
export function readViewport(now = Date.now()): BrowseViewport | null {
  if (
    !returnViewport ||
    now < returnViewport.savedAt ||
    now - returnViewport.savedAt > 30 * 60_000
  )
    return null;
  return returnViewport.view;
}
export function campusViewport(
  view: BrowseViewport,
  bounds: { west: number; east: number; south: number; north: number },
): BrowseViewport | null {
  if (
    ![view.longitude, view.latitude, view.zoom].every(Number.isFinite) ||
    view.longitude < bounds.west ||
    view.longitude > bounds.east ||
    view.latitude < bounds.south ||
    view.latitude > bounds.north ||
    view.zoom < 10 ||
    view.zoom > 19
  )
    return null;
  return {
    longitude: Math.round(view.longitude * 1000) / 1000,
    latitude: Math.round(view.latitude * 1000) / 1000,
    zoom: view.zoom,
  };
}

export type BrowseContext = {
  time: SavedFilter["time"];
  joining: SavedFilter["joining"];
  scrollY: number;
  savedAt: number;
};

// Only navigation preferences belong here. Never cache Hangout records or IDs.
export function parseBrowseContext(
  raw: string | null,
  now: number,
): BrowseContext | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const context = value as Partial<BrowseContext>;
    if (
      (context.time !== "upcoming" && context.time !== "all") ||
      (context.joining !== "any" && context.joining !== "open") ||
      typeof context.scrollY !== "number" ||
      !Number.isFinite(context.scrollY) ||
      context.scrollY < 0 ||
      typeof context.savedAt !== "number" ||
      !Number.isFinite(context.savedAt) ||
      context.savedAt > now ||
      now - context.savedAt > 30 * 60_000
    )
      return null;
    return context as BrowseContext;
  } catch {
    return null;
  }
}
