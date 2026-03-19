import { newRule } from "./utils.js";
import { logRule, buildRuleRing, type LogRuleTick } from "./rule-ring.js";
import { buildAzimuthalRing } from "./azimuthal-ring.js";
import { buildRadialRing } from "./radial-ring.js";
import { el, textEl, render, type VNode } from "./vnode.js";
import type { RuleTick } from "./utils.js";

export interface BoardConfig {
  size?: number;
  nInput: number;
  nHidden: number;
  nOutput: number;
}

interface RingDef {
  type: "rule" | "azimuthal" | "radial";
  fixedWidth: number;
  rule: LogRuleTick[] | RuleTick[];
  sliders?: number;
  groups?: number;
  slidersPerGroup?: number;
}

function createRingSequence(
  nInput: number,
  nHidden: number,
  nOutput: number,
): RingDef[] {
  return [
    { type: "rule", fixedWidth: 30, rule: logRule() },
    {
      type: "azimuthal",
      fixedWidth: 10,
      sliders: nInput,
      rule: newRule(0, 1, 0.1, 0.5),
    },
    {
      type: "radial",
      fixedWidth: 25,
      groups: nHidden,
      slidersPerGroup: nInput,
      rule: newRule(-5, 5, 1, 5),
    },
    {
      type: "azimuthal",
      fixedWidth: 10,
      sliders: nHidden,
      rule: newRule(-5, 5, 1, 5),
    },
    {
      type: "radial",
      fixedWidth: 25,
      groups: nOutput,
      slidersPerGroup: nHidden,
      rule: newRule(-5, 5, 1, 5),
    },
    {
      type: "azimuthal",
      fixedWidth: 10,
      sliders: nOutput,
      rule: newRule(0, 5, 1, 5),
    },
  ];
}

function calculateRingWidths(
  rings: RingDef[],
  radius: number,
  radialPadding: number,
  centerSpace: number,
): number[] {
  const radialRings = rings.filter((r) => r.type === "radial");
  const fixedRings = rings.filter((r) => r.type !== "radial");
  const fixedWidthsTotal = fixedRings.reduce((s, r) => s + r.fixedWidth, 0);
  const paddingTotal = radialPadding * (rings.length - 1);
  const availableForRadial = Math.max(
    radius - centerSpace - fixedWidthsTotal - paddingTotal,
    0,
  );
  const radialWidth =
    radialRings.length > 0 ? availableForRadial / radialRings.length : 0;

  return rings.map((ring) =>
    ring.type === "radial" ? radialWidth : ring.fixedWidth,
  );
}

export function buildBoard(config: BoardConfig): VNode {
  const size = config.size ?? 1200;
  const radius = size / 2;
  const radialPadding = 30;
  const centerSpace = 150;
  const svgPadding = 10;

  const viewBox = `${-(size / 2 + svgPadding)} ${-(size / 2 + svgPadding)} ${size + 2 * svgPadding} ${size + 2 * svgPadding}`;

  const children: VNode[] = [
    textEl("style", buildStyles()),
    el("circle", {
      class: "full",
      cx: "0",
      cy: "0",
      r: String(radius),
      "stroke-width": "2",
    }),
  ];

  const rings = createRingSequence(config.nInput, config.nHidden, config.nOutput);
  const widths = calculateRingWidths(rings, radius, radialPadding, centerSpace);

  let currentRadius = radius - radialPadding;
  let layerIndex = 1;

  rings.forEach((ring, ringIndex) => {
    const ringWidth = widths[ringIndex];

    if (ring.type === "rule") {
      children.push(
        el("g", {
          "data-ring": "log",
          style: "transform: rotate(4.2deg)",
        }, [
          buildRuleRing(ring.rule as LogRuleTick[], {
            radius: currentRadius,
            ringWidth,
          }),
        ]),
      );
    } else if (ring.type === "azimuthal") {
      children.push(
        buildAzimuthalRing(ring.sliders!, ring.rule as RuleTick[], {
          radius: currentRadius,
          layerIndex,
          ringWidth,
        }),
      );
      layerIndex++;
    } else if (ring.type === "radial") {
      children.push(
        buildRadialRing(ring.groups!, ring.slidersPerGroup!, ring.rule as RuleTick[], {
          radius: currentRadius,
          layerIndex,
          ringWidth,
        }),
      );
      layerIndex++;
    }

    currentRadius -= ringWidth + radialPadding;
  });

  children.push(...buildCenterLogo(centerSpace));

  return el("svg", {
    viewBox,
    stroke: "currentColor",
    fill: "transparent",
    "stroke-width": "1",
    xmlns: "http://www.w3.org/2000/svg",
  }, children);
}

export function renderBoard(
  config: BoardConfig,
  parent: SVGElement | Element,
): SVGSVGElement {
  const tree = buildBoard(config);
  return render(tree, parent) as SVGSVGElement;
}

function buildCenterLogo(centerSpace: number): VNode[] {
  const padding = centerSpace * 0.05;
  const boxSize = centerSpace * 0.4 + padding * 2;
  const boxOffset = -boxSize / 2;
  const r = boxSize * 0.1;

  const x1 = boxOffset;
  const y1 = boxOffset;
  const x2 = boxOffset + boxSize;
  const y2 = boxOffset + boxSize;

  const pathData = [
    `M ${x1 + r},${y1}`,
    `L ${x2 - r},${y1}`,
    `Q ${x2},${y1} ${x2},${y1 + r}`,
    `L ${x2},${y2}`,
    `L ${x1 + r},${y2}`,
    `Q ${x1},${y2} ${x1},${y2 - r}`,
    `L ${x1},${y1 + r}`,
    `Q ${x1},${y1} ${x1 + r},${y1}`,
    "Z",
  ].join(" ");

  const textSize = boxSize * 0.13;
  const lineHeight = textSize * 1.2;
  const textXCenter = boxOffset + boxSize * 0.5;
  const cyberneticHalfWidth = 10 * textSize * 0.3;
  const textXRight = textXCenter + cyberneticHalfWidth;
  const textYFirst = boxOffset + boxSize * 0.5 - lineHeight / 2;
  const textYSecond = textYFirst + lineHeight;

  return [
    el("path", {
      class: "full",
      d: pathData,
      fill: "transparent",
      "stroke-width": "2",
    }),
    textEl("text", "Cybernetic", {
      class: "logo",
      x: String(textXCenter),
      y: String(textYFirst),
      style: `font-family: sans-serif; font-size: ${textSize}px; fill: currentColor; stroke: none;`,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
    }),
    textEl("text", "Studio", {
      class: "logo",
      x: String(textXRight),
      y: String(textYSecond),
      style: `font-family: sans-serif; font-size: ${textSize}px; fill: currentColor; stroke: none;`,
      "text-anchor": "end",
      "dominant-baseline": "middle",
    }),
  ];
}

function buildStyles(): string {
  return `
text {
  font-family: sans-serif;
  font-size: 12px;
}
.full {
  stroke-width: 1;
  stroke: currentColor;
  opacity: 0.3;
}
.slider {
  stroke: currentColor;
  fill: currentColor;
  scale: 1;
  transform-box: fill-box;
  transform-origin: center;
  transition: scale 150ms ease-out, fill 150ms ease-out, stroke 150ms ease-out;
}
.top.slider {
  stroke-width: 1;
}
.animating .slider {
  scale: 2.5;
  fill: var(--pa-highlight, currentColor);
  stroke: var(--pa-highlight, currentColor);
}
.etch {
  stroke-width: 0.5;
  stroke: currentColor;
  opacity: 0.4;
}
.etch.heavy {
  stroke-width: 1.5;
  opacity: 0.6;
}
text {
  fill: currentColor;
  stroke: none;
  font-weight: 500;
  opacity: 0.5;
}
text.indices {
  font-size: 12px;
  font-weight: 300;
}
text.indices.small {
  font-size: 8px;
}
text.logo {
  fill: currentColor;
  stroke: none;
}
`;
}
