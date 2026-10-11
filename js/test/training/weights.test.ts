// @vitest-environment node
import { describe, it, expect } from "vitest";
import { MLP } from "../../src/training/model.js";
import { extractWeights, fitWeightsToApparatus } from "../../src/training/weights.js";

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

describe("fitWeightsToApparatus", () => {
  const inputs = Array.from({ length: 50 }, (_, n) =>
    Array.from({ length: 36 }, (_, i) => ((n * 7 + i * 13) % 10) / 10),
  );
  const trained = () => {
    const model = new MLP(36, 6, 10);
    const w = extractWeights(model.weights);
    return { B: w.B, D: w.D.map((row) => row.map(Math.abs)) };
  };
  const forward = (w: { B: number[][]; D: number[][] }, x: number[]) => {
    const hidden = w.B[0].map((_, j) =>
      Math.max(
        0,
        x.reduce((acc, v, i) => acc + v * w.B[i][j], 0),
      ),
    );
    return w.D[0].map((_, k) => hidden.reduce((acc, h, j) => acc + h * w.D[j][k], 0));
  };

  it("keeps every hidden slider within its range while it accumulates", () => {
    const fitted = fitWeightsToApparatus(trained(), inputs);
    for (const x of inputs) {
      for (let j = 0; j < 6; j++) {
        let acc = 0;
        for (let i = 0; i < 36; i++) {
          acc += x[i] * fitted.B[i][j];
          // zeroing the weights too small to set shifts the totals a little
          expect(Math.abs(acc)).toBeLessThanOrEqual(5.05);
        }
      }
    }
  });

  it("brings the largest output to the end of its range", () => {
    const fitted = fitWeightsToApparatus(trained(), inputs);
    const largest = Math.max(...inputs.flatMap((x) => forward(fitted, x)));
    expect(largest).toBeLessThanOrEqual(5.05);
    expect(largest).toBeGreaterThan(4);
  });

  it("leaves only weights that can be set on a slider", () => {
    const fitted = fitWeightsToApparatus(trained(), inputs);
    for (const magnitude of [...fitted.B.flat(), ...fitted.D.flat()].map(Math.abs)) {
      expect(magnitude === 0 || (magnitude >= 0.02 && magnitude <= 5.001)).toBe(true);
    }
  });

  it("does not change which output is largest", () => {
    const weights = {
      B: [
        [40, -20],
        [-30, 50],
        [10, 10],
      ],
      D: [
        [0.5, 0.1, 0.3],
        [0.1, 0.6, 0.3],
      ],
    };
    const examples = [
      [1, 0, 0.5],
      [0, 1, 0.2],
      [0.3, 0.3, 1],
    ];
    const argmax = (values: number[]) => values.indexOf(Math.max(...values));
    const fitted = fitWeightsToApparatus(weights, examples);

    for (const x of examples) {
      expect(argmax(forward(fitted, x))).toBe(argmax(forward(weights, x)));
    }
  });

  it("preserves weight shapes", () => {
    const fitted = fitWeightsToApparatus(trained(), inputs);
    expect(fitted.B.length).toBe(36);
    expect(fitted.B[0].length).toBe(6);
    expect(fitted.D.length).toBe(6);
    expect(fitted.D[0].length).toBe(10);
  });
});
