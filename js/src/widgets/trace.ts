import type { Weights } from "./weights.js";

export type ComputationStep =
  | SetInputStep
  | MultiplyAccumulateStep
  | ReluStep
  | ArgmaxStep;

export interface SetInputStep {
  type: "set-input";
  slider: string;
  value: number;
}

export interface MultiplyAccumulateStep {
  type: "multiply-accumulate";
  target: string;
  inputSlider: string;
  inputValue: number;
  weightSlider: string;
  weightValue: number;
  product: number;
  accumulator: number;
  logRingAngle: number;
  productSign: 1 | -1;
}

export interface ReluStep {
  type: "relu";
  neuron: string;
  pre: number;
  post: number;
}

export interface ArgmaxStep {
  type: "argmax";
  prediction: number;
  values: number[];
}

function slideRuleAngle(absValue: number): number {
  if (absValue <= 0) return 0;
  const decade = Math.floor(Math.log10(absValue));
  const mantissa = absValue / 10 ** decade;
  return (Math.log10(mantissa) / Math.log10(10)) * 360;
}

export function computeTrace(
  inputs: number[],
  weights: Weights,
): ComputationStep[] {
  const nInput = weights.B.length;
  const nHidden = weights.B[0].length;
  const nOutput = weights.D[0].length;
  const steps: ComputationStep[] = [];

  for (let i = 0; i < inputs.length; i++) {
    steps.push({ type: "set-input", slider: `A${i}`, value: inputs[i] });
  }

  const hidden = Array.from({ length: nHidden }, () => 0);

  for (let j = 0; j < nHidden; j++) {
    let acc = 0;
    for (let i = 0; i < nInput; i++) {
      const inputValue = inputs[i];
      const weightValue = weights.B[i][j];
      const product = inputValue * weightValue;
      acc += product;

      const absInput = Math.abs(inputValue);
      const productSign: 1 | -1 =
        Math.sign(inputValue) * Math.sign(weightValue) >= 0 ? 1 : -1;

      steps.push({
        type: "multiply-accumulate",
        target: `C${j}`,
        inputSlider: `A${i}`,
        inputValue,
        weightSlider: `B${j}-${i}`,
        weightValue,
        product,
        accumulator: acc,
        logRingAngle: slideRuleAngle(absInput),
        productSign,
      });
    }

    const post = Math.max(0, acc);
    steps.push({ type: "relu", neuron: `C${j}`, pre: acc, post });
    hidden[j] = post;
  }

  const output = Array.from({ length: nOutput }, () => 0);

  for (let k = 0; k < nOutput; k++) {
    let acc = 0;
    for (let j = 0; j < nHidden; j++) {
      const inputValue = hidden[j];
      const weightValue = weights.D[j][k];
      const product = inputValue * weightValue;
      acc += product;

      const absInput = Math.abs(inputValue);
      const productSign: 1 | -1 =
        Math.sign(inputValue) * Math.sign(weightValue) >= 0 ? 1 : -1;

      steps.push({
        type: "multiply-accumulate",
        target: `E${k}`,
        inputSlider: `C${j}`,
        inputValue,
        weightSlider: `D${k}-${j}`,
        weightValue,
        product,
        accumulator: acc,
        logRingAngle: slideRuleAngle(absInput),
        productSign,
      });
    }
    output[k] = acc;
  }

  let prediction = 0;
  for (let k = 1; k < nOutput; k++) {
    if (output[k] > output[prediction]) prediction = k;
  }
  steps.push({ type: "argmax", prediction, values: [...output] });

  return steps;
}

export function traceResult(steps: ComputationStep[]): {
  hidden: number[];
  output: number[];
  prediction: number;
} {
  const last = steps[steps.length - 1];
  if (!last || last.type !== "argmax") {
    throw new Error("Trace does not end with argmax step");
  }

  const reluSteps = steps.filter(
    (s): s is ReluStep => s.type === "relu",
  );
  const hidden = reluSteps.map((s) => s.post);

  return { hidden, output: last.values, prediction: last.prediction };
}
