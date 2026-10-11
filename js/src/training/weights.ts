import type { MLPWeights } from "./model.js";
import { WEIGHT_MAX, WEIGHT_MIN } from "../utils.js";

export interface ExportedWeights {
  B: number[][];
  D: number[][];
}

const HIDDEN_MAX = 5;
const OUTPUT_MAX = 5;
const FIT_SAMPLE = 10_000;

export function extractWeights(weights: MLPWeights): ExportedWeights {
  return {
    B: weights.B.data.map((row) => [...row]),
    D: weights.D.data.map((row) => [...row]),
  };
}

// The largest magnitude each accumulator reaches while its products are added
// one at a time, in slider order, over all the example rows.
function accumulationPeaks(values: number[][], weights: number[][]): number[] {
  const peaks = Array.from({ length: weights[0].length }, () => 0);
  for (const row of values) {
    for (let j = 0; j < peaks.length; j++) {
      let acc = 0;
      for (let i = 0; i < weights.length; i++) {
        acc += row[i] * weights[i][j];
        if (Math.abs(acc) > peaks[j]) peaks[j] = Math.abs(acc);
      }
    }
  }
  return peaks;
}

function boundRatio(bound: number, peak: number): number {
  return peak > 0 ? bound / peak : Infinity;
}

function settable(matrix: number[][]): number[][] {
  return matrix.map((row) => row.map((v) => (Math.abs(v) < WEIGHT_MIN ? 0 : v)));
}

// Rescales trained weights so the network can be worked on the apparatus,
// without changing which output is largest. With no biases and ReLU hidden
// units, multiplying one hidden unit's incoming weights by k and its outgoing
// weights by 1/k leaves every output unchanged, and multiplying all outgoing
// weights by one constant scales every output alike. That freedom is used so
// that, over the example inputs, each hidden slider just reaches the end of its
// range while accumulating, the largest output just reaches the end of its
// range, and no weight exceeds the weight scale. Weights too small to set on a
// slider are then zeroed.
export function fitWeightsToApparatus(
  weights: ExportedWeights,
  inputs: number[][],
): ExportedWeights {
  const x = inputs.slice(0, FIT_SAMPLE);
  const nHidden = weights.B[0].length;

  const hiddenPeaks = accumulationPeaks(x, weights.B);
  const hiddenScale = hiddenPeaks.map((peak, j) => {
    const columnMax = Math.max(...weights.B.map((row) => Math.abs(row[j])));
    const scale = Math.min(boundRatio(HIDDEN_MAX, peak), boundRatio(WEIGHT_MAX, columnMax));
    return Number.isFinite(scale) ? scale : 1;
  });

  const b = weights.B.map((row) => row.map((v, j) => v * hiddenScale[j]));
  const dBalanced = weights.D.map((row, j) => row.map((v) => v / hiddenScale[j]));

  const hidden = x.map((row) =>
    Array.from({ length: nHidden }, (_, j) =>
      Math.max(
        0,
        row.reduce((acc, v, i) => acc + v * b[i][j], 0),
      ),
    ),
  );
  const outputPeak = Math.max(...accumulationPeaks(hidden, dBalanced));
  const dMax = Math.max(...dBalanced.flat().map(Math.abs));
  const outputScale = Math.min(boundRatio(OUTPUT_MAX, outputPeak), boundRatio(WEIGHT_MAX, dMax));
  const d = dBalanced.map((row) =>
    row.map((v) => v * (Number.isFinite(outputScale) ? outputScale : 1)),
  );

  return { B: settable(b), D: settable(d) };
}
