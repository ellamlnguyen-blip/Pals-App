/** Caller-owned profile only; never a peer visibility contract. */
export type OwnerProfile = {
  real_name: string | null;
  graduation_year: number | null;
  major: string | null;
  bio: string | null;
  hometown: string | null;
  primary_photo_path: string | null;
  additional_photo_paths: string[];
  interests: string[];
  down_to_do: string[];
  favorite_music: string | null;
  favorite_foods: string | null;
  weird_fact: string | null;
  instagram: string | null;
  prompts: { question: string; answer: string }[];
  revision: number;
};

/** Owner-only consent RPC shape; an absent private row is false at revision zero. */
export type RichProfilePreference = {
  opted_in: boolean;
  revision: number;
};

/** Authorized peer projection. Photo slots are opaque gateway selectors only. */
export type RichPeopleDetail = {
  account_id: string;
  real_name: string;
  campus_name: string;
  graduation_year: number;
  major: string;
  bio: string;
  interests: string[];
  down_to_do: string[];
  hometown: string | null;
  prompts: { question: string; answer: string }[];
  unc_email_verified: boolean;
  photo_revision: number;
  photo_slots: ("primary" | "0" | "1" | "2" | "3")[];
};
