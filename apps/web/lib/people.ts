import "server-only";
import { notFound } from "next/navigation";
import { parseAppEnvironment } from "@pals/config";
import { authConfig } from "./config";

export type PeopleCard = {
  account_id: string;
  real_name: string;
  campus_name: string;
  graduation_year: number;
  major: string;
};
export type PeopleDetail = PeopleCard & {
  bio: string;
  interests: string[];
  down_to_do: string[];
};
export const peopleId =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function localPeopleAvailable() {
  const config = authConfig();
  return (
    parseAppEnvironment(process.env.APP_ENV) === "local" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(config.url).hostname)
  );
}
export function requireLocalPeople() {
  if (!localPeopleAvailable()) notFound();
}

export type PeopleSelection = {
  search: string;
  year: string;
  major: string;
  afterId: string;
};
export function readSelection(
  params: Record<string, string | string[] | undefined>,
): PeopleSelection | null {
  if (
    Object.keys(params).some(
      (key) => !["search", "year", "major", "afterId"].includes(key),
    )
  )
    return null;
  const values = [params.search, params.year, params.major, params.afterId];
  if (values.some((value) => Array.isArray(value))) return null;
  const search = String(params.search ?? ""),
    year = String(params.year ?? ""),
    major = String(params.major ?? "");
  const afterId = String(params.afterId ?? "");
  if (
    search.length > 100 ||
    major.length > 200 ||
    (year !== "" &&
      (!/^\d{4}$/.test(year) || Number(year) < 1900 || Number(year) > 2200)) ||
    (afterId !== "" && !peopleId.test(afterId))
  )
    return null;
  return { search, year, major, afterId };
}
export function peopleUrl(selection: PeopleSelection) {
  const query = new URLSearchParams();
  if (selection.search) query.set("search", selection.search);
  if (selection.year) query.set("year", selection.year);
  if (selection.major) query.set("major", selection.major);
  if (selection.afterId) {
    query.set("afterId", selection.afterId);
  }
  return `/people${query.size ? `?${query}` : ""}`;
}
export function safeReturn(value: string | string[] | undefined) {
  if (
    !value ||
    Array.isArray(value) ||
    value.length > 650 ||
    !value.startsWith("/people") ||
    value.startsWith("//") ||
    value.includes("#")
  )
    return "/people";
  try {
    const url = new URL(value, "http://127.0.0.1");
    if (
      url.origin !== "http://127.0.0.1" ||
      url.pathname !== "/people" ||
      !readSelection(Object.fromEntries(url.searchParams))
    )
      return "/people";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/people";
  }
}
