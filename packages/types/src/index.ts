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
