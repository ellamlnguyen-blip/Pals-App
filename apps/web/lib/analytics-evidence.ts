/** Only evidence available at the existing student web call sites. */
export function friendAcceptanceConfirmed(result: {
  state: string;
  relationship: { state: string } | null;
}) {
  return result.state === "known" && result.relationship?.state === "accepted";
}

export function firstRequestConfirmed(retry: boolean, kind: string) {
  return !retry && kind === "ok";
}
