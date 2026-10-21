import { t as WeightScale } from "../utils-CjaQpp0C.mjs";
//#region src/training/math.d.ts
type Matrix = {
  data: number[][];
  rows: number;
  cols: number;
};
//#endregion
//#region src/training/data.d.ts
interface MnistData {
  trainImages: Matrix;
  trainLabels: Matrix;
  testImages: Matrix;
  testLabels: Matrix;
}
export declare function loadMnist(): Promise<MnistData>;
export declare function loadFromJson(json: {
  images: number[][];
  labels: number[];
}): MnistData;
//#endregion
//#region src/training/model.d.ts
interface MLPWeights {
  B: Matrix;
  D: Matrix;
}
interface MLPGradients {
  dB: Matrix;
  dD: Matrix;
}
interface ForwardCache {
  input: Matrix;
  hiddenPre: Matrix;
  hidden: Matrix;
  output: Matrix;
  weights: MLPWeights;
  noise?: MLPWeights;
}
export declare class MLP {
  weights: MLPWeights;
  private adamB;
  private adamD;
  private t;
  constructor(inputSize?: number, hiddenSize?: number, outputSize?: number);
  forward(input: Matrix, weightNoise?: number, weightScale?: WeightScale): ForwardCache;
  backward(cache: ForwardCache, target: Matrix): MLPGradients;
  step(grads: MLPGradients, lr: number, nonnegativeOutput?: boolean): void;
  loss(cache: ForwardCache, target: Matrix): number;
}
//#endregion
//#region src/training/weights.d.ts
interface ExportedWeights {
  B: number[][];
  D: number[][];
}
export declare function fitWeightsToApparatus(weights: ExportedWeights, inputs: number[][]): ExportedWeights;
//#endregion
//#region src/training/index.d.ts
export interface TrainOptions {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  nonnegativeOutput?: boolean;
  weightScale?: WeightScale;
  weightNoise?: number;
  onEpochEnd?: (epoch: number, loss: number, accuracy: number) => void;
}
export interface TrainResult {
  weights: ExportedWeights;
  testAccuracy: number;
}
export declare function trainMnist(opts?: TrainOptions & {
  data?: MnistData;
}): Promise<TrainResult>;
//#endregion
export type { ExportedWeights, MnistData };