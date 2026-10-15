import sharp from "sharp";

const maxInput = 5 * 1024 * 1024;
const maxPixels = 20_000_000;
const maxOutput = 5 * 1024 * 1024;

function validJpeg(bytes: Buffer) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset++] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xd9) return offset === bytes.length;
    if (marker === undefined || marker === 0 || marker === 0xd8) return false;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return false;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return false;
    offset += length;
    if (marker === 0xda) {
      // Entropy-coded scan: FF00 is stuffed data; FFD0..D7 are restarts.
      while (offset + 1 < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }
        const next = bytes[offset + 1];
        if (next === 0 || (next >= 0xd0 && next <= 0xd7)) {
          offset += 2;
          continue;
        }
        break;
      }
    }
  }
  return false;
}

function validPng(bytes: Buffer) {
  if (
    bytes.length < 45 ||
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return false;
  let offset = 8;
  let imageData = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > bytes.length) return false;
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (["acTL", "fcTL", "fdAT"].includes(type)) return false;
    if (type === "IDAT") imageData = true;
    if (type === "IEND")
      return length === 0 && imageData && end === bytes.length;
    offset = end;
  }
  return false;
}

function validWebp(bytes: Buffer) {
  if (
    bytes.length < 20 ||
    bytes.toString("ascii", 0, 4) !== "RIFF" ||
    bytes.toString("ascii", 8, 12) !== "WEBP" ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  )
    return false;
  let offset = 12;
  let imageData = false;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("ascii", offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + length + (length % 2);
    if (end > bytes.length) return false;
    if (
      type === "ANIM" ||
      type === "ANMF" ||
      (type === "VP8X" && length > 0 && (bytes[offset + 8] & 0x02) !== 0)
    )
      return false;
    if (type === "VP8 " || type === "VP8L") imageData = true;
    offset = end;
  }
  return imageData && offset === bytes.length;
}

function sourceFormat(bytes: Uint8Array): "jpeg" | "png" | "webp" | null {
  const input = Buffer.from(bytes);
  if (validJpeg(input)) return "jpeg";
  if (validPng(input)) return "png";
  if (validWebp(input)) return "webp";
  return null;
}

export async function sanitizePeerPhoto(
  input: Uint8Array,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (signal?.aborted) throw new Error("Invalid image");
  if (!input.length || input.length > maxInput)
    throw new Error("Invalid image");
  const format = sourceFormat(input);
  if (!format) throw new Error("Invalid image");
  const source = sharp(input, {
    limitInputPixels: maxPixels,
    failOn: "warning",
  }).timeout({ seconds: 5 });
  const metadata = await source.metadata();
  if (signal?.aborted) throw new Error("Invalid image");
  if (
    metadata.format !== format ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > maxPixels ||
    (metadata.pages ?? 1) !== 1
  )
    throw new Error("Invalid image");
  const output = await source
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  if (signal?.aborted) throw new Error("Invalid image");
  if (!output.length || output.length > maxOutput)
    throw new Error("Invalid image");
  return output;
}
