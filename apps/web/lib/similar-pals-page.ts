import { peopleId } from "./people-selection.ts";

export type SimilarPalCard = {
  account_id: string;
  real_name: string;
  campus_name: string;
  graduation_year: number;
  major: string;
};

export type SimilarPalsPage = {
  items: SimilarPalCard[];
  next_cursor: string | null;
  has_more: boolean;
};

function isCard(value: unknown): value is SimilarPalCard {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card.account_id === "string" &&
    peopleId.test(card.account_id) &&
    typeof card.real_name === "string" &&
    card.real_name.length > 0 &&
    typeof card.campus_name === "string" &&
    card.campus_name.length > 0 &&
    Number.isInteger(card.graduation_year) &&
    typeof card.major === "string"
  );
}

export function parseSimilarPalsPage(value: unknown): SimilarPalsPage | null {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return null;
  const page = value as Record<string, unknown>;
  if (
    !Array.isArray(page.items) ||
    page.items.length > 24 ||
    !page.items.every(isCard) ||
    new Set(page.items.map((item: SimilarPalCard) => item.account_id)).size !==
      page.items.length ||
    typeof page.has_more !== "boolean" ||
    (page.has_more &&
      (page.items.length === 0 ||
        typeof page.next_cursor !== "string" ||
        !peopleId.test(page.next_cursor))) ||
    (!page.has_more && page.next_cursor !== null)
  )
    return null;
  return {
    items: page.items.map((item: SimilarPalCard) => ({
      account_id: item.account_id,
      real_name: item.real_name,
      campus_name: item.campus_name,
      graduation_year: item.graduation_year,
      major: item.major,
    })),
    next_cursor: page.next_cursor as string | null,
    has_more: page.has_more,
  };
}
