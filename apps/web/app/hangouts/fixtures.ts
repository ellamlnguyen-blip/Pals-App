import type { FeatureCollection, Point } from "geojson";
// Development examples only. Approximate public campus places, never people.
export type MockHangout = {
  id: string;
  title: string;
  category: "Food" | "Study" | "Outside";
  time: "Afternoon" | "Evening";
  place: string;
  coordinates: [number, number];
  description: string;
};
export const UNC_CENTER: [number, number] = [-79.049, 35.909];
export const MOCK_HANGOUTS: MockHangout[] = [
  {
    id: "mock-picnic",
    title: "A little picnic break",
    category: "Food",
    time: "Afternoon",
    place: "Around Polk Place",
    coordinates: [-79.049, 35.909],
    description: "An example of a low-key lunch between classes.",
  },
  {
    id: "mock-study",
    title: "Study, with snack breaks",
    category: "Study",
    time: "Afternoon",
    place: "Around Davis Library",
    coordinates: [-79.048, 35.911],
    description: "An example of finding company for a study session.",
  },
  {
    id: "mock-walk",
    title: "Take the long way home",
    category: "Outside",
    time: "Evening",
    place: "Around Coker Arboretum",
    coordinates: [-79.047, 35.913],
    description: "An example of a casual campus walk.",
  },
  {
    id: "mock-coffee",
    title: "Coffee and a catch-up",
    category: "Food",
    time: "Afternoon",
    place: "Around the Pit",
    coordinates: [-79.048, 35.91],
    description: "An example of meeting up over a quick coffee.",
  },
  {
    id: "mock-frisbee",
    title: "Anyone up for frisbee?",
    category: "Outside",
    time: "Afternoon",
    place: "Around Hooker Fields",
    coordinates: [-79.043, 35.907],
    description: "An example of an easy afternoon outside.",
  },
];
export function filterMockHangouts(category: string, time: string) {
  return MOCK_HANGOUTS.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      (time === "Any time" || item.time === time),
  );
}
export function mapFeatures(items: MockHangout[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: items.map((item) => ({
      type: "Feature",
      id: item.id,
      geometry: { type: "Point", coordinates: item.coordinates },
      properties: { id: item.id, title: item.title },
    })),
  };
}
// Only a coarse campus viewport is used. Coordinates never leave this function
// as a stored user record or precise user-location layer.
export function campusLocation(
  longitude: number,
  latitude: number,
): [number, number] | null {
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -79.08 ||
    longitude > -79.02 ||
    latitude < 35.89 ||
    latitude > 35.93
  )
    return null;
  return [
    Math.round(longitude * 1000) / 1000,
    Math.round(latitude * 1000) / 1000,
  ];
}
