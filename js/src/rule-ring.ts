import { svgElement, svgText, formatNumber } from "./utils.js";

export interface LogRuleTick {
  outerLabel: string | null;
  theta: number;
  innerLabel: string | null;
}

export function logRule(): LogRuleTick[] {
  const ticks: LogRuleTick[] = [];
  for (let i = 10; i <= 99; i++) {
    const val = i / 10;
    const theta =
      ((Math.log(val) - Math.log(1.0)) / (Math.log(10.0) - Math.log(1.0))) *
      360.0;
    const label = formatNumber(val);

    if (val < 2) {
      ticks.push({ outerLabel: label, theta, innerLabel: label });
    } else if (val <= 5 && i % 2 === 0) {
      ticks.push({ outerLabel: label, theta, innerLabel: label });
    } else if (val > 5 && i % 5 === 0) {
      ticks.push({ outerLabel: label, theta, innerLabel: label });
    } else {
      ticks.push({ outerLabel: null, theta, innerLabel: null });
    }
  }
  return ticks;
}

export function reluRule(maxValue: number, deltaValue: number): LogRuleTick[] {
  const outerPositive: Array<{ val: number; theta: number }> = [];
  for (let val = 0; val <= maxValue + deltaValue / 1000; val += deltaValue) {
    const rounded = Math.round(val * 1000) / 1000;
    outerPositive.push({ val: rounded, theta: rounded * (180 / maxValue) });
  }

  const outerNegative = outerPositive
    .slice(1, -1)
    .map(({ val, theta }) => ({ val: -val, theta: -theta }))
    .reverse();

  const allValues = [...outerNegative, ...outerPositive];

  return allValues.map(({ val, theta }) => {
    if (Number.isInteger(val)) {
      const outerLabel = formatNumber(val);
      const innerLabel = formatNumber(Math.max(val, 0));
      return { outerLabel, theta, innerLabel };
    }
    return { outerLabel: null, theta, innerLabel: null };
  });
}

export interface RuleRingContext {
  radius: number;
  ringWidth: number;
}

export function renderRuleRing(
  rule: LogRuleTick[],
  ctx: RuleRingContext,
  parent: SVGElement | Element,
): SVGElement {
  const radius = ctx.radius - ctx.ringWidth / 2;
  const tickLength = 10;
  const g = svgElement("g", {}, parent);

  for (const { outerLabel, theta, innerLabel } of rule) {
    const hasLabel = outerLabel != null || innerLabel != null;
    const lineClass = hasLabel ? "top etch heavy" : "top etch";

    const tickG = svgElement("g", { transform: `rotate(${-theta})` }, g);
    svgElement(
      "line",
      {
        class: lineClass,
        x1: "0",
        y1: String(radius - tickLength),
        x2: "0",
        y2: String(radius + tickLength),
      },
      tickG,
    );
    svgText(outerLabel ?? "", {
      class: "top etch",
      x: "0",
      y: String(radius + 2.0 * tickLength),
      "text-anchor": "middle",
      "dominant-baseline": "auto",
    }, tickG);
    svgText(innerLabel ?? "", {
      class: "top etch",
      x: "0",
      y: String(radius - 1.3 * tickLength),
      "text-anchor": "middle",
      "dominant-baseline": "auto",
    }, tickG);
  }

  svgElement(
    "circle",
    {
      class: "top full",
      cx: "0",
      cy: "0",
      r: String(radius),
    },
    g,
  );

  return g;
}
