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
  multiply,
  randomMatrix,
} from "./math.js";

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

  // With weightNoise, every weight is multiplied by a fresh random factor whose
  // log has that standard deviation, so training favours weights that still work
  // when a slider is set slightly off.
  forward(input: Matrix, weightNoise = 0): ForwardCache {
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
