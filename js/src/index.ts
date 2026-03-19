import { renderBoard, type BoardConfig } from "./board.js";
import { deg2rad } from "./utils.js";
import type { MultiplyAccumulateStep } from "./widgets/trace.js";

export type { BoardConfig } from "./board.js";
export type { VNode } from "./vnode.js";
export { el, textEl, findAll, find, render } from "./vnode.js";

export interface AnimationOptions {
  duration?: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export class PerceptronApparatus {
  readonly svg: SVGSVGElement;
  private readonly config: Required<BoardConfig>;

  constructor(container: Element, config: BoardConfig) {
    this.config = { size: 1200, ...config };
    this.svg = renderBoard(this.config, container);
  }

  setLogRingRotation(
    degrees: number,
    opts: AnimationOptions = {},
  ): Promise<void> {
    const el = this.svg.querySelector("[data-ring='log']");
    if (!el) return Promise.resolve();
    return applyTransform(el as SVGElement, `rotate(${degrees}deg)`, opts);
  }

  setSlider(
    id: string,
    value: number,
    opts: AnimationOptions = {},
  ): Promise<void> {
    const el = this.svg.querySelector(`[data-slider='${id}']`);
    if (!el) return Promise.resolve();

    const sliderType = el.getAttribute("data-slider-type");

    if (sliderType === "azimuthal") {
      return this.setAzimuthalSlider(el as SVGElement, id, value, opts);
    } else if (sliderType === "radial") {
      return this.setRadialSlider(el as SVGElement, id, value, opts);
    }

    return Promise.resolve();
  }

  setSliders(
    values: Record<string, number>,
    opts: AnimationOptions = {},
  ): Promise<void> {
    const promises = Object.entries(values).map(([id, value]) =>
      this.setSlider(id, value, opts),
    );
    return Promise.all(promises).then(() => {});
  }

  private setAzimuthalSlider(
    el: SVGElement,
    id: string,
    value: number,
    opts: AnimationOptions,
  ): Promise<void> {
    const { layerIndex, sliderNumber } = parseAzimuthalId(id);
    const ringDef = this.findAzimuthalRing(layerIndex);
    if (!ringDef) return Promise.resolve();

    const { sliderCount, rangeMin, rangeMax } = ringDef;
    const thetaSweep = 360 / sliderCount;
    const azPadding = 700 / this.getRadiusForLayer(layerIndex) + thetaSweep / 36;
    const dynamicRange = rangeMax - rangeMin;
    const clampedValue = Math.max(rangeMin, Math.min(rangeMax, value));

    const baseOffset = thetaSweep * sliderNumber;
    const valueTheta =
      azPadding +
      ((thetaSweep - 2 * azPadding) * (clampedValue - rangeMin)) / dynamicRange;
    const midpoint =
      azPadding + (thetaSweep - 2 * azPadding) * 0.5;
    const deltaTheta = valueTheta - midpoint;

    return applyTransform(
      el,
      `rotate(${-(baseOffset + deltaTheta)}deg)`,
      opts,
    );
  }

  private setRadialSlider(
    el: SVGElement,
    id: string,
    value: number,
    opts: AnimationOptions,
  ): Promise<void> {
    const { layerIndex, groupIndex, sliderIndex } = parseRadialId(id);
    const ringDef = this.findRadialRing(layerIndex);
    if (!ringDef) return Promise.resolve();

    const { rangeMin, rangeMax, ringWidth } = ringDef;
    const radius = this.getRadiusForLayer(layerIndex) - 5;
    const width = ringWidth - 10;
    const dynamicRange = rangeMax - rangeMin;
    const clampedValue = Math.max(rangeMin, Math.min(rangeMax, value));

    const groups = ringDef.groups;
    const thetaSweep = 360 / groups;
    const thetaOffset = thetaSweep * groupIndex;
    const theta =
      thetaOffset +
      (sliderIndex + 1) * (thetaSweep / (ringDef.slidersPerGroup + 1));

    const midRadius = radius - width / 2;
    const valueRadius =
      radius - (width * (clampedValue - rangeMin)) / dynamicRange;
    const radialOffset = valueRadius - midRadius;

    const offsetX = radialOffset * Math.sin(deg2rad(theta));
    const offsetY = radialOffset * Math.cos(deg2rad(theta));

    return applyTransform(
      el,
      `translate(${-offsetX}px, ${-offsetY}px)`,
      opts,
    );
  }

  private findAzimuthalRing(
    layerIndex: number,
  ): {
    sliderCount: number;
    rangeMin: number;
    rangeMax: number;
  } | null {
    const layerMap: Record<
      number,
      { sliderCount: number; rangeMin: number; rangeMax: number }
    > = {
      1: { sliderCount: this.config.nInput, rangeMin: 0, rangeMax: 1 },
      3: { sliderCount: this.config.nHidden, rangeMin: -5, rangeMax: 5 },
      5: { sliderCount: this.config.nOutput, rangeMin: 0, rangeMax: 5 },
    };
    return layerMap[layerIndex] ?? null;
  }

  private findRadialRing(
    layerIndex: number,
  ): {
    groups: number;
    slidersPerGroup: number;
    rangeMin: number;
    rangeMax: number;
    ringWidth: number;
  } | null {
    const size = this.config.size;
    const radius = size / 2;
    const radialPadding = 30;
    const centerSpace = 150;
    const ringCount = 6;
    const fixedWidths = 30 + 10 + 10 + 10;
    const paddingTotal = radialPadding * (ringCount - 1);
    const radialWidth = Math.max(
      (radius - centerSpace - fixedWidths - paddingTotal) / 2,
      0,
    );

    const layerMap: Record<
      number,
      {
        groups: number;
        slidersPerGroup: number;
        rangeMin: number;
        rangeMax: number;
        ringWidth: number;
      }
    > = {
      2: {
        groups: this.config.nHidden,
        slidersPerGroup: this.config.nInput,
        rangeMin: -5,
        rangeMax: 5,
        ringWidth: radialWidth,
      },
      4: {
        groups: this.config.nOutput,
        slidersPerGroup: this.config.nHidden,
        rangeMin: -5,
        rangeMax: 5,
        ringWidth: radialWidth,
      },
    };
    return layerMap[layerIndex] ?? null;
  }

  private getRadiusForLayer(layerIndex: number): number {
    const size = this.config.size;
    const radius = size / 2;
    const radialPadding = 30;
    const centerSpace = 150;
    const ringCount = 6;
    const fixedWidths = 30 + 10 + 10 + 10;
    const paddingTotal = radialPadding * (ringCount - 1);
    const radialWidth = Math.max(
      (radius - centerSpace - fixedWidths - paddingTotal) / 2,
      0,
    );

    const widths = [30, 10, radialWidth, 10, radialWidth, 10];
    let r = radius - radialPadding;
    let idx = 1;

    for (const w of widths) {
      if (idx === layerIndex) return r;
      if (w !== 30) idx++;
      r -= w + radialPadding;
    }

    return r;
  }

  private getRuleRingRadius(): number {
    const radius = this.config.size / 2;
    const radialPadding = 30;
    return radius - radialPadding - 15;
  }

  private valueToRuleAngle(absValue: number): number {
    if (absValue <= 0) return 0;
    const mantissa = absValue / 10 ** Math.floor(Math.log10(absValue));
    return (Math.log10(mantissa) / Math.log10(10)) * 360;
  }

  setSlideRuleMarkers(
    mac: MultiplyAccumulateStep,
    opts: AnimationOptions = {},
  ): Promise<void> {
    this.clearSlideRuleMarkers();

    const ruleRing = this.svg.querySelector("[data-ring='log']");
    if (!ruleRing) return Promise.resolve();

    const r = this.getRuleRingRadius();
    const tickLen = 18;

    const absInput = Math.abs(mac.inputValue);
    const absWeight = Math.abs(mac.weightValue);
    const absProduct = Math.abs(mac.product);

    const g = document.createElementNS(SVG_NS, "g");
    g.setAttribute("data-markers", "slide-rule");

    const currentRotation = ruleRing.getAttribute("style") ?? "";
    const rotMatch = currentRotation.match(/rotate\(([-\d.]+)deg\)/);
    const ringRotation = rotMatch ? parseFloat(rotMatch[1]) : 0;

    const markers: Array<{
      value: number;
      color: string;
      label: string;
      inner: boolean;
    }> = [];

    if (absInput > 0) {
      markers.push({
        value: absInput,
        color: "var(--pa-marker-input, #4a9eff)",
        label: `|${mac.inputValue.toFixed(2)}|`,
        inner: false,
      });
    }
    if (absWeight > 0) {
      markers.push({
        value: absWeight,
        color: "var(--pa-marker-weight, #ff6b4a)",
        label: `|${mac.weightValue.toFixed(2)}|`,
        inner: true,
      });
    }
    if (absProduct > 0) {
      markers.push({
        value: absProduct,
        color: "var(--pa-marker-product, #4aff6b)",
        label: `=${mac.product.toFixed(2)}`,
        inner: false,
      });
    }

    for (const m of markers) {
      const theta = this.valueToRuleAngle(m.value);
      const adjustedTheta = m.inner ? theta : theta + ringRotation;

      const markerG = document.createElementNS(SVG_NS, "g");
      markerG.setAttribute("transform", `rotate(${-adjustedTheta})`);

      const y1 = m.inner ? r - tickLen : r + tickLen;
      const y2 = m.inner ? r - tickLen * 2.2 : r + tickLen * 2.2;

      const line = document.createElementNS(SVG_NS, "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", "0");
      line.setAttribute("y2", String(y2));
      line.setAttribute("stroke", m.color);
      line.setAttribute("stroke-width", "2.5");

      const text = document.createElementNS(SVG_NS, "text");
      const textY = m.inner ? y2 - 6 : y2 + 12;
      text.setAttribute("x", "0");
      text.setAttribute("y", String(textY));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", m.color);
      text.setAttribute("stroke", "none");
      text.setAttribute("font-size", "9px");
      text.setAttribute("font-weight", "600");
      text.textContent = m.label;

      markerG.appendChild(line);
      markerG.appendChild(text);
      g.appendChild(markerG);
    }

    const duration = opts.duration ?? 0;
    g.style.opacity = "0";
    this.svg.appendChild(g);

    if (duration > 0) {
      g.style.transition = `opacity ${Math.min(duration, 200)}ms ease-in`;
    }
    requestAnimationFrame(() => {
      g.style.opacity = "1";
    });

    return Promise.resolve();
  }

  clearSlideRuleMarkers(): void {
    const existing = this.svg.querySelectorAll("[data-markers='slide-rule']");
    for (const el of existing) {
      el.remove();
    }
  }
}

function parseAzimuthalId(id: string): {
  layerIndex: number;
  sliderNumber: number;
} {
  const letter = id.charAt(0);
  const layerIndex = letter.charCodeAt(0) - 64;
  const sliderNumber = parseInt(id.substring(1), 10);
  return { layerIndex, sliderNumber };
}

function parseRadialId(id: string): {
  layerIndex: number;
  groupIndex: number;
  sliderIndex: number;
} {
  const letter = id.charAt(0);
  const layerIndex = letter.charCodeAt(0) - 64;
  const rest = id.substring(1);
  const [groupStr, sliderStr] = rest.split("-");
  return {
    layerIndex,
    groupIndex: parseInt(groupStr, 10),
    sliderIndex: parseInt(sliderStr, 10),
  };
}

function applyTransform(
  el: SVGElement,
  transform: string,
  opts: AnimationOptions,
): Promise<void> {
  const duration = opts.duration ?? 0;

  if (duration <= 0) {
    el.style.transition = "none";
    el.style.transform = transform;
    el.classList.remove("animating");
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    el.style.transition = `transform ${duration}ms ease-in-out`;
    el.classList.add("animating");

    const done = () => {
      el.removeEventListener("transitionend", done);
      el.classList.remove("animating");
      resolve();
    };
    el.addEventListener("transitionend", done);

    requestAnimationFrame(() => {
      el.style.transform = transform;
    });

    setTimeout(done, duration + 50);
  });
}

export { buildBoard, renderBoard } from "./board.js";
export { logRule, reluRule } from "./rule-ring.js";
