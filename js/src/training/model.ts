import {
  type Matrix,
  type AdamState,
  matMul,
  transpose,
  relu,
  reluBackward,
  mseLoss,
  mseGrad,
  clamp,
  adamInit,
  adamUpdate,
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

  forward(input: Matrix): ForwardCache {
    const hiddenPre = matMul(input, this.weights.B);
    const hidden = relu(hiddenPre);
    const output = matMul(hidden, this.weights.D);
    return { input, hiddenPre, hidden, output };
  }

  backward(cache: ForwardCache, target: Matrix): MLPGradients {
    const dOutput = mseGrad(cache.output, target);
    const dD = matMul(transpose(cache.hidden), dOutput);
    const dHidden = matMul(dOutput, transpose(this.weights.D));
    const dHiddenPre = reluBackward(cache.hiddenPre, dHidden);
    const dB = matMul(transpose(cache.input), dHiddenPre);
    return { dB, dD };
  }

  step(
    grads: MLPGradients,
    lr: number,
    weightClamp: [number, number],
  ): void {
    this.t++;
    this.weights.B = clamp(
      adamUpdate(this.weights.B, grads.dB, this.adamB, lr, this.t),
      weightClamp[0],
      weightClamp[1],
    );
    this.weights.D = clamp(
      adamUpdate(this.weights.D, grads.dD, this.adamD, lr, this.t),
      weightClamp[0],
      weightClamp[1],
    );
  }

  loss(cache: ForwardCache, target: Matrix): number {
    return mseLoss(cache.output, target);
  }
}
