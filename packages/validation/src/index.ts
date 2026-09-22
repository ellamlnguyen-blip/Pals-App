/** UX validation only; the database allowlist is authoritative (ADR-0009). */
export const uncEmailDomains = [
  "live.unc.edu",
  "unc.edu",
  "ad.unc.edu",
  "business.unc.edu",
  "kenan-flagler.unc.edu",
] as const;
export function approvedUncEmail(value: string) {
  return (
    /^[^@\s]+@[^@\s]+$/.test(value) &&
    (uncEmailDomains as readonly string[]).includes(
      value.toLowerCase().split("@")[1] ?? "",
    )
  );
}
export function profileFields(form: FormData) {
  const real_name = String(form.get("real_name") ?? "").trim();
  const major = String(form.get("major") ?? "").trim();
  const bio = String(form.get("bio") ?? "").trim();
  const graduation_year = Number(form.get("graduation_year"));
  if (
    !real_name ||
    real_name.length > 100 ||
    !major ||
    major.length > 200 ||
    !bio ||
    bio.length > 2000 ||
    !Number.isInteger(graduation_year) ||
    graduation_year < 1900 ||
    graduation_year > 2200
  )
    return null;
  return { real_name, major, bio, graduation_year };
}
export function photoExtension(
  bytes: Uint8Array,
): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v))
    return "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
