import {
  type Matrix,
  type AdamState,
  matMul,
  transpose,
  relu,
  reluBackward,
  crossEntropyLoss,
  crossEntropyGrad,
  clampMin,
  adamInit,
  adamUpdate,
  noiseFactors,
  gaussian,
  multiply,
  randomMatrix,
} from "./math.js";
import { HIDDEN_MAX, OUTPUT_MAX } from "./weights.js";
import { WEIGHT_MAX, type WeightScale } from "../utils.js";

export interface MLPWeights {
  B: Matrix;
  D: Matrix;
}

export interface MLPGradients {
  dB: Matrix;
  dD: Matrix;
}

export interface ForwardCache {
  input: Matrix;
  hiddenPre: Matrix;
  hidden: Matrix;
  output: Matrix;
  // the weights the pass was computed with, and the factors that perturbed them
  weights: MLPWeights;
  noise?: MLPWeights;
}

// The weights with a random offset on every one, the same size on the apparatus
// for all of them: `level` is its standard deviation as a fraction of the
// slot's length. What one unit on the apparatus is in each layer's weights as
// trained is estimated from this batch, as fitWeightsToApparatus would rescale
// them.
function offsetWeights(weights: MLPWeights, input: Matrix, level: number): MLPWeights {
  const tiny = 1e-6;
  const { B, D } = weights;
  const hiddenPre = matMul(input, B);
  const hiddenScale = Array.from({ length: B.cols }, (_, j) => {
    const peak = Math.max(tiny, ...hiddenPre.data.map((row) => Math.abs(row[j])));
    const largest = Math.max(tiny, ...B.data.map((row) => Math.abs(row[j])));
    return Math.min(HIDDEN_MAX / peak, WEIGHT_MAX / largest);
  });

  const fittedD = D.data.map((row, j) => row.map((v) => v / hiddenScale[j]));
  let outputPeak = tiny;
  for (const row of hiddenPre.data) {
    for (let k = 0; k < D.cols; k++) {
      let out = 0;
      for (let j = 0; j < B.cols; j++) out += Math.max(0, row[j] * hiddenScale[j]) * fittedD[j][k];
      outputPeak = Math.max(outputPeak, Math.abs(out));
    }
  }
  const largestD = Math.max(tiny, ...fittedD.flat().map(Math.abs));
  const outputScale = Math.min(OUTPUT_MAX / outputPeak, WEIGHT_MAX / largestD);

  const slot = 2 * WEIGHT_MAX * level;
  return {
    B: {
      ...B,
      data: B.data.map((row) => row.map((v, j) => v + (gaussian() * slot) / hiddenScale[j])),
    },
    D: {
      ...D,
      data: D.data.map((row, j) =>
        row.map((v) => v + (gaussian() * slot * hiddenScale[j]) / outputScale),
      ),
    },
  };
}

export class MLP {
  weights: MLPWeights;
  private adamB: AdamState;
  private adamD: AdamState;
  private t = 0;

  constructor(inputSize = 36, hiddenSize = 6, outputSize = 10) {
    const bScale = Math.sqrt(2 / inputSize);
    const dScale = Math.sqrt(2 / hiddenSize);
    this.weights = {
      B: randomMatrix(inputSize, hiddenSize, bScale),
      D: randomMatrix(hiddenSize, outputSize, dScale),
    };
    this.adamB = adamInit(inputSize, hiddenSize);
    this.adamD = adamInit(hiddenSize, outputSize);
  }

  // With weightNoise, every weight is perturbed afresh, so training favours
  // weights that still work when a slider is set slightly off. On the linear
  // scale a slider is off by the same distance wherever it sits, so the noise is
  // an offset whose standard deviation is that fraction of the slot's length. On
  // the log scale it is off by the same ratio, so the noise is a factor whose
  // log has that standard deviation.
  forward(input: Matrix, weightNoise = 0, weightScale: WeightScale = "linear"): ForwardCache {
    if (weightNoise > 0 && weightScale === "linear") {
      const weights = offsetWeights(this.weights, input, weightNoise);
      const hiddenPre = matMul(input, weights.B);
      const hidden = relu(hiddenPre);
      return { input, hiddenPre, hidden, output: matMul(hidden, weights.D), weights };
    }

    const noise =
      weightNoise > 0
        ? {
            B: noiseFactors(this.weights.B.rows, this.weights.B.cols, weightNoise),
            D: noiseFactors(this.weights.D.rows, this.weights.D.cols, weightNoise),
          }
        : undefined;
    const weights = noise
      ? { B: multiply(this.weights.B, noise.B), D: multiply(this.weights.D, noise.D) }
      : this.weights;

    const hiddenPre = matMul(input, weights.B);
    const hidden = relu(hiddenPre);
    const output = matMul(hidden, weights.D);
    return { input, hiddenPre, hidden, output, weights, noise };
  }

  backward(cache: ForwardCache, target: Matrix): MLPGradients {
    const dOutput = crossEntropyGrad(cache.output, target);
    const dD = matMul(transpose(cache.hidden), dOutput);
    const dHidden = matMul(dOutput, transpose(cache.weights.D));
    const dHiddenPre = reluBackward(cache.hiddenPre, dHidden);
    const dB = matMul(transpose(cache.input), dHiddenPre);
    return cache.noise
      ? { dB: multiply(dB, cache.noise.B), dD: multiply(dD, cache.noise.D) }
      : { dB, dD };
  }

  // With nonnegativeOutput, D is projected onto zero-or-above after each update,
  // so every output slider only ever accumulates upwards.
  step(grads: MLPGradients, lr: number, nonnegativeOutput = true): void {
    this.t++;
    this.weights.B = adamUpdate(this.weights.B, grads.dB, this.adamB, lr, this.t);
    const d = adamUpdate(this.weights.D, grads.dD, this.adamD, lr, this.t);
    this.weights.D = nonnegativeOutput ? clampMin(d, 0) : d;
  }

  loss(cache: ForwardCache, target: Matrix): number {
    return crossEntropyLoss(cache.output, target);
  }
}
