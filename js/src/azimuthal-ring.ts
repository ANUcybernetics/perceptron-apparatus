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

  const trackG = svgElement(
    "g",
    { transform: `rotate(${-thetaOffset})` },
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
  }, trackG);

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
      trackG,
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
  }, trackG);

  svgText(`${layerLetter(layerIndex)}${sliderNumber}`, {
    transform: `rotate(${-0.5 * thetaSweep})`,
    class: "top etch indices",
    x: "0",
    y: String(radius - tickLength),
    "text-anchor": "middle",
    "dominant-baseline": "middle",
  }, trackG);

  const midTheta = 0.5 * thetaSweep;
  const cx = radius * Math.sin(deg2rad(midTheta));
  const cy = radius * Math.cos(deg2rad(midTheta));

  const sliderG = svgElement(
    "g",
    {
      transform: `rotate(${-thetaOffset})`,
      "data-slider": `${layerLetter(layerIndex)}${sliderNumber}`,
      "data-slider-type": "azimuthal",
    },
    parent,
  );

  svgElement(
    "circle",
    {
      class: "top slider",
      cx: String(cx),
      cy: String(cy),
      r: "5",
    },
    sliderG,
  );

  return sliderG;
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
