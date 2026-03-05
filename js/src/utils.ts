const SVG_NS = "http://www.w3.org/2000/svg";
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

export function svgElement(
  tag: string,
  attributes: Record<string, string> = {},
  parent?: SVGElement | Element,
): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    el.setAttribute(key, value);
  }
  if (parent) parent.appendChild(el);
  return el;
}

export function svgText(
  content: string,
  attributes: Record<string, string> = {},
  parent?: SVGElement | Element,
): SVGElement {
  const el = svgElement("text", attributes, parent);
  el.textContent = content;
  return el;
}
