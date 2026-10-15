import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { normalizeOwnerPhoto } from "../apps/web/lib/rich-peer-photo-image.ts";

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = require("sharp");

test("owner primary image becomes a bounded metadata-free square", async () => {
  const input = await sharp({
    create: { width: 1600, height: 900, channels: 4, background: "#749cce" },
  })
    .png()
    .withMetadata({ orientation: 1 })
    .toBuffer();
  const output = await normalizeOwnerPhoto(input, "primary");
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 900);
  assert.equal(metadata.height, 900);
  assert.equal(metadata.exif, undefined);
  assert.ok(output.length <= 5 * 1024 * 1024);
});

test("owner extra image becomes a bounded 9:5 rendition", async () => {
  const input = await sharp({
    create: { width: 2000, height: 1200, channels: 3, background: "#749cce" },
  })
    .jpeg()
    .toBuffer();
  const output = await normalizeOwnerPhoto(input, "extra");
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 1440);
  assert.equal(metadata.height, 800);
});

test("owner normalizer rejects trailing bytes and animation", async () => {
  const jpeg = await sharp({
    create: { width: 300, height: 300, channels: 3, background: "#749cce" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(
    normalizeOwnerPhoto(Buffer.concat([jpeg, Buffer.from([1])]), "primary"),
  );
  const animated = await sharp({
    create: { width: 300, height: 600, channels: 3, background: "#749cce" },
  })
    .gif({ loop: 0, delay: 100 })
    .toBuffer();
  await assert.rejects(normalizeOwnerPhoto(animated, "primary"));
});

test("EXIF orientation is applied before a square crop and then removed", async () => {
  const width = 600,
    height = 400;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 3;
      raw[at] = x < width / 2 ? 240 : 15;
      raw[at + 2] = x < width / 2 ? 15 : 240;
    }
  }
  const input = await sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 98 })
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const output = await normalizeOwnerPhoto(input, "primary");
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, 400);
  assert.equal(metadata.height, 400);
  assert.equal(metadata.orientation, undefined);
  assert.equal(metadata.exif, undefined);
  const { data, info } = await sharp(output)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const upper = data.subarray((20 * info.width + 200) * info.channels);
  const lower = data.subarray((380 * info.width + 200) * info.channels);
  assert.ok(upper[0] > upper[2], "red half should become the upper crop");
  assert.ok(lower[2] > lower[0], "blue half should become the lower crop");
});

test("owner normalizer handles portrait, landscape and transparent input within output bounds", async () => {
  for (const [width, height] of [
    [800, 1600],
    [1600, 800],
  ]) {
    const input = await sharp({
      create: { width, height, channels: 3, background: "#749cce" },
    })
      .png()
      .toBuffer();
    const output = await normalizeOwnerPhoto(input, "extra");
    const info = await sharp(output).metadata();
    assert.ok(info.width <= 1440 && info.height <= 800);
    assert.ok(info.width <= width && info.height <= height);
    assert.ok(Math.abs(info.width / info.height - 1.8) <= 1 / info.height);
  }
  const transparent = await sharp({
    create: {
      width: 800,
      height: 800,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 200,
            height: 200,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
        gravity: "centre",
      },
    ])
    .png()
    .toBuffer();
  const result = await normalizeOwnerPhoto(transparent, "primary");
  const { data, info } = await sharp(result)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 4);
  assert.equal(data[3], 0, "transparent corner must stay transparent");
  const middle = (400 * info.width + 400) * info.channels;
  assert.ok(data[middle] > 200 && data[middle + 3] > 200);
});

test("owner normalizer rejects input size, pixel count, tiny and corrupt decoded images", async () => {
  const tiny = await sharp({
    create: { width: 100, height: 100, channels: 3, background: "#749cce" },
  })
    .png()
    .toBuffer();
  await assert.rejects(normalizeOwnerPhoto(tiny, "primary"));
  const oversized = Buffer.concat([tiny, randomBytes(5 * 1024 * 1024)]);
  await assert.rejects(normalizeOwnerPhoto(oversized, "primary"));
  const manyPixels = await sharp({
    create: { width: 5000, height: 4100, channels: 3, background: "#749cce" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(normalizeOwnerPhoto(manyPixels, "primary"));
  const good = await sharp({
    create: { width: 300, height: 300, channels: 3, background: "#749cce" },
  })
    .png()
    .toBuffer();
  const corrupt = Buffer.from(good);
  corrupt[Math.floor(corrupt.length / 2)] ^= 0xff;
  await assert.rejects(normalizeOwnerPhoto(corrupt, "primary"));
});
