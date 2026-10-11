export type Matrix = { data: number[][]; rows: number; cols: number };

export function matrix(data: number[][]): Matrix {
  return { data, rows: data.length, cols: data[0]?.length ?? 0 };
}

export function zeros(rows: number, cols: number): Matrix {
  const data = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
  return { data, rows, cols };
}

export function matMul(a: Matrix, b: Matrix): Matrix {
  const result = zeros(a.rows, b.cols);
  for (let i = 0; i < a.rows; i++) {
    for (let k = 0; k < a.cols; k++) {
      const aik = a.data[i][k];
      for (let j = 0; j < b.cols; j++) {
        result.data[i][j] += aik * b.data[k][j];
      }
    }
  }
  return result;
}

export function transpose(m: Matrix): Matrix {
  const result = zeros(m.cols, m.rows);
  for (let i = 0; i < m.rows; i++) {
    for (let j = 0; j < m.cols; j++) {
      result.data[j][i] = m.data[i][j];
    }
  }
  return result;
}

export function relu(m: Matrix): Matrix {
  return {
    rows: m.rows,
    cols: m.cols,
    data: m.data.map((row) => row.map((v) => Math.max(0, v))),
  };
}

export function reluBackward(preActivation: Matrix, gradOutput: Matrix): Matrix {
  return {
    rows: preActivation.rows,
    cols: preActivation.cols,
    data: preActivation.data.map((row, i) =>
      row.map((v, j) => (v > 0 ? gradOutput.data[i][j] : 0)),
    ),
  };
}

function softmax(row: number[]): number[] {
  const max = Math.max(...row);
  const exps = row.map((v) => Math.exp(v - max));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => v / sum);
}

// Softmax cross-entropy of raw outputs against one-hot targets, averaged over rows.
export function crossEntropyLoss(logits: Matrix, target: Matrix): number {
  let sum = 0;
  for (let i = 0; i < logits.rows; i++) {
    const probs = softmax(logits.data[i]);
    for (let j = 0; j < logits.cols; j++) {
      if (target.data[i][j] > 0) sum -= target.data[i][j] * Math.log(probs[j] + 1e-12);
    }
  }
  return sum / logits.rows;
}

export function crossEntropyGrad(logits: Matrix, target: Matrix): Matrix {
  return {
    rows: logits.rows,
    cols: logits.cols,
    data: logits.data.map((row, i) =>
      softmax(row).map((p, j) => (p - target.data[i][j]) / logits.rows),
    ),
  };
}

export function clampMin(m: Matrix, min: number): Matrix {
  return {
    rows: m.rows,
    cols: m.cols,
    data: m.data.map((row) => row.map((v) => Math.max(min, v))),
  };
}

export interface AdamState {
  m: Matrix;
  v: Matrix;
}

export function adamInit(rows: number, cols: number): AdamState {
  return { m: zeros(rows, cols), v: zeros(rows, cols) };
}

export function adamUpdate(
  param: Matrix,
  grad: Matrix,
  state: AdamState,
  lr: number,
  t: number,
  beta1 = 0.9,
  beta2 = 0.999,
  eps = 1e-8,
): Matrix {
  const result = zeros(param.rows, param.cols);
  const bc1 = 1 - Math.pow(beta1, t);
  const bc2 = 1 - Math.pow(beta2, t);

  for (let i = 0; i < param.rows; i++) {
    for (let j = 0; j < param.cols; j++) {
      const g = grad.data[i][j];
      state.m.data[i][j] = beta1 * state.m.data[i][j] + (1 - beta1) * g;
      state.v.data[i][j] = beta2 * state.v.data[i][j] + (1 - beta2) * g * g;
      const mHat = state.m.data[i][j] / bc1;
      const vHat = state.v.data[i][j] / bc2;
      result.data[i][j] = param.data[i][j] - (lr * mHat) / (Math.sqrt(vHat) + eps);
    }
  }
  return result;
}

// A random factor for every entry, log-normally distributed around 1.
export function noiseFactors(rows: number, cols: number, logStd: number): Matrix {
  const gaussian = () =>
    Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const data = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.exp(logStd * gaussian())),
  );
  return { data, rows, cols };
}

export function multiply(a: Matrix, b: Matrix): Matrix {
  return {
    rows: a.rows,
    cols: a.cols,
    data: a.data.map((row, i) => row.map((v, j) => v * b.data[i][j])),
  };
}

export function randomMatrix(rows: number, cols: number, scale: number): Matrix {
  const data = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale),
  );
  return { data, rows, cols };
}
