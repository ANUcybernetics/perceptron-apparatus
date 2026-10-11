// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  matrix,
  matMul,
  transpose,
  relu,
  reluBackward,
  crossEntropyLoss,
  crossEntropyGrad,
  clampMin,
  adamInit,
  adamUpdate,
} from "../../src/training/math.js";

describe("matMul", () => {
  it("multiplies 2x3 by 3x2", () => {
    const a = matrix([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    const b = matrix([
      [7, 8],
      [9, 10],
      [11, 12],
    ]);
    const c = matMul(a, b);
    expect(c.rows).toBe(2);
    expect(c.cols).toBe(2);
    expect(c.data).toEqual([
      [58, 64],
      [139, 154],
    ]);
  });

  it("multiplies identity", () => {
    const a = matrix([
      [1, 0],
      [0, 1],
    ]);
    const b = matrix([
      [3, 4],
      [5, 6],
    ]);
    const c = matMul(a, b);
    expect(c.data).toEqual(b.data);
  });
});

describe("transpose", () => {
  it("transposes a 2x3 matrix", () => {
    const m = matrix([
      [1, 2, 3],
      [4, 5, 6],
    ]);
    const t = transpose(m);
    expect(t.rows).toBe(3);
    expect(t.cols).toBe(2);
    expect(t.data).toEqual([
      [1, 4],
      [2, 5],
      [3, 6],
    ]);
  });
});

describe("relu", () => {
  it("zeroes negative values", () => {
    const m = matrix([[-1, 2, -3, 4]]);
    const r = relu(m);
    expect(r.data).toEqual([[0, 2, 0, 4]]);
  });
});

describe("reluBackward", () => {
  it("masks gradient where pre-activation <= 0", () => {
    const pre = matrix([[-1, 2, 0, 4]]);
    const grad = matrix([[1, 1, 1, 1]]);
    const r = reluBackward(pre, grad);
    expect(r.data).toEqual([[0, 1, 0, 1]]);
  });
});

describe("crossEntropyLoss / crossEntropyGrad", () => {
  it("is ln(classes) when every output is equal", () => {
    const logits = matrix([[0, 0, 0, 0]]);
    const target = matrix([[0, 1, 0, 0]]);
    expect(crossEntropyLoss(logits, target)).toBeCloseTo(Math.log(4));
  });

  it("approaches zero when the labelled output dominates", () => {
    const logits = matrix([[20, 0, 0]]);
    const target = matrix([[1, 0, 0]]);
    expect(crossEntropyLoss(logits, target)).toBeCloseTo(0, 6);
  });

  it("gradient is softmax minus target, averaged over rows", () => {
    const logits = matrix([
      [0, 0],
      [0, 0],
    ]);
    const target = matrix([
      [1, 0],
      [0, 1],
    ]);
    const g = crossEntropyGrad(logits, target);
    expect(g.data[0][0]).toBeCloseTo(-0.25);
    expect(g.data[0][1]).toBeCloseTo(0.25);
    expect(g.data[1][0]).toBeCloseTo(0.25);
    expect(g.data[1][1]).toBeCloseTo(-0.25);
  });
});

describe("clampMin", () => {
  it("raises values below the minimum", () => {
    const m = matrix([[-10, 0, 10]]);
    expect(clampMin(m, 0).data).toEqual([[0, 0, 10]]);
  });
});

describe("adamUpdate", () => {
  it("moves parameters in direction that reduces gradient", () => {
    const param = matrix([[1.0, -1.0]]);
    const grad = matrix([[0.5, -0.5]]);
    const state = adamInit(1, 2);
    const updated = adamUpdate(param, grad, state, 0.01, 1);
    expect(updated.data[0][0]).toBeLessThan(1.0);
    expect(updated.data[0][1]).toBeGreaterThan(-1.0);
  });
});
