import type { PerceptronApparatus, AnimationOptions } from "../index.js";
import type { Weights } from "./weights.js";

export interface ComputeOptions {
  mode?: "step" | "neuron" | "fast";
  stepDuration?: number;
  signal?: AbortSignal;
  onStep?: (info: StepInfo) => void;
}

export interface StepInfo {
  phase: "weights" | "input" | "hidden" | "output";
  progress: number;
  description: string;
}

export interface ComputeResult {
  hidden: number[];
  output: number[];
  prediction: number;
}

export class ComputationAnimator {
  private readonly apparatus: PerceptronApparatus;
  private readonly weights: Weights;
  private readonly nInput: number;
  private readonly nHidden: number;
  private readonly nOutput: number;

  constructor(apparatus: PerceptronApparatus, weights: Weights) {
    this.apparatus = apparatus;
    this.weights = weights;
    this.nInput = weights.B.length;
    this.nHidden = weights.B[0].length;
    this.nOutput = weights.D[0].length;
  }

  async compute(
    inputs: number[],
    opts: ComputeOptions = {},
  ): Promise<ComputeResult> {
    const {
      mode = "step",
      stepDuration = 100,
      signal,
      onStep,
    } = opts;

    const animate = mode !== "fast";
    const perMultiply = mode === "step";
    const animOpts: AnimationOptions = {
      duration: animate ? stepDuration : 0,
    };

    const totalSteps = perMultiply
      ? this.nInput * this.nHidden + this.nHidden * this.nOutput
      : this.nHidden + this.nOutput;
    let currentStep = 0;

    const emit = (phase: StepInfo["phase"], description: string) => {
      onStep?.({
        phase,
        description,
        progress: currentStep / totalSteps,
      });
    };

    signal?.throwIfAborted();

    emit("weights", "Setting weight sliders");
    await this.setWeights(signal);

    emit("input", "Setting input sliders");
    await this.setInputs(inputs, animOpts, signal);

    const hidden = Array.from({ length: this.nHidden }, () => 0);

    for (let j = 0; j < this.nHidden; j++) {
      let acc = 0;
      for (let i = 0; i < this.nInput; i++) {
        signal?.throwIfAborted();
        const product = inputs[i] * this.weights.B[i][j];
        acc += product;

        if (perMultiply) {
          currentStep++;
          emit("hidden", `C${j} += A${i} × B${i},${j}`);
          const logAngle = (currentStep / totalSteps) * 360;
          await Promise.all([
            this.apparatus.setLogRingRotation(logAngle, animOpts),
            this.apparatus.setSlider(
              `C${j}`,
              Math.max(0, acc),
              animOpts,
            ),
          ]);
        }
      }
      hidden[j] = Math.max(0, acc);

      if (!perMultiply) {
        currentStep++;
        if (animate) {
          emit("hidden", `Hidden neuron ${j}: ${hidden[j].toFixed(2)}`);
          await this.apparatus.setSlider(`C${j}`, hidden[j], animOpts);
        } else {
          await this.apparatus.setSlider(`C${j}`, hidden[j], { duration: 0 });
        }
      }
    }

    const output = Array.from({ length: this.nOutput }, () => 0);

    for (let k = 0; k < this.nOutput; k++) {
      let acc = 0;
      for (let j = 0; j < this.nHidden; j++) {
        signal?.throwIfAborted();
        const product = hidden[j] * this.weights.D[j][k];
        acc += product;

        if (perMultiply) {
          currentStep++;
          emit("output", `E${k} += C${j} × D${j},${k}`);
          const logAngle = (currentStep / totalSteps) * 360;
          await Promise.all([
            this.apparatus.setLogRingRotation(logAngle, animOpts),
            this.apparatus.setSlider(`E${k}`, acc, animOpts),
          ]);
        }
      }
      output[k] = acc;

      if (!perMultiply) {
        currentStep++;
        if (animate) {
          emit("output", `Output ${k}: ${output[k].toFixed(2)}`);
          await this.apparatus.setSlider(`E${k}`, output[k], animOpts);
        } else {
          await this.apparatus.setSlider(`E${k}`, output[k], { duration: 0 });
        }
      }
    }

    let prediction = 0;
    for (let k = 1; k < this.nOutput; k++) {
      if (output[k] > output[prediction]) prediction = k;
    }

    emit("output", `Prediction: ${prediction}`);

    return { hidden, output, prediction };
  }

  private async setWeights(signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    const values: Record<string, number> = {};

    for (let j = 0; j < this.nHidden; j++) {
      for (let i = 0; i < this.nInput; i++) {
        values[`B${j}-${i}`] = this.weights.B[i][j];
      }
    }
    for (let k = 0; k < this.nOutput; k++) {
      for (let j = 0; j < this.nHidden; j++) {
        values[`D${k}-${j}`] = this.weights.D[j][k];
      }
    }

    await this.apparatus.setSliders(values);
  }

  private async setInputs(
    inputs: number[],
    animOpts: AnimationOptions,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const values: Record<string, number> = {};
    for (let i = 0; i < inputs.length; i++) {
      values[`A${i}`] = inputs[i];
    }
    await this.apparatus.setSliders(values, animOpts);
  }
}
