import { describe, it, expect } from "vitest";
import { PerceptronApparatus } from "../../src/index.js";
import { ComputationAnimator } from "../../src/widgets/animator.js";
import type { Weights } from "../../src/widgets/weights.js";

function makeApparatus(): PerceptronApparatus {
  const container = document.createElement("div");
  return new PerceptronApparatus(container, {
    nInput: 4,
    nHidden: 2,
    nOutput: 3,
  });
}

const testWeights: Weights = {
  B: [
    [1, 0],
    [0, 1],
    [1, -1],
    [0.5, 0.5],
  ],
  D: [
    [1, 0, -1],
    [0, 1, 1],
  ],
};

describe("ComputationAnimator", () => {
  it("computes correct forward pass in fast mode", async () => {
    const app = makeApparatus();
    const animator = new ComputationAnimator(app, testWeights);

    const result = await animator.compute([1, 0, 0, 0], { mode: "fast" });

    expect(result.hidden).toHaveLength(2);
    expect(result.output).toHaveLength(3);

    // hidden = relu([1*1+0*0+0*1+0*0.5, 1*0+0*1+0*(-1)+0*0.5]) = [1, 0]
    expect(result.hidden[0]).toBeCloseTo(1);
    expect(result.hidden[1]).toBeCloseTo(0);

    // output = [1*1+0*0, 1*0+0*1, 1*(-1)+0*1] = [1, 0, -1]
    expect(result.output[0]).toBeCloseTo(1);
    expect(result.output[1]).toBeCloseTo(0);
    expect(result.output[2]).toBeCloseTo(-1);
    expect(result.prediction).toBe(0);
  });

  it("applies ReLU to hidden layer", async () => {
    const app = makeApparatus();
    const animator = new ComputationAnimator(app, testWeights);

    // input [0, 0, 1, 0]: hidden = relu([0+0+1+0, 0+0-1+0]) = [1, 0]
    const result = await animator.compute([0, 0, 1, 0], { mode: "fast" });
    expect(result.hidden[0]).toBeCloseTo(1);
    expect(result.hidden[1]).toBeCloseTo(0);
  });

  it("calls onStep callback in step mode", async () => {
    const app = makeApparatus();
    const animator = new ComputationAnimator(app, testWeights);
    const steps: string[] = [];

    await animator.compute([1, 0, 0, 0], {
      mode: "step",
      stepDuration: 0,
      onStep: (info) => steps.push(info.phase),
    });

    expect(steps).toContain("weights");
    expect(steps).toContain("input");
    expect(steps).toContain("hidden");
    expect(steps).toContain("output");
  });

  it("step mode produces same result as fast mode", async () => {
    const app = makeApparatus();
    const animator = new ComputationAnimator(app, testWeights);
    const input = [0.5, 0.3, 0.8, 0.1];

    const fast = await animator.compute(input, { mode: "fast" });
    const step = await animator.compute(input, {
      mode: "step",
      stepDuration: 0,
    });

    for (let i = 0; i < fast.hidden.length; i++) {
      expect(step.hidden[i]).toBeCloseTo(fast.hidden[i]);
    }
    for (let i = 0; i < fast.output.length; i++) {
      expect(step.output[i]).toBeCloseTo(fast.output[i]);
    }
    expect(step.prediction).toBe(fast.prediction);
  });

  it("can be aborted", async () => {
    const app = makeApparatus();
    const animator = new ComputationAnimator(app, testWeights);
    const controller = new AbortController();
    controller.abort();

    await expect(
      animator.compute([1, 0, 0, 0], {
        mode: "step",
        stepDuration: 0,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("progress goes from 0 to 1", async () => {
    const app = makeApparatus();
    const animator = new ComputationAnimator(app, testWeights);
    const progresses: number[] = [];

    await animator.compute([1, 0, 0, 0], {
      mode: "step",
      stepDuration: 0,
      onStep: (info) => progresses.push(info.progress),
    });

    expect(progresses[0]).toBe(0);
    expect(progresses[progresses.length - 1]).toBe(1);
    for (let i = 1; i < progresses.length; i++) {
      expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1]);
    }
  });
});
