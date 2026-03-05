import { deg2rad, svgElement, svgText, type RuleTick } from "./utils.js";

export interface AzimuthalRingContext {
  radius: number;
  layerIndex: number;
  ringWidth: number;
}

function layerLetter(layerIndex: number): string {
  return String.fromCharCode(64 + layerIndex);
}

function renderSlider(
  radius: number,
  thetaSweep: number,
  rule: RuleTick[],
  layerIndex: number,
  sliderNumber: number,
  parent: SVGElement | Element,
): SVGElement {
  const tickLength = 14;
  const rangeMin = rule[0].value;
  const rangeMax = rule[rule.length - 1].value;
  const dynamicRange = rangeMax - rangeMin;
  const thetaOffset = thetaSweep * sliderNumber;
  const azPadding = 700 / radius + thetaSweep / 36;

  const g = svgElement(
    "g",
    {
      transform: `rotate(${-thetaOffset})`,
      "data-slider": `${layerLetter(layerIndex)}${sliderNumber}`,
      "data-slider-type": "azimuthal",
    },
    parent,
  );

  const firstLabel = rule[0].label;
  svgText(firstLabel ?? "", {
    transform: `rotate(${-(0.7 * azPadding)})`,
    class: "top etch",
    x: "0",
    y: String(radius),
    "text-anchor": "end",
    "dominant-baseline": "middle",
  }, g);

  for (const { label, value } of rule) {
    const theta =
      azPadding +
      ((thetaSweep - 2 * azPadding) * (value - rangeMin)) / dynamicRange;
    const lineClass = label ? "top etch heavy" : "top etch";
    svgElement(
      "line",
      {
        transform: `rotate(${-theta})`,
        class: lineClass,
        x1: "0",
        x2: "0",
        y1: String(radius - tickLength / 2),
        y2: String(radius + tickLength / 2),
      },
      g,
    );
  }

  const lastLabel = rule[rule.length - 1].label;
  svgText(lastLabel ?? "", {
    transform: `rotate(${-(thetaSweep - 0.7 * azPadding)})`,
    class: "top etch",
    x: "0",
    y: String(radius),
    "text-anchor": "start",
    "dominant-baseline": "middle",
  }, g);

  svgText(`${layerLetter(layerIndex)}${sliderNumber}`, {
    transform: `rotate(${-0.5 * thetaSweep})`,
    class: "top etch indices",
    x: "0",
    y: String(radius - tickLength),
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  }, g);

  const x1 = radius * Math.sin(deg2rad(azPadding));
  const y1 = radius * Math.cos(deg2rad(azPadding));
  const x2 = radius * Math.sin(deg2rad(thetaSweep - azPadding));
  const y2 = radius * Math.cos(deg2rad(thetaSweep - azPadding));

  svgElement(
    "path",
    {
      class: "top slider",
      "stroke-linecap": "round",
      d: `M ${x1} ${y1} A ${radius} ${radius} 0 0 0 ${x2} ${y2}`,
    },
    g,
  );

  return g;
}

export function renderAzimuthalRing(
  sliderCount: number,
  rule: RuleTick[],
  ctx: AzimuthalRingContext,
  parent: SVGElement | Element,
): SVGElement {
  const thetaSweep = 360 / sliderCount;
  const g = svgElement("g", { "data-ring-type": "azimuthal" }, parent);

  for (let i = 0; i < sliderCount; i++) {
    renderSlider(ctx.radius, thetaSweep, rule, ctx.layerIndex, i, g);
  }

  return g;
}
