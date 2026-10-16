import "server-only";
import { notFound } from "next/navigation";
import { studentFeaturesAvailable } from "./feature-runtime";

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
export function localPeopleAvailable() {
  return studentFeaturesAvailable();
}
export function requireLocalPeople() {
  if (!localPeopleAvailable()) notFound();
}

export {
  peopleId,
  peopleUrl,
  readSelection,
  safeReturn,
} from "./people-selection";
export type { PeopleSelection } from "./people-selection";
