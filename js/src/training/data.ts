import { inflateSync } from "node:zlib";
import { type Matrix, matrix } from "./math.js";

export interface MnistData {
  trainImages: Matrix;
  trainLabels: Matrix;
  testImages: Matrix;
  testLabels: Matrix;
}

const MNIST_BASE =
  "https://storage.googleapis.com/cvdf-datasets/mnist/";

const SAMPLE_INDICES = [0, 5, 9, 14, 18, 23];

async function fetchGz(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const compressed = Buffer.from(await res.arrayBuffer());
  return inflateSync(compressed, { windowBits: 16 + 15 });
}

function parseImages(buf: Buffer): number[][] {
  const count = buf.readUInt32BE(4);
  const rows = buf.readUInt32BE(8);
  const cols = buf.readUInt32BE(12);
  const images: number[][] = [];
  let offset = 16;

  for (let i = 0; i < count; i++) {
    const pixels = new Uint8Array(buf.buffer, buf.byteOffset + offset, rows * cols);
    offset += rows * cols;
    images.push(downsample(pixels, rows, cols));
  }
  return images;
}

function parseLabels(buf: Buffer): number[] {
  const count = buf.readUInt32BE(4);
  const labels: number[] = [];
  for (let i = 0; i < count; i++) {
    labels.push(buf[8 + i]);
  }
  return labels;
}

function downsample(pixels: Uint8Array, rows: number, cols: number): number[] {
  const result: number[] = [];
  for (const r of SAMPLE_INDICES) {
    for (const c of SAMPLE_INDICES) {
      result.push(pixels[r * cols + c] / 255);
    }
  }
  return result;
}

function oneHot(label: number, numClasses = 10): number[] {
  const vec = Array.from({ length: numClasses }, () => 0);
  vec[label] = 1;
  return vec;
}

export async function loadMnist(): Promise<MnistData> {
  const [imagesBuf, labelsBuf] = await Promise.all([
    fetchGz(`${MNIST_BASE}train-images-idx3-ubyte.gz`),
    fetchGz(`${MNIST_BASE}train-labels-idx1-ubyte.gz`),
  ]);

  const images = parseImages(imagesBuf);
  const labels = parseLabels(labelsBuf);

  const splitIdx = Math.floor(images.length * 0.9);

  return {
    trainImages: matrix(images.slice(0, splitIdx)),
    trainLabels: matrix(labels.slice(0, splitIdx).map((l) => oneHot(l))),
    testImages: matrix(images.slice(splitIdx)),
    testLabels: matrix(labels.slice(splitIdx).map((l) => oneHot(l))),
  };
}

export function loadFromJson(json: {
  images: number[][];
  labels: number[];
}): MnistData {
  const splitIdx = Math.floor(json.images.length * 0.9);
  return {
    trainImages: matrix(json.images.slice(0, splitIdx)),
    trainLabels: matrix(
      json.labels.slice(0, splitIdx).map((l) => oneHot(l)),
    ),
    testImages: matrix(json.images.slice(splitIdx)),
    testLabels: matrix(
      json.labels.slice(splitIdx).map((l) => oneHot(l)),
    ),
  };
}

export { downsample, oneHot, SAMPLE_INDICES };
