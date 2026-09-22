import { redirect } from "next/navigation";
import { access, accessPath } from "../../lib/access";
export default async function Continue() {
  redirect(accessPath((await access()).state));
}
