import { deg2rad, type RuleTick } from "./utils.js";
import { el, textEl, type VNode } from "./vnode.js";

export interface AzimuthalRingContext {
  radius: number;
  layerIndex: number;
  ringWidth: number;
}

function layerLetter(layerIndex: number): string {
  return String.fromCharCode(64 + layerIndex);
}

function buildSlider(
  radius: number,
  thetaSweep: number,
  rule: RuleTick[],
  layerIndex: number,
  sliderNumber: number,
): VNode[] {
  const tickLength = 14;
  const rangeMin = rule[0].value;
  const rangeMax = rule[rule.length - 1].value;
  const dynamicRange = rangeMax - rangeMin;
  const thetaOffset = thetaSweep * sliderNumber;
  const azPadding = 700 / radius + thetaSweep / 36;

  const trackChildren: VNode[] = [];

  trackChildren.push(
    textEl("text", rule[0].label ?? "", {
      transform: `rotate(${-(0.7 * azPadding)})`,
      class: "top etch",
      x: "0",
      y: String(radius),
      "text-anchor": "end",
      "dominant-baseline": "middle",
    }),
  );

  for (const { label, value } of rule) {
    const theta =
      azPadding +
      ((thetaSweep - 2 * azPadding) * (value - rangeMin)) / dynamicRange;
    const lineClass = label ? "top etch heavy" : "top etch";
    trackChildren.push(
      el("line", {
        transform: `rotate(${-theta})`,
        class: lineClass,
        x1: "0",
        x2: "0",
        y1: String(radius - tickLength / 2),
        y2: String(radius + tickLength / 2),
      }),
    );
  }

  trackChildren.push(
    textEl("text", rule[rule.length - 1].label ?? "", {
      transform: `rotate(${-(thetaSweep - 0.7 * azPadding)})`,
      class: "top etch",
      x: "0",
      y: String(radius),
      "text-anchor": "start",
      "dominant-baseline": "middle",
    }),
  );

  trackChildren.push(
    textEl("text", `${layerLetter(layerIndex)}${sliderNumber}`, {
      transform: `rotate(${-0.5 * thetaSweep})`,
      class: "top etch indices",
      x: "0",
      y: String(radius - tickLength),
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    }),
  );

  const trackG = el(
    "g",
    { transform: `rotate(${-thetaOffset})` },
    trackChildren,
  );

  const midTheta = 0.5 * thetaSweep;
  const cx = radius * Math.sin(deg2rad(midTheta));
  const cy = radius * Math.cos(deg2rad(midTheta));

  const sliderG = el("g", {
    "data-slider": `${layerLetter(layerIndex)}${sliderNumber}`,
    "data-slider-type": "azimuthal",
    style: `transform: rotate(${-thetaOffset}deg)`,
  }, [
    el("circle", {
      class: "top slider",
      cx: String(cx),
      cy: String(cy),
      r: "5",
    }),
  ]);

  return [trackG, sliderG];
}

export function buildAzimuthalRing(
  sliderCount: number,
  rule: RuleTick[],
  ctx: AzimuthalRingContext,
): VNode {
  const thetaSweep = 360 / sliderCount;
  const children: VNode[] = [];

  for (let i = 0; i < sliderCount; i++) {
    children.push(
      ...buildSlider(ctx.radius, thetaSweep, rule, ctx.layerIndex, i),
    );
  }

  return el("g", { "data-ring-type": "azimuthal" }, children);
}
