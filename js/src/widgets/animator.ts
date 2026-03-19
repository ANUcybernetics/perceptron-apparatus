import type { PerceptronApparatus, AnimationOptions } from "../index.js";
import type { Weights } from "./weights.js";
import {
  computeTrace,
  traceResult,
  type ComputationStep,
  type MultiplyAccumulateStep,
} from "./trace.js";

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
  step?: ComputationStep;
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

    const trace = computeTrace(inputs, this.weights);
    const macSteps = trace.filter(
      (s): s is MultiplyAccumulateStep => s.type === "multiply-accumulate",
    );

    const totalSteps = perMultiply
      ? this.nInput * this.nHidden + this.nHidden * this.nOutput
      : this.nHidden + this.nOutput;
    let currentStep = 0;

    const emit = (
      phase: StepInfo["phase"],
      description: string,
      step?: ComputationStep,
    ) => {
      onStep?.({
        phase,
        description,
        progress: currentStep / totalSteps,
        step,
      });
    };

    signal?.throwIfAborted();

    emit("weights", "Setting weight sliders");
    await this.setWeights(signal);

    emit("input", "Setting input sliders");
    await this.setInputs(inputs, animOpts, signal);

    const hidden = Array.from({ length: this.nHidden }, () => 0);
    let macIndex = 0;

    for (let j = 0; j < this.nHidden; j++) {
      let acc = 0;
      for (let i = 0; i < this.nInput; i++) {
        signal?.throwIfAborted();
        const mac = macSteps[macIndex++];
        acc = mac.accumulator;

        if (perMultiply) {
          currentStep++;
          emit("hidden", `C${j} += A${i} × B${i},${j}`, mac);
          await Promise.all([
            this.apparatus.setLogRingRotation(mac.logRingAngle, animOpts),
            this.apparatus.setSlider(
              `C${j}`,
              Math.max(0, acc),
              animOpts,
            ),
            this.apparatus.setSlideRuleMarkers?.(mac, animOpts),
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
        const mac = macSteps[macIndex++];
        acc = mac.accumulator;

        if (perMultiply) {
          currentStep++;
          emit("output", `E${k} += C${j} × D${j},${k}`, mac);
          await Promise.all([
            this.apparatus.setLogRingRotation(mac.logRingAngle, animOpts),
            this.apparatus.setSlider(`E${k}`, acc, animOpts),
            this.apparatus.setSlideRuleMarkers?.(mac, animOpts),
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

    const argmaxStep = trace[trace.length - 1];
    emit("output", `Prediction: ${prediction}`, argmaxStep);

    this.apparatus.clearSlideRuleMarkers?.();

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
