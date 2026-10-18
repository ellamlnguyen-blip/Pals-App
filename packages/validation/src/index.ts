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
/** One or two prose sentences. A missing final stop still counts as one. */
export function validShortBio(value: string) {
  const bio = value.trim();
  if (!bio || bio.length > 2000) return false;
  // English stops may have closing quotes/brackets before a space or end.
  // CJK stops separate sentences without spaces. URL/decimal dots and initials
  // stay within a sentence; common honorifics do not split.
  const endings = [
    ...bio.matchAll(
      /[.!?]+[”’"'」』）)\]]*(?=\s|$)|[。！？]+[”’"'」』）)\]]*/g,
    ),
  ].filter((match) => {
    if (!/^\.(?!\.)[”’"'」』）)\]]*$/.test(match[0])) return true;
    const before = bio.slice(0, match.index);
    if (
      /(?:^|\s)(?:Dr|Mr|Mrs|Ms|Prof|St|Jr|Sr|vs|etc|e\.g|i\.e)$/i.test(before)
    )
      return false;
    if (
      /(?:^|\s)(?:[A-Za-z]\.)+[A-Za-z]$/.test(before) &&
      /^\s+[a-z]/.test(bio.slice(match.index! + 1))
    )
      return false;
    return true;
  });
  const last = endings.at(-1);
  const tail = last ? bio.slice(last.index! + last[0].length).trim() : bio;
  return endings.length + (tail ? 1 : 0) <= 2;
}
export function profileFields(form: FormData, unchangedBio?: string | null) {
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
    (bio !== unchangedBio?.trim() && !validShortBio(bio)) ||
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

/** Accepted ADR-0011. Database constraints independently defend direct writes. */
export function optionalProfileFields(form: FormData) {
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const hometown = text("hometown") || null;
  if (hometown && [...hometown].length > 100) return null;
  // An older open editor must not clear a hometown it never loaded.
  const hometownField = form.has("hometown") ? { hometown } : {};
  const list = (name: string) =>
    text(name)
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);
  const interests = list("interests");
  const down_to_do = list("down_to_do");
  if (
    [interests, down_to_do].some(
      (items) =>
        items.length > 10 ||
        new Set(items).size !== items.length ||
        items.some((v) => [...v].length > 80),
    )
  )
    return null;
  const favorite_music = text("favorite_music") || null;
  const favorite_foods = text("favorite_foods") || null;
  const weird_fact = text("weird_fact") || null;
  if (
    [favorite_music, favorite_foods, weird_fact].some(
      (v) => v && [...v].length > 500,
    )
  )
    return null;
  const instagram = text("instagram").replace(/^@/, "") || null;
  if (instagram && !/^[A-Za-z0-9_.]{1,30}$/.test(instagram)) return null;
  const prompts: { question: string; answer: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const question = text(`question_${i}`),
      answer = text(`answer_${i}`);
    if (!question && !answer) continue;
    if (
      !question ||
      !answer ||
      [...question].length > 120 ||
      [...answer].length > 500
    )
      return null;
    prompts.push({ question, answer });
  }
  return {
    ...hometownField,
    interests,
    down_to_do,
    favorite_music,
    favorite_foods,
    weird_fact,
    instagram,
    prompts,
  };
}
