import { redirect } from "next/navigation";
import { access, accessPath } from "../../lib/access";
export default async function Onboarding() {
  const { state } = await access();
  redirect(state === "ready" ? "/profile" : accessPath(state));
}
