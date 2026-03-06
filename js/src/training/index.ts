import { type Matrix, matrix } from "./math.js";
import { MLP } from "./model.js";
import { loadMnist, loadFromJson, type MnistData } from "./data.js";
import {
  extractWeights,
  scaleWeights,
  type ExportedWeights,
} from "./weights.js";

export type { ExportedWeights } from "./weights.js";
export type { MnistData } from "./data.js";
export { loadMnist, loadFromJson } from "./data.js";
export { scaleWeights } from "./weights.js";
export { MLP } from "./model.js";

export interface TrainOptions {
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  weightClamp?: [number, number];
  onEpochEnd?: (epoch: number, loss: number, accuracy: number) => void;
}

export interface TrainResult {
  weights: ExportedWeights;
  testAccuracy: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function batchIndices(total: number, batchSize: number): number[][] {
  const indices = shuffle(Array.from({ length: total }, (_, i) => i));
  const batches: number[][] = [];
  for (let i = 0; i < total; i += batchSize) {
    batches.push(indices.slice(i, i + batchSize));
  }
  return batches;
}

function selectRows(m: Matrix, indices: number[]): Matrix {
  return matrix(indices.map((i) => m.data[i]));
}

function accuracy(model: MLP, images: Matrix, labels: Matrix): number {
  const cache = model.forward(images);
  let correct = 0;
  for (let i = 0; i < images.rows; i++) {
    let predMax = -Infinity;
    let predIdx = 0;
    let trueIdx = 0;
    for (let j = 0; j < cache.output.cols; j++) {
      if (cache.output.data[i][j] > predMax) {
        predMax = cache.output.data[i][j];
        predIdx = j;
      }
      if (labels.data[i][j] === 1) trueIdx = j;
    }
    if (predIdx === trueIdx) correct++;
  }
  return correct / images.rows;
}

export async function trainMnist(
  opts: TrainOptions & { data?: MnistData } = {},
): Promise<TrainResult> {
  const {
    epochs = 5,
    batchSize = 128,
    learningRate = 0.005,
    weightClamp = [-5, 5] as [number, number],
    onEpochEnd,
  } = opts;

  const data = opts.data ?? (await loadMnist());
  const model = new MLP(36, 6, 10);

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const batches = batchIndices(data.trainImages.rows, batchSize);
    let epochLoss = 0;
    let batchCount = 0;

    for (const batch of batches) {
      const xBatch = selectRows(data.trainImages, batch);
      const yBatch = selectRows(data.trainLabels, batch);
      const cache = model.forward(xBatch);
      const loss = model.loss(cache, yBatch);
      const grads = model.backward(cache, yBatch);
      model.step(grads, learningRate, weightClamp);
      epochLoss += loss;
      batchCount++;
    }

    if (onEpochEnd) {
      const acc = accuracy(model, data.testImages, data.testLabels);
      onEpochEnd(epoch, epochLoss / batchCount, acc);
    }
  }

  const testAcc = accuracy(model, data.testImages, data.testLabels);

  return {
    weights: extractWeights(model.weights),
    testAccuracy: testAcc,
  };
}
