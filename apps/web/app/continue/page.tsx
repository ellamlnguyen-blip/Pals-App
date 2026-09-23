import { redirect } from "next/navigation";
import { access, accessPath } from "../../lib/access";

export default async function Continue({
  searchParams,
}: {
  searchParams: Promise<{ auth_callback?: string }>;
}) {
  const destination = accessPath((await access()).state);
  const callback = (await searchParams).auth_callback === "1";
  redirect(callback ? `${destination}?pals_auth_callback=1` : destination);
}
