// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { trainMnist } from "../../src/training/index.js";
import { loadFromJson } from "../../src/training/data.js";

const fixture = JSON.parse(readFileSync(join(__dirname, "../fixtures/mnist-sample.json"), "utf-8"));

describe("integration: train on fixture data", () => {
  it("returns weights that can be set on the apparatus", async () => {
    const data = loadFromJson(fixture);
    const result = await trainMnist({
      data,
      epochs: 3,
      batchSize: 32,
      learningRate: 0.005,
    });

    for (const v of result.weights.B.flat()) {
      expect(Math.abs(v)).toBeLessThanOrEqual(5.001);
    }
    // output weights are non-negative, so outputs only ever accumulate upwards
    for (const v of result.weights.D.flat()) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(5.001);
    }

    expect(result.weights.B.length).toBe(36);
    expect(result.weights.B[0].length).toBe(6);
    expect(result.weights.D.length).toBe(6);
    expect(result.weights.D[0].length).toBe(10);
  });

  it("calls onEpochEnd callback", async () => {
    const data = loadFromJson(fixture);
    const epochs: number[] = [];
    await trainMnist({
      data,
      epochs: 3,
      batchSize: 32,
      onEpochEnd: (epoch) => epochs.push(epoch),
    });
    expect(epochs).toEqual([1, 2, 3]);
  });
});
