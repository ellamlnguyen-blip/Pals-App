export const richPeerPhotoHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
} as const;

export function isRichPeerPhotoPath(pathname: string) {
  return /^\/people\/[^/]+\/photo\/?$/.test(pathname);
}
