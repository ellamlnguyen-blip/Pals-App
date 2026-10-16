export const peopleId =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export type PeopleSelection = {
  year: string;
  major: string;
  cursor: string;
};
export function readSelection(
  params: Record<string, string | string[] | undefined>,
): PeopleSelection | null {
  if (
    Object.keys(params).some(
      (key) => !["year", "major", "cursor"].includes(key),
    )
  )
    return null;
  const values = [params.year, params.major, params.cursor];
  if (values.some((value) => Array.isArray(value))) return null;
  const year = String(params.year ?? ""),
    major = String(params.major ?? "");
  const cursor = String(params.cursor ?? "");
  if (
    major.length > 200 ||
    (year !== "" &&
      (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2200)) ||
    (cursor !== "" && !peopleId.test(cursor))
  )
    return null;
  return { year, major, cursor };
}
export function peopleUrl(selection: PeopleSelection) {
  const query = new URLSearchParams();
  if (selection.year) query.set("year", selection.year);
  if (selection.major) query.set("major", selection.major);
  if (selection.cursor) {
    query.set("cursor", selection.cursor);
  }
  return `/people${query.size ? `?${query}` : ""}`;
}
export function safeReturn(value: string | string[] | undefined) {
  if (
    !value ||
    Array.isArray(value) ||
    value.length > 650 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("#")
  )
    return "/people";
  try {
    const url = new URL(value, "http://127.0.0.1");
    const rawPath = value.split("?", 1)[0];
    if (url.origin !== "http://127.0.0.1" || url.pathname !== rawPath)
      return "/people";
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length) return "/people";
    const focus = url.searchParams.get("focus");
    if (focus !== null && !peopleId.test(focus)) return "/people";
    if (url.pathname === "/people") {
      const params = Object.fromEntries(url.searchParams);
      delete params.focus;
      if (!readSelection(params)) return "/people";
      return `${url.pathname}${url.search}`;
    }
    if (
      /^\/hangouts\/saved\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
        url.pathname,
      ) &&
      keys.every((key) => key === "focus")
    )
      return `${url.pathname}${url.search}`;
    return "/people";
  } catch {
    return "/people";
  }
}
