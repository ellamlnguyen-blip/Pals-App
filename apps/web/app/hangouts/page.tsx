import { redirect } from "next/navigation";
import { requireAccess } from "../../lib/access";

export default async function Hangouts() {
  await requireAccess("ready");
  redirect("/hangouts/saved");
}
