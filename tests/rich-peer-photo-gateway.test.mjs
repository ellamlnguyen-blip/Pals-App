import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import {
  readBoundedPhotoStream,
  readRichPeerPhoto,
} from "../apps/web/lib/rich-peer-photo-core.ts";
import { sanitizePeerPhoto } from "../apps/web/lib/rich-peer-photo-image.ts";
import { privatePeerPhotoUrl } from "../apps/web/lib/rich-peer-photo-path.ts";

const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const sharp = require("sharp");
const binding = (id = "object-a") => ({
  object_id: id,
  object_path: "subject/a.png",
  photo_revision: 7,
});

test("gateway returns only the initially authorized exact object after a second full check", async () => {
  let calls = 0;
  const bytes = new Uint8Array([1, 2, 3]);
  const output = await readRichPeerPhoto(
    "viewer",
    "subject",
    "primary",
    7,
    new AbortController().signal,
    {
      resolve: async (actor, subject, slot, revision) => {
        assert.deepEqual(
          [actor, subject, slot, revision],
          ["viewer", "subject", "primary", 7],
        );
        calls++;
        return binding();
      },
      download: async (subject, path) => {
        assert.equal(subject, "subject");
        assert.equal(path, "subject/a.png");
        return bytes;
      },
      sanitize: async (input) => {
        assert.equal(input, bytes);
        return new Uint8Array([4]);
      },
    },
  );
  assert.deepEqual(output, new Uint8Array([4]));
  assert.equal(calls, 2);
});

test("private Storage URL uses the exact authorized subject path and rejects traversal before fetch", () => {
  const origin = "http://127.0.0.1:55421";
  const subject = "79000000-0000-4000-8000-000000000002";
  const valid = `${subject}/album/aa-bb_1.webp`;
  assert.equal(
    privatePeerPhotoUrl(origin, subject, valid),
    `${origin}/storage/v1/object/authenticated/profile-photos/${valid}`,
  );
  for (const unsafe of [
    `${subject}/../other/photo.png`,
    `${subject}/./photo.png`,
    `${subject}/%2e%2e/photo.png`,
    `${subject}/%252e%252e/photo.png`,
    `${subject}/album\\..\\other.png`,
    `${subject}//photo.png`,
    `${subject}/photo.png?download=1`,
    `${subject}/photo.png#fragment`,
    `79000000-0000-4000-8000-000000000003/photo.png`,
    `${subject}/other.svg`,
  ])
    assert.equal(privatePeerPhotoUrl(origin, subject, unsafe), null, unsafe);
});

test("gateway discards a downloaded image when path is reused, revision changes, or access is revoked", async () => {
  for (const changed of [
    null,
    binding("object-b"),
    { ...binding(), object_path: "subject/b.png" },
    { ...binding(), photo_revision: 8 },
  ]) {
    let calls = 0;
    const output = await readRichPeerPhoto(
      "viewer",
      "subject",
      "0",
      7,
      new AbortController().signal,
      {
        resolve: async () => (++calls === 1 ? binding() : changed),
        download: async () => new Uint8Array([1]),
        sanitize: async () => new Uint8Array([2]),
      },
    );
    assert.equal(output, null);
    assert.equal(calls, 2);
  }
});

test("download cap rejects before buffering an oversized stream", async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(4));
      controller.enqueue(new Uint8Array(4));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readBoundedPhotoStream(stream, 5));
  assert.equal(cancelled, true);
});

test("decoder re-encodes a valid image with bounded dimensions and no source metadata", async () => {
  const input = await sharp({
    create: { width: 2200, height: 1000, channels: 3, background: "red" },
  })
    .jpeg()
    .withMetadata({ density: 144 })
    .toBuffer();
  const output = await sanitizePeerPhoto(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "webp");
  assert.ok(metadata.width <= 2048 && metadata.height <= 2048);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.density, undefined);
  assert.ok(output.length < 5 * 1024 * 1024);

  const oriented = await sharp({
    create: { width: 4, height: 2, channels: 3, background: "blue" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const orientedOutput = await sharp(
    await sanitizePeerPhoto(oriented),
  ).metadata();
  assert.equal(orientedOutput.width, 2);
  assert.equal(orientedOutput.height, 4);
  assert.equal(orientedOutput.orientation, undefined);
  assert.equal(orientedOutput.exif, undefined);
});

test("decoder accepts static PNG and WebP but rejects animation container markers", async () => {
  const source = sharp({
    create: { width: 2, height: 2, channels: 4, background: "blue" },
  });
  const png = await source.clone().png().toBuffer();
  const webp = await source.clone().webp().toBuffer();
  await sanitizePeerPhoto(png);
  await sanitizePeerPhoto(webp);

  const animationChunk = Buffer.alloc(20);
  animationChunk.writeUInt32BE(8, 0);
  animationChunk.write("acTL", 4, "ascii");
  const apng = Buffer.concat([
    png.subarray(0, 33),
    animationChunk,
    png.subarray(33),
  ]);
  await assert.rejects(sanitizePeerPhoto(apng));

  const webpAnimation = Buffer.alloc(14);
  webpAnimation.write("ANIM", 0, "ascii");
  webpAnimation.writeUInt32LE(6, 4);
  const animatedWebp = Buffer.concat([
    webp.subarray(0, 12),
    webpAnimation,
    webp.subarray(12),
  ]);
  animatedWebp.writeUInt32LE(animatedWebp.length - 8, 4);
  await assert.rejects(sanitizePeerPhoto(animatedWebp));
});

test("decoder rejects unsupported magic, trailing payloads, malformed and excessive input", async () => {
  const jpeg = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(
    sanitizePeerPhoto(new Uint8Array([60, 115, 118, 103, 62])),
  );
  await assert.rejects(
    sanitizePeerPhoto(
      Buffer.concat([jpeg, Buffer.from("<script>bad</script>")]),
    ),
  );
  await assert.rejects(
    sanitizePeerPhoto(
      Buffer.concat([
        jpeg,
        Buffer.from("<script>bad</script>"),
        Buffer.from([0xff, 0xd9]),
      ]),
    ),
  );
  await assert.rejects(sanitizePeerPhoto(jpeg.subarray(0, 20)));
  await assert.rejects(sanitizePeerPhoto(new Uint8Array(5 * 1024 * 1024 + 1)));
  const hugeHeader = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: "red" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(sanitizePeerPhoto(hugeHeader));
});
