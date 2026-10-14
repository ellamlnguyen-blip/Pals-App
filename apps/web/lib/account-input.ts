import { approvedUncEmail } from "@pals/validation";

export function accountName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 100 ? name : null;
}

export function accountEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return approvedUncEmail(email) ? email : null;
}

export function accountRevision(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

export function accountPassword(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.length >= 12 && value.length <= 128
    ? value
    : null;
}
