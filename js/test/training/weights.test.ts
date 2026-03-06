// @vitest-environment node
import { describe, it, expect } from "vitest";
import { MLP } from "../../src/training/model.js";
import { extractWeights, scaleWeights } from "../../src/training/weights.js";

describe("extractWeights", () => {
  it("returns B with shape 36x6 and D with shape 6x10", () => {
    const model = new MLP(36, 6, 10);
    const w = extractWeights(model.weights);
    expect(w.B.length).toBe(36);
    expect(w.B[0].length).toBe(6);
    expect(w.D.length).toBe(6);
    expect(w.D[0].length).toBe(10);
  });

  it("returns copies, not references", () => {
    const model = new MLP(36, 6, 10);
    const w = extractWeights(model.weights);
    w.B[0][0] = 999;
    expect(model.weights.B.data[0][0]).not.toBe(999);
  });
});

describe("scaleWeights", () => {
  it("scales max abs value to target", () => {
    const model = new MLP(36, 6, 10);
    const w = extractWeights(model.weights);
    const scaled = scaleWeights(w, 5.0);

    const maxB = Math.max(...scaled.B.flat().map(Math.abs));
    const maxD = Math.max(...scaled.D.flat().map(Math.abs));
    const overallMax = Math.max(maxB, maxD);
    expect(overallMax).toBeCloseTo(5.0, 4);
  });

  it("preserves weight shapes", () => {
    const model = new MLP(36, 6, 10);
    const w = extractWeights(model.weights);
    const scaled = scaleWeights(w, 3.0);
    expect(scaled.B.length).toBe(36);
    expect(scaled.B[0].length).toBe(6);
    expect(scaled.D.length).toBe(6);
    expect(scaled.D[0].length).toBe(10);
  });

  it("keeps both layers within target max", () => {
    const model = new MLP(36, 6, 10);
    const w = extractWeights(model.weights);
    const scaled = scaleWeights(w, 5.0);
    const scaledMaxB = Math.max(...scaled.B.flat().map(Math.abs));
    const scaledMaxD = Math.max(...scaled.D.flat().map(Math.abs));
    expect(scaledMaxB).toBeLessThanOrEqual(5.001);
    expect(scaledMaxD).toBeLessThanOrEqual(5.001);
  });
});
