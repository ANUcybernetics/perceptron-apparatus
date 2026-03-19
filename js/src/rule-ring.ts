import { formatNumber } from "./utils.js";
import { el, textEl, type VNode } from "./vnode.js";

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

export function buildRuleRing(
  rule: LogRuleTick[],
  ctx: RuleRingContext,
): VNode {
  const radius = ctx.radius - ctx.ringWidth / 2;
  const tickLength = 10;

  const tickNodes: VNode[] = rule.map(({ outerLabel, theta, innerLabel }) => {
    const hasLabel = outerLabel != null || innerLabel != null;
    const lineClass = hasLabel ? "top etch heavy" : "top etch";

    return el("g", { transform: `rotate(${-theta})` }, [
      el("line", {
        class: lineClass,
        x1: "0",
        y1: String(radius - tickLength),
        x2: "0",
        y2: String(radius + tickLength),
      }),
      textEl("text", outerLabel ?? "", {
        class: "top etch",
        x: "0",
        y: String(radius + 2.0 * tickLength),
        "text-anchor": "middle",
        "dominant-baseline": "auto",
      }),
      textEl("text", innerLabel ?? "", {
        class: "top etch",
        x: "0",
        y: String(radius - 1.3 * tickLength),
        "text-anchor": "middle",
        "dominant-baseline": "auto",
      }),
    ]);
  });

  return el("g", {}, [
    ...tickNodes,
    el("circle", {
      class: "top full",
      cx: "0",
      cy: "0",
      r: String(radius),
    }),
  ]);
}
