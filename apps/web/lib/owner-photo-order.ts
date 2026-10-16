/** A reorder may only permute the owner's current extra-photo references. */
export function validPhotoOrder(
  existing: string[],
  proposed: unknown,
): proposed is string[] {
  return (
    Array.isArray(proposed) &&
    proposed.length === existing.length &&
    proposed.every((path) => typeof path === "string") &&
    new Set(proposed).size === proposed.length &&
    existing.every((path) => proposed.includes(path)) &&
    proposed.some((path, index) => path !== existing[index])
  );
}
