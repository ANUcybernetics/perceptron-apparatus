// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadFromJson, oneHot, SAMPLE_INDICES } from "../../src/training/data.js";

const fixture = JSON.parse(
  readFileSync(join(__dirname, "../fixtures/mnist-sample.json"), "utf-8"),
);

describe("SAMPLE_INDICES", () => {
  it("has 6 indices for 6x6 downsampling", () => {
    expect(SAMPLE_INDICES).toEqual([0, 5, 9, 14, 18, 23]);
  });
});

describe("oneHot", () => {
  it("encodes label 3 correctly", () => {
    const v = oneHot(3);
    expect(v.length).toBe(10);
    expect(v[3]).toBe(1);
    expect(v.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe("loadFromJson", () => {
  it("splits data 90/10", () => {
    const data = loadFromJson(fixture);
    expect(data.trainImages.rows).toBe(90);
    expect(data.testImages.rows).toBe(10);
  });

  it("images have 36 features", () => {
    const data = loadFromJson(fixture);
    expect(data.trainImages.cols).toBe(36);
    expect(data.testImages.cols).toBe(36);
  });

  it("labels are one-hot with 10 classes", () => {
    const data = loadFromJson(fixture);
    expect(data.trainLabels.cols).toBe(10);
    for (const row of data.trainLabels.data) {
      expect(row.reduce((a, b) => a + b, 0)).toBe(1);
    }
  });

  it("pixel values are in [0, 1]", () => {
    const data = loadFromJson(fixture);
    for (const row of data.trainImages.data) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
