// The first 100 MNIST training digits, downsampled to 6x6 the way the twin's
// loader does it (js/src/training/data.ts), for the videos' mosaic of
// training examples. Writes _kit/mnist-digits.json; run with
// `node video/build-data.mjs`.
import { writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

// SAMPLE_INDICES in js/src/training/data.ts: every fifth row and column or so
const SAMPLE_INDICES = [0, 5, 9, 14, 18, 23];
const URL_IMAGES = "https://storage.googleapis.com/cvdf-datasets/mnist/train-images-idx3-ubyte.gz";
const res = await fetch(URL_IMAGES);
if (!res.ok) throw new Error(`${URL_IMAGES}: ${res.status}`);
const buf = gunzipSync(Buffer.from(await res.arrayBuffer()));
const rows = buf.readUInt32BE(8);
const cols = buf.readUInt32BE(12);
const images = Array.from({ length: 100 }, (_, n) =>
  SAMPLE_INDICES.flatMap((r) =>
    SAMPLE_INDICES.map((c) => Math.round((buf[16 + n * rows * cols + r * cols + c] / 255) * 1000) / 1000),
  ),
);
writeFileSync(new URL("./_kit/mnist-digits.json", import.meta.url), `${JSON.stringify({ images })}\n`);
