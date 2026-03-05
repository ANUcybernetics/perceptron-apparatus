import { deg2rad, svgElement, svgText, type RuleTick } from "./utils.js";

export interface RadialRingContext {
  radius: number;
  layerIndex: number;
  ringWidth: number;
}

function layerLetter(layerIndex: number): string {
  return String.fromCharCode(64 + layerIndex);
}

function renderSlider(
  radius: number,
  width: number,
  theta: number,
  layerIndex: number,
  groupIndex: number,
  sliderIndex: number,
  parent: SVGElement | Element,
): SVGElement {
  const g = svgElement(
    "g",
    {
      "data-slider": `${layerLetter(layerIndex)}${groupIndex}-${sliderIndex}`,
      "data-slider-type": "radial",
    },
    parent,
  );

  svgElement(
    "path",
    {
      class: "top slider",
      transform: `rotate(${-theta}) translate(0 ${radius})`,
      "stroke-linecap": "round",
      d: `M 0 0 v ${-width}`,
    },
    g,
  );

  svgText(String(sliderIndex), {
    transform: `rotate(${-theta})`,
    class: "top etch indices small",
    x: "0",
    y: String(radius + 8),
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  }, g);

  return g;
}

function renderGroup(
  radius: number,
  width: number,
  slidersPerGroup: number,
  thetaSweep: number,
  groupIndex: number,
  layerIndex: number,
  parent: SVGElement | Element,
): void {
  const thetaOffset = thetaSweep * groupIndex;

  for (let i = 1; i <= slidersPerGroup; i++) {
    const theta = thetaOffset + i * (thetaSweep / (slidersPerGroup + 1));
    renderSlider(radius, width, theta, layerIndex, groupIndex, i - 1, parent);
  }

  svgText(`${layerLetter(layerIndex)}${groupIndex}`, {
    transform: `rotate(${-(thetaOffset + 0.5 * thetaSweep)})`,
    class: "top etch indices",
    x: "0",
    y: String(radius - width - 10),
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  }, parent);
}

function renderGuides(
  radius: number,
  width: number,
  groups: number,
  rule: RuleTick[],
  parent: SVGElement | Element,
): void {
  const rangeMin = rule[0].value;
  const rangeMax = rule[rule.length - 1].value;
  const dynamicRange = rangeMax - rangeMin;
  const thetaSweep = 360 / groups;

  const radii = rule.map(({ label, value }) => ({
    label,
    r: radius - (width * (value - rangeMin)) / dynamicRange,
  }));

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
    svgElement(
      "path",
      { class: pathClass, d: arcComponents.join(" ") },
      parent,
    );
  }

  const labelledRadii = radii.filter(({ label }) => label != null);
  for (let i = 0; i < groups; i++) {
    const theta = (360 * i) / groups;
    const labelG = svgElement(
      "g",
      { class: "top etch", transform: `rotate(${-theta})` },
      parent,
    );
    for (const { label, r } of labelledRadii) {
      svgText(label!, {
        class: "top etch",
        x: "0",
        y: String(r + 1),
        "text-anchor": "middle",
        "dominant-baseline": "middle",
      }, labelG);
    }
  }
}

export function renderRadialRing(
  groups: number,
  slidersPerGroup: number,
  rule: RuleTick[],
  ctx: RadialRingContext,
  parent: SVGElement | Element,
): SVGElement {
  const radius = ctx.radius - 5;
  const width = ctx.ringWidth - 10;
  const thetaSweep = 360 / groups;

  const g = svgElement("g", { "data-ring-type": "radial" }, parent);

  renderGuides(radius, width, groups, rule, g);

  for (let i = 0; i < groups; i++) {
    renderGroup(
      radius,
      width,
      slidersPerGroup,
      thetaSweep,
      i,
      ctx.layerIndex,
      g,
    );
  }

  return g;
}
