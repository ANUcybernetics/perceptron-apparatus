// @vitest-environment node
import { describe, it, expect } from "vitest";
import { MLP } from "../../src/training/model.js";
import { matrix } from "../../src/training/math.js";

describe("MLP", () => {
  it("forward pass produces correct output shape", () => {
    const model = new MLP(36, 6, 10);
    const input = matrix(Array.from({ length: 4 }, () => Array.from({ length: 36 }, () => 0.5)));
    const cache = model.forward(input);
    expect(cache.output.rows).toBe(4);
    expect(cache.output.cols).toBe(10);
    expect(cache.hidden.rows).toBe(4);
    expect(cache.hidden.cols).toBe(6);
  });

  it("hidden activations are non-negative (ReLU)", () => {
    const model = new MLP(36, 6, 10);
    const input = matrix(
      Array.from({ length: 8 }, () => Array.from({ length: 36 }, () => Math.random())),
    );
    const cache = model.forward(input);
    for (const row of cache.hidden.data) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("training step reduces loss", () => {
    const model = new MLP(4, 3, 2);
    const input = matrix([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
    const target = matrix([
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
    ]);

    const cache1 = model.forward(input);
    const loss1 = model.loss(cache1, target);

    for (let i = 0; i < 50; i++) {
      const cache = model.forward(input);
      const grads = model.backward(cache, target);
      model.step(grads, 0.01);
    }

    const cache2 = model.forward(input);
    const loss2 = model.loss(cache2, target);
    expect(loss2).toBeLessThan(loss1);
  });

  it("still learns when every weight is perturbed on each pass", () => {
    const model = new MLP(4, 3, 2);
    const input = matrix([
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
    ]);
    const target = matrix([
      [1, 0],
      [0, 1],
      [1, 0],
      [0, 1],
    ]);
    const before = model.loss(model.forward(input), target);

    for (let i = 0; i < 200; i++) {
      const cache = model.forward(input, 0.1);
      model.step(model.backward(cache, target), 0.01, false);
    }

    expect(model.loss(model.forward(input), target)).toBeLessThan(before);
  });

  it("keeps output weights non-negative unless told otherwise", () => {
    const input = matrix([
      [1, 0],
      [0, 1],
    ]);
    const target = matrix([
      [1, 0],
      [0, 1],
    ]);
    const model = new MLP(2, 3, 2);

    for (let i = 0; i < 50; i++) {
      const cache = model.forward(input);
      model.step(model.backward(cache, target), 0.05);
      expect(Math.min(...model.weights.D.data.flat())).toBeGreaterThanOrEqual(0);
    }
  });
});
