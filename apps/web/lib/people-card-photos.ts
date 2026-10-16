/** Only this opaque selector may cross from rich detail into the directory. */
export function primaryCardPhotoRevision(subjectId: string, row: unknown) {
  if (!row || typeof row !== "object") return null;
  const detail = row as Record<string, unknown>;
  if (
    detail.account_id !== subjectId ||
    !Array.isArray(detail.photo_slots) ||
    !detail.photo_slots.includes("primary") ||
    !Number.isSafeInteger(detail.photo_revision) ||
    (detail.photo_revision as number) < 1
  )
    return null;
  return detail.photo_revision as number;
}

/** The visible 24-result page is the sole source of lookup IDs. */
export async function resolveCardPhotoRevisions(
  subjectIds: string[],
  read: (subjectId: string) => Promise<unknown>,
) {
  const revisions: Record<string, number> = {};
  for (let offset = 0; offset < subjectIds.length; offset += 4) {
    await Promise.all(
      subjectIds.slice(offset, offset + 4).map(async (subjectId) => {
        try {
          const revision = primaryCardPhotoRevision(
            subjectId,
            await read(subjectId),
          );
          if (revision !== null) revisions[subjectId] = revision;
        } catch {
          // A failed optional lookup leaves the card visible with initials.
        }
      }),
    );
  }
  return revisions;
}
