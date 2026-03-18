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
declare function loadMnist(): Promise<MnistData>;
declare function loadFromJson(json: {
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
}
declare class MLP {
  weights: MLPWeights;
  private adamB;
  private adamD;
  private t;
  constructor(inputSize?: number, hiddenSize?: number, outputSize?: number);
  forward(input: Matrix): ForwardCache;
  backward(cache: ForwardCache, target: Matrix): MLPGradients;
  step(grads: MLPGradients, lr: number, weightClamp: [number, number]): void;
  loss(cache: ForwardCache, target: Matrix): number;
}
//#endregion
//#region src/training/weights.d.ts
interface ExportedWeights {
  B: number[][];
  D: number[][];
}
declare function scaleWeights(weights: ExportedWeights, targetMax?: number): ExportedWeights;
//#endregion
//#region src/training/index.d.ts
interface TrainOptions {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  weightClamp?: [number, number];
  onEpochEnd?: (epoch: number, loss: number, accuracy: number) => void;
}
interface TrainResult {
  weights: ExportedWeights;
  testAccuracy: number;
}
declare function trainMnist(opts?: TrainOptions & {
  data?: MnistData;
}): Promise<TrainResult>;
//#endregion
export { type ExportedWeights, MLP, type MnistData, TrainOptions, TrainResult, loadFromJson, loadMnist, scaleWeights, trainMnist };