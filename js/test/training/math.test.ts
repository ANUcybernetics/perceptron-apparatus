// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  matrix,
  matMul,
  transpose,
  relu,
  reluBackward,
  mseLoss,
  mseGrad,
  clamp,
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

describe("mseLoss / mseGrad", () => {
  it("computes MSE correctly", () => {
    const pred = matrix([[1, 2, 3]]);
    const target = matrix([[1, 2, 3]]);
    expect(mseLoss(pred, target)).toBe(0);
  });

  it("computes MSE for non-zero diff", () => {
    const pred = matrix([[2, 4]]);
    const target = matrix([[0, 0]]);
    // MSE = (4 + 16) / 2 = 10
    expect(mseLoss(pred, target)).toBe(10);
  });

  it("gradient has correct shape", () => {
    const pred = matrix([
      [1, 2],
      [3, 4],
    ]);
    const target = matrix([
      [0, 0],
      [0, 0],
    ]);
    const g = mseGrad(pred, target);
    expect(g.rows).toBe(2);
    expect(g.cols).toBe(2);
  });
});

describe("clamp", () => {
  it("clamps values to range", () => {
    const m = matrix([[-10, 0, 10]]);
    const c = clamp(m, -5, 5);
    expect(c.data).toEqual([[-5, 0, 5]]);
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
