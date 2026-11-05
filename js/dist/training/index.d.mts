import { t as WeightScale } from "../utils-BLX4_wgO.mjs";
type Matrix = {
  data: number[][];
  rows: number;
  cols: number;
};
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
interface ExportedWeights {
  B: number[][];
  D: number[][];
}
export declare function fitWeightsToApparatus(weights: ExportedWeights, inputs: number[][]): ExportedWeights;
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
export type { ExportedWeights, MnistData };