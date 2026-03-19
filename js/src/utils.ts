const RAD_IN_DEG = 180 / Math.PI;

export function deg2rad(degrees: number): number {
  return degrees / RAD_IN_DEG;
}

export interface RuleTick {
  label: string | null;
  value: number;
}

export function newRule(
  start: number,
  stop: number,
  step: number,
  majorStep: number,
): RuleTick[] {
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

export function formatNumber(n: number): string {
  const s = Number(n.toPrecision(10)).toString();
  if (s === "-0") return "0";
  return s;
}
