import { renderBoard, type BoardConfig } from "./board.js";
import { deg2rad } from "./utils.js";

export type { BoardConfig } from "./board.js";

export interface AnimationOptions {
  duration?: number;
}

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
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    el.style.transition = `transform ${duration}ms ease-in-out`;

    const onEnd = () => {
      el.removeEventListener("transitionend", onEnd);
      resolve();
    };
    el.addEventListener("transitionend", onEnd);

    requestAnimationFrame(() => {
      el.style.transform = transform;
    });

    setTimeout(resolve, duration + 50);
  });
}

export { renderBoard } from "./board.js";
export { logRule, reluRule } from "./rule-ring.js";
