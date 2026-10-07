const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const safeSegment = /^[a-z0-9._-]+$/;

// Storage metadata is privileged input, but it is still untrusted as a URL
// component. WHATWG URLs normalize literal and encoded dot segments.
export function privatePeerPhotoUrl(
  origin: string,
  subjectId: string,
  objectPath: string,
): string | null {
  if (!uuid.test(subjectId) || objectPath.length > 1024) return null;
  const segments = objectPath.split("/");
  if (
    segments.length < 2 ||
    segments[0] !== subjectId ||
    segments.some(
      (part) =>
        !part || part === "." || part === ".." || !safeSegment.test(part),
    ) ||
    !/\.(jpg|png|webp)$/.test(segments[segments.length - 1])
  )
    return null;
  try {
    const base = new URL(origin);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.pathname !== "/" ||
      base.search ||
      base.hash
    )
      return null;
    const path = `/storage/v1/object/authenticated/profile-photos/${segments.join("/")}`;
    const target = new URL(path, base);
    if (
      target.origin !== base.origin ||
      target.pathname !== path ||
      target.search ||
      target.hash
    )
      return null;
    return target.toString();
  } catch {
    return null;
  }
}
