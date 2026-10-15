/** Add the current peer focus only to an already validated People return URL. */
export function profileReturn(
  baseBack: string,
  focus: string | string[] | undefined,
  peerId: string,
) {
  const [path, search] = baseBack.split("?", 2);
  if (path !== "/people" || focus !== peerId) return baseBack;
  const params = new URLSearchParams(search ?? "");
  params.set("focus", peerId);
  return `/people?${params.toString()}`;
}
