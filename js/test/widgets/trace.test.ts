import { describe, it, expect } from "vitest";
import {
  computeTrace,
  traceResult,
  type ComputationStep,
  type MultiplyAccumulateStep,
  type ReluStep,
  type SetInputStep,
  type ArgmaxStep,
} from "../../src/widgets/trace.js";
import type { Weights } from "../../src/widgets/weights.js";

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

function stepsOfType<T extends ComputationStep>(
  steps: ComputationStep[],
  type: T["type"],
): T[] {
  return steps.filter((s) => s.type === type) as T[];
}

describe("computeTrace", () => {
  it("starts with set-input steps for each input", () => {
    const trace = computeTrace([0.5, 0.3, 0.8, 0.1], testWeights);
    const inputs = stepsOfType<SetInputStep>(trace, "set-input");

    expect(inputs).toHaveLength(4);
    expect(inputs[0]).toEqual({ type: "set-input", slider: "A0", value: 0.5 });
    expect(inputs[1]).toEqual({ type: "set-input", slider: "A1", value: 0.3 });
    expect(inputs[2]).toEqual({ type: "set-input", slider: "A2", value: 0.8 });
    expect(inputs[3]).toEqual({ type: "set-input", slider: "A3", value: 0.1 });
  });

  it("generates correct number of multiply-accumulate steps", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );
    // 4 inputs × 2 hidden + 2 hidden × 3 output = 8 + 6 = 14
    expect(macs).toHaveLength(14);
  });

  it("generates relu steps for each hidden neuron", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const relus = stepsOfType<ReluStep>(trace, "relu");
    expect(relus).toHaveLength(2);
    expect(relus[0].neuron).toBe("C0");
    expect(relus[1].neuron).toBe("C1");
  });

  it("ends with an argmax step", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const last = trace[trace.length - 1];
    expect(last.type).toBe("argmax");
  });

  it("computes correct hidden values with ReLU", () => {
    // input [1,0,0,0]: hidden_pre = [1*1+0+0+0, 1*0+0+0+0] = [1, 0]
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const relus = stepsOfType<ReluStep>(trace, "relu");
    expect(relus[0].pre).toBeCloseTo(1);
    expect(relus[0].post).toBeCloseTo(1);
    expect(relus[1].pre).toBeCloseTo(0);
    expect(relus[1].post).toBeCloseTo(0);
  });

  it("applies ReLU correctly for negative pre-activation", () => {
    // input [0,0,1,0]: hidden_pre = [1, -1], post-relu = [1, 0]
    const trace = computeTrace([0, 0, 1, 0], testWeights);
    const relus = stepsOfType<ReluStep>(trace, "relu");
    expect(relus[0].pre).toBeCloseTo(1);
    expect(relus[0].post).toBeCloseTo(1);
    expect(relus[1].pre).toBeCloseTo(-1);
    expect(relus[1].post).toBeCloseTo(0);
  });

  it("computes correct output values", () => {
    // input [1,0,0,0]: hidden=[1,0], output=[1*1+0*0, 1*0+0*1, 1*(-1)+0*1]=[-1,0,1]
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const argmax = trace[trace.length - 1] as ArgmaxStep;
    expect(argmax.values[0]).toBeCloseTo(1);
    expect(argmax.values[1]).toBeCloseTo(0);
    expect(argmax.values[2]).toBeCloseTo(-1);
    expect(argmax.prediction).toBe(0);
  });

  it("accumulator tracks running sum correctly", () => {
    const trace = computeTrace([0.5, 0.3, 0.8, 0.1], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );

    // First hidden neuron (C0): weights are [1, 0, 1, 0.5]
    // acc after each step: 0.5, 0.5, 1.3, 1.35
    const c0Macs = macs.filter((m) => m.target === "C0");
    expect(c0Macs).toHaveLength(4);
    expect(c0Macs[0].accumulator).toBeCloseTo(0.5);
    expect(c0Macs[1].accumulator).toBeCloseTo(0.5);
    expect(c0Macs[2].accumulator).toBeCloseTo(1.3);
    expect(c0Macs[3].accumulator).toBeCloseTo(1.35);
  });

  it("tracks product values correctly", () => {
    const trace = computeTrace([0.5, 0.3, 0.8, 0.1], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );

    const c0Macs = macs.filter((m) => m.target === "C0");
    expect(c0Macs[0].product).toBeCloseTo(0.5 * 1);
    expect(c0Macs[1].product).toBeCloseTo(0.3 * 0);
    expect(c0Macs[2].product).toBeCloseTo(0.8 * 1);
    expect(c0Macs[3].product).toBeCloseTo(0.1 * 0.5);
  });

  it("sets productSign correctly for positive × positive", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );
    // A0 (1) × B0,0 (1) → positive
    expect(macs[0].productSign).toBe(1);
  });

  it("sets productSign correctly for positive × negative", () => {
    // B[2][1] = -1, input[2] = 1
    const trace = computeTrace([0, 0, 1, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );
    // C1 macs: A0×B1-0, A1×B1-1, A2×B1-2, A3×B1-3
    // A2×B1-2 = 1 × (-1), productSign should be -1
    const c1Macs = macs.filter((m) => m.target === "C1");
    expect(c1Macs[2].productSign).toBe(-1);
  });

  it("sets logRingAngle based on absolute input value", () => {
    const trace = computeTrace([0.5, 0, 0, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );
    // log10(0.5) in the mantissa: 0.5 → mantissa is 5.0, log10(5) * 360 ≈ 251.5°
    expect(macs[0].logRingAngle).toBeCloseTo(Math.log10(5) * 360);
  });

  it("sets logRingAngle to 0 for zero input", () => {
    const trace = computeTrace([0, 1, 0, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );
    expect(macs[0].logRingAngle).toBe(0);
  });

  it("references correct slider IDs", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );

    // First MAC: A0 × B0-0 → C0
    expect(macs[0].inputSlider).toBe("A0");
    expect(macs[0].weightSlider).toBe("B0-0");
    expect(macs[0].target).toBe("C0");

    // Last hidden MAC: A3 × B1-3 → C1
    const lastHiddenMac = macs[7]; // index 7 = 4*2-1
    expect(lastHiddenMac.inputSlider).toBe("A3");
    expect(lastHiddenMac.weightSlider).toBe("B1-3");
    expect(lastHiddenMac.target).toBe("C1");

    // First output MAC: C0 × D0-0 → E0
    expect(macs[8].inputSlider).toBe("C0");
    expect(macs[8].weightSlider).toBe("D0-0");
    expect(macs[8].target).toBe("E0");
  });

  it("step ordering: inputs → hidden MACs → relus → output MACs → argmax", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const types = trace.map((s) => s.type);

    const firstInput = types.indexOf("set-input");
    const firstMac = types.indexOf("multiply-accumulate");
    const firstRelu = types.indexOf("relu");
    const lastRelu = types.lastIndexOf("relu");
    const argmaxIdx = types.indexOf("argmax");

    expect(firstInput).toBeLessThan(firstMac);
    expect(firstMac).toBeLessThan(firstRelu);
    expect(lastRelu).toBeLessThan(argmaxIdx);
    expect(argmaxIdx).toBe(trace.length - 1);
  });

  it("relu steps appear after each hidden neuron's MACs", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);

    // Find indices of last MAC for C0 and the relu for C0
    let lastC0Mac = -1;
    let reluC0 = -1;
    let firstC1Mac = -1;

    for (let i = 0; i < trace.length; i++) {
      const s = trace[i];
      if (s.type === "multiply-accumulate" && s.target === "C0") lastC0Mac = i;
      if (s.type === "relu" && s.neuron === "C0") reluC0 = i;
      if (
        s.type === "multiply-accumulate" &&
        s.target === "C1" &&
        firstC1Mac === -1
      )
        firstC1Mac = i;
    }

    expect(reluC0).toBe(lastC0Mac + 1);
    expect(firstC1Mac).toBe(reluC0 + 1);
  });

  it("uses post-relu hidden values for output layer", () => {
    // input [0,0,1,0]: hidden_pre=[1,-1], post-relu=[1,0]
    const trace = computeTrace([0, 0, 1, 0], testWeights);
    const macs = stepsOfType<MultiplyAccumulateStep>(
      trace,
      "multiply-accumulate",
    );
    const outputMacs = macs.filter((m) => m.target.startsWith("E"));

    // C0=1 (post-relu), C1=0 (post-relu, was -1)
    expect(outputMacs[0].inputValue).toBeCloseTo(1); // C0
    expect(outputMacs[1].inputValue).toBeCloseTo(0); // C1
  });
});

describe("traceResult", () => {
  it("extracts hidden, output, and prediction from trace", () => {
    const trace = computeTrace([1, 0, 0, 0], testWeights);
    const result = traceResult(trace);

    expect(result.hidden).toEqual([
      expect.closeTo(1),
      expect.closeTo(0),
    ]);
    expect(result.output).toEqual([
      expect.closeTo(1),
      expect.closeTo(0),
      expect.closeTo(-1),
    ]);
    expect(result.prediction).toBe(0);
  });

  it("matches manual forward pass computation", () => {
    const inputs = [0.5, 0.3, 0.8, 0.1];
    const trace = computeTrace(inputs, testWeights);
    const result = traceResult(trace);

    // Manual: hidden_pre = [0.5+0+0.8+0.05, 0+0.3-0.8+0.05] = [1.35, -0.45]
    // post-relu: [1.35, 0]
    expect(result.hidden[0]).toBeCloseTo(1.35);
    expect(result.hidden[1]).toBeCloseTo(0);

    // output = [1.35*1+0*0, 1.35*0+0*1, 1.35*(-1)+0*1] = [1.35, 0, -1.35]
    expect(result.output[0]).toBeCloseTo(1.35);
    expect(result.output[1]).toBeCloseTo(0);
    expect(result.output[2]).toBeCloseTo(-1.35);
    expect(result.prediction).toBe(0);
  });

  it("throws if trace does not end with argmax", () => {
    expect(() => traceResult([])).toThrow("Trace does not end with argmax");
    expect(() =>
      traceResult([{ type: "set-input", slider: "A0", value: 1 }]),
    ).toThrow("Trace does not end with argmax");
  });
});
