import { deg2rad, type RuleTick } from "./utils.js";
import { el, textEl, type VNode } from "./vnode.js";

export interface RadialRingContext {
  radius: number;
  layerIndex: number;
  ringWidth: number;
}

function layerLetter(layerIndex: number): string {
  return String.fromCharCode(64 + layerIndex);
}

function buildSlider(
  radius: number,
  width: number,
  theta: number,
  layerIndex: number,
  groupIndex: number,
  sliderIndex: number,
): VNode {
  const midRadius = radius - width / 2;
  const cx = midRadius * Math.sin(deg2rad(theta));
  const cy = midRadius * Math.cos(deg2rad(theta));

  return el("g", {
    "data-slider": `${layerLetter(layerIndex)}${groupIndex}-${sliderIndex}`,
    "data-slider-type": "radial",
  }, [
    el("circle", {
      class: "top slider",
      cx: String(cx),
      cy: String(cy),
      r: "5",
    }),
  ]);
}

function buildGroup(
  radius: number,
  width: number,
  slidersPerGroup: number,
  thetaSweep: number,
  groupIndex: number,
  layerIndex: number,
): VNode[] {
  const thetaOffset = thetaSweep * groupIndex;
  const nodes: VNode[] = [];

  for (let i = 1; i <= slidersPerGroup; i++) {
    const theta = thetaOffset + i * (thetaSweep / (slidersPerGroup + 1));
    nodes.push(
      buildSlider(radius, width, theta, layerIndex, groupIndex, i - 1),
    );
  }

  nodes.push(
    textEl("text", `${layerLetter(layerIndex)}${groupIndex}`, {
      transform: `rotate(${-(thetaOffset + 0.5 * thetaSweep)})`,
      class: "top etch indices",
      x: "0",
      y: String(radius - width - 10),
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    }),
  );

  return nodes;
}

function buildGuides(
  radius: number,
  width: number,
  groups: number,
  rule: RuleTick[],
): VNode[] {
  const rangeMin = rule[0].value;
  const rangeMax = rule[rule.length - 1].value;
  const dynamicRange = rangeMax - rangeMin;
  const thetaSweep = 360 / groups;

  const radii = rule.map(({ label, value }) => ({
    label,
    r: radius - (width * (value - rangeMin)) / dynamicRange,
  }));

  const nodes: VNode[] = [];

  for (const { label, r } of radii) {
    const azPadding = r > 0.1 ? 700 / r : 0;
    const arcComponents: string[] = [];

    for (let i = 0; i < groups; i++) {
      const x1 = r * Math.sin(deg2rad(i * thetaSweep + azPadding));
      const y1 = r * Math.cos(deg2rad(i * thetaSweep + azPadding));
      const x2 = r * Math.sin(deg2rad((i + 1) * thetaSweep - azPadding));
      const y2 = r * Math.cos(deg2rad((i + 1) * thetaSweep - azPadding));
      arcComponents.push(`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`);
    }

    const pathClass = label ? "top etch heavy" : "top etch";
    nodes.push(el("path", { class: pathClass, d: arcComponents.join(" ") }));
  }

  const labelledRadii = radii.filter(({ label }) => label != null);
  for (let i = 0; i < groups; i++) {
    const theta = (360 * i) / groups;
    const labelChildren: VNode[] = labelledRadii.map(({ label, r }) =>
      textEl("text", label!, {
        class: "top etch",
        x: "0",
        y: String(r + 1),
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      }),
    );
    nodes.push(
      el("g", { class: "top etch", transform: `rotate(${-theta})` }, labelChildren),
    );
  }

  return nodes;
}

export function buildRadialRing(
  groups: number,
  slidersPerGroup: number,
  rule: RuleTick[],
  ctx: RadialRingContext,
): VNode {
  const radius = ctx.radius - 5;
  const width = ctx.ringWidth - 10;
  const thetaSweep = 360 / groups;

  const children: VNode[] = [
    ...buildGuides(radius, width, groups, rule),
  ];

  for (let i = 0; i < groups; i++) {
    children.push(
      ...buildGroup(radius, width, slidersPerGroup, thetaSweep, i, ctx.layerIndex),
    );
  }

  return el("g", { "data-ring-type": "radial" }, children);
}
