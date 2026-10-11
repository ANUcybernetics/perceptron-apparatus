const RAD_IN_DEG = 180 / Math.PI;

export function deg2rad(degrees: number): number {
  return degrees / RAD_IN_DEG;
}

export interface RuleTick {
  label: string | null;
  value: number;
}

export function newRule(start: number, stop: number, step: number, majorStep: number): RuleTick[] {
  const ticks: RuleTick[] = [];
  for (let val = start; val <= stop + step / 1000; val += step) {
    const rounded = Math.round(val * 1000) / 1000;
    const label =
      Math.abs(rounded % majorStep) < step / 2 ||
      Math.abs((rounded % majorStep) - majorStep) < step / 2
        ? formatNumber(rounded)
        : null;
    ticks.push({ label, value: rounded });
  }
  return ticks;
}

// The two scales a weight slider can carry. "linear" runs from -WEIGHT_MAX to
// WEIGHT_MAX, the scale the built apparatus has. "log" carries magnitude only,
// from WEIGHT_MIN to WEIGHT_MAX, with sign shown by the slider marker;
// magnitudes below WEIGHT_MIN park at the zero end.
export type WeightScale = "linear" | "log";
export const WEIGHT_MIN = 0.02;
export const WEIGHT_MAX = 5;
const WEIGHT_ZERO_GAP = 0.12;
const WEIGHT_LABELLED = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];

export function weightRule(scale: WeightScale = "linear"): RuleTick[] {
  if (scale === "linear") return newRule(-WEIGHT_MAX, WEIGHT_MAX, 1, WEIGHT_MAX);
  const ticks: RuleTick[] = [{ label: "0", value: 0 }];
  for (const decade of [0.01, 0.1, 1]) {
    for (let digit = 1; digit <= 9; digit++) {
      const value = Math.round(digit * decade * 100) / 100;
      if (value < WEIGHT_MIN || value > WEIGHT_MAX) continue;
      ticks.push({ label: WEIGHT_LABELLED.includes(value) ? formatNumber(value) : null, value });
    }
  }
  return ticks;
}

// How far along its slot a weight slider sits, from the outer end (0) to the
// inner end (1): -WEIGHT_MAX to WEIGHT_MAX on the linear scale, zero to
// WEIGHT_MAX whatever the sign on the log scale.
export function weightScaleFraction(value: number, scale: WeightScale = "linear"): number {
  if (scale === "linear") {
    return (Math.min(Math.max(value, -WEIGHT_MAX), WEIGHT_MAX) + WEIGHT_MAX) / (2 * WEIGHT_MAX);
  }
  const magnitude = Math.min(Math.abs(value), WEIGHT_MAX);
  if (magnitude < WEIGHT_MIN) return 0;
  const logFraction = Math.log(magnitude / WEIGHT_MIN) / Math.log(WEIGHT_MAX / WEIGHT_MIN);
  return WEIGHT_ZERO_GAP + (1 - WEIGHT_ZERO_GAP) * logFraction;
}

export function formatNumber(n: number): string {
  const s = Number(n.toPrecision(10)).toString();
  if (s === "-0") return "0";
  return s;
}
