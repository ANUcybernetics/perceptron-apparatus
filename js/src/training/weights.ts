import type { MLPWeights } from "./model.js";

export interface ExportedWeights {
  B: number[][];
  D: number[][];
}

export function extractWeights(weights: MLPWeights): ExportedWeights {
  return {
    B: weights.B.data.map((row) => [...row]),
    D: weights.D.data.map((row) => [...row]),
  };
}

function maxAbs(matrix: number[][]): number {
  let max = 0;
  for (const row of matrix) {
    for (const v of row) {
      const a = Math.abs(v);
      if (a > max) max = a;
    }
  }
  return max;
}

function scaleMatrix(m: number[][], factor: number): number[][] {
  return m.map((row) => row.map((v) => v * factor));
}

export function scaleWeights(
  weights: ExportedWeights,
  targetMax = 5.0,
): ExportedWeights {
  const bMax = maxAbs(weights.B);
  const dMax = maxAbs(weights.D);

  if (bMax === 0 || dMax === 0) return weights;

  const bScaleNeeded = targetMax / bMax;
  const dScaleNeeded = targetMax / dMax;

  const beta = Math.sqrt(bScaleNeeded / dScaleNeeded);

  const bScaled = scaleMatrix(weights.B, beta);
  const dScaled = scaleMatrix(weights.D, 1 / beta);

  const bMaxAfter = maxAbs(bScaled);
  const dMaxAfter = maxAbs(dScaled);
  const finalScale = targetMax / Math.max(bMaxAfter, dMaxAfter);

  return {
    B: scaleMatrix(bScaled, finalScale),
    D: scaleMatrix(dScaled, finalScale),
  };
}
