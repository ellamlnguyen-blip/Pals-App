export type PhotoBinding = {
  object_id: string;
  object_path: string;
  photo_revision: number;
};

export type PhotoDependencies = {
  resolve: (
    actor: string,
    subject: string,
    slot: string,
    revision: number,
    signal: AbortSignal,
  ) => Promise<PhotoBinding | null>;
  download: (path: string, signal: AbortSignal) => Promise<Uint8Array | null>;
  sanitize: (bytes: Uint8Array, signal: AbortSignal) => Promise<Uint8Array>;
};

export async function readBoundedPhotoStream(
  stream: ReadableStream<Uint8Array>,
  maximum = 5 * 1024 * 1024,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error("Photo input too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readRichPeerPhoto(
  actor: string,
  subject: string,
  slot: string,
  revision: number,
  signal: AbortSignal,
  dependencies: PhotoDependencies,
): Promise<Uint8Array | null> {
  const initial = await dependencies.resolve(
    actor,
    subject,
    slot,
    revision,
    signal,
  );
  if (!initial) return null;
  const downloaded = await dependencies.download(initial.object_path, signal);
  if (!downloaded) return null;
  const safeBytes = await dependencies.sanitize(downloaded, signal);
  if (signal.aborted) throw new Error("Photo operation unavailable");
  // A fresh full authorization snapshot must bind these exact bytes to the
  // same selected object before anything is returned to the browser.
  const current = await dependencies.resolve(
    actor,
    subject,
    slot,
    revision,
    signal,
  );
  if (
    !current ||
    current.object_id !== initial.object_id ||
    current.object_path !== initial.object_path ||
    current.photo_revision !== initial.photo_revision
  )
    return null;
  return safeBytes;
}
