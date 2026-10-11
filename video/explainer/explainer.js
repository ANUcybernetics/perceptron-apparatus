// The explainer: video/scripts/explainer.md. One handwritten 7, followed through
// the digital twin (js/) with the bundled MNIST weights. Every slider position
// and every number on screen comes from computeTrace; the apparatus is drawn by
// the twin itself and driven as a pure function of t (apparatusAt, below).

import * as M from "./kit/motion/motion.js";
import * as C from "./kit/motion/canvas.js";
import { PerceptronApparatus } from "./kit/apparatus/index.mjs";
import { sampleDigits, mnistWeights, computeTrace } from "./kit/apparatus/widgets/index.mjs";

const SAMPLE = await fetch("kit/mnist-digits.json").then((r) => r.json());

export const FONTS = [300, 400, 500, 600, 700].map((w) => `${w} 20px "Public Sans"`);

const GOLD = "#e5a930";
const WHITE = "#fff";
const MINUS = "−";
const num = (v, dp) => v.toFixed(dp).replace("-", MINUS);
const lerp = (a, b, p) => a + (b - a) * p;
const deg = (d) => (d * Math.PI) / 180;
const polar = (theta, r) => [r * Math.sin(deg(theta)), r * Math.cos(deg(theta))];

// ---------------------------------------------------------------- the example
const DIGIT = sampleDigits.find((d) => d.label === 7);
const PX = DIGIT.pixels;
const W = mnistWeights;
const MACS = computeTrace(PX, W).filter((s) => s.type === "multiply-accumulate");
const N_IN = 36;
const N_HID = 6;
const N_OUT = 10;
// the step shown slowly: the largest product of the pass, and a negative one,
// which is what sends a hidden slider below zero
const EX = { i: 34, j: 5 };
EX.input = PX[EX.i];
EX.weight = W.B[EX.i][EX.j];
EX.product = EX.input * EX.weight;
EX.angle = MACS.find((m) => m.target === "C5" && m.inputSlider === "A34").logRingAngle;

// the 216 hidden-layer steps, the shown one first, and the hidden values after n of them
const ORDER1 = [5, 0, 1, 2, 3, 4].flatMap((j) =>
  Array.from({ length: N_IN }, (_, n) => ({ i: j === EX.j ? (n + EX.i) % N_IN : n, j })),
);
const CUM1 = ORDER1.reduce(
  (acc, { i, j }) => {
    const c = [...acc.at(-1)];
    c[j] += PX[i] * W.B[i][j];
    return [...acc, c];
  },
  [Array(N_HID).fill(0)],
);
const PRE = CUM1.at(-1);
const HIDDEN = PRE.map((v) => Math.max(0, v));
// the 60 output-layer steps
const ORDER2 = Array.from({ length: N_OUT }, (_, k) =>
  Array.from({ length: N_HID }, (_, j) => ({ j, k })),
).flat();
const CUM2 = ORDER2.reduce(
  (acc, { j, k }) => {
    const e = [...acc.at(-1)];
    e[k] += HIDDEN[j] * W.D[j][k];
    return [...acc, e];
  },
  [Array(N_OUT).fill(0)],
);
const ANSWER = CUM2.at(-1).indexOf(Math.max(...CUM2.at(-1)));

// ------------------------------------------------------------ board geometry
// Where the twin puts a slider for a value, in board units from the centre
// (js/src/index.ts, setAzimuthalSlider and setRadialSlider). `padR` is the
// radius the twin's slider padding is worked out from, which for ring A is the
// rule ring's.
const AZ = {
  A: { R: 510, padR: 570, n: N_IN, min: 0, max: 1 },
  C: { R: 320, padR: 320, n: N_HID, min: -5, max: 5 },
  E: { R: 130, padR: 130, n: N_OUT, min: 0, max: 5 },
};
const RAD = {
  B: { R: 465, W: 110, groups: N_HID, per: N_IN },
  D: { R: 275, W: 110, groups: N_OUT, per: N_HID },
};
const azPos = (ring, n, v) => {
  const { R, padR, n: count, min, max } = AZ[ring];
  const sweep = 360 / count;
  const pad = 700 / padR + sweep / 36;
  return polar(sweep * n + pad + ((sweep - 2 * pad) * (v - min)) / (max - min), R);
};
const radPos = (ring, group, n, v) => {
  const { R, W: width, groups, per } = RAD[ring];
  const sweep = 360 / groups;
  return polar(sweep * group + (n + 1) * (sweep / (per + 1)), R - (width * (v + 5)) / 10);
};

const HOME = { cx: 1420, cy: 445, s: 850 / 1220 };
const camProps = ({ bx = 0, by = 0, s, sx, sy }) => ({
  x: sx - (bx + 610) * s,
  y: sy - (by + 610) * s,
  scale: s,
});
const HOME_CAM = { s: HOME.s, sx: HOME.cx, sy: HOME.cy };

export function build(tl, S, T) {
  const scene = S.root.querySelector(".scene");
  const seg = (i, k) => T.lines[i].segments[k];
  const END = T.duration;
  const TOTAL = Number(S.root.dataset.duration);

  // ------------------------------------------------------------------ cues
  const tGlint = [T.word(0, "brass"), T.word(9, "watch")];
  const tSpin = T.word(0, "circular");
  const tSets = T.word(2, "sets");
  const tPushA = seg(2, 3).start - 0.55;
  const CLOSE = [21, 22, 23]; // the three sliders the push-in on ring A lands on
  const rank = Array.from({ length: N_IN }, (_, i) => i).filter((i) => !CLOSE.includes(i));
  const tA = PX.map((_, i) =>
    CLOSE.includes(i) ? tPushA + 1.5 + CLOSE.indexOf(i) * 0.6 : tSets + rank.indexOf(i) * 0.075,
  );
  const tLearn = T.word(3, "learned");
  const tMul = T.word(4, "multiply") + 0.3;
  const tAdd = T.word(4, "hidden");
  const run1 = { start: T.word(5, "again") + 0.25, end: T.start(6) - 0.9 };
  const tRelu = T.word(6, "back");
  const tD = T.word(7, "more");
  const run2 = { start: T.word(7, "sixty"), end: seg(7, 1).start - 0.55 };
  const tPushE = seg(7, 1).start - 0.35;
  const tSeven = T.word(7, "seven");
  const tBack = seg(7, 3).end + 0.9;
  const zoomOut = { start: T.word(8, "chip") - 0.2, dur: 3.4 };
  const zoomIn = { start: T.word(9, "multiplying") - 0.2, dur: 3.2 };
  const tReset = TOTAL - 3.4;

  const step1 = (t) => 2 + Math.floor(214 * C.phase(t, run1.start, run1.end - run1.start) ** 2.2);
  const step2 = (t) => 1 + Math.floor(59 * C.phase(t, run2.start, run2.end - run2.start) ** 1.6);
  const live = (t) => 1 - C.phase(t, tReset, 1.6, "in-out-cubic");
  const below = PRE.map((v, j) => (v < -0.05 ? j : -1)).filter((j) => j >= 0);

  // Every slider's value and the log ring's angle at time t.
  const apparatusAt = (t) => {
    const on = live(t);
    const a = PX.map((v, i) => v * C.phase(t, tA[i], 0.55, "out-cubic") * on);
    const b = (i, j) =>
      W.B[i][j] * C.phase(t, tLearn + 0.3 + M.hash(i * 6 + j) * 2.6, 0.7, "in-out-cubic") * on;
    const d = (j, k) =>
      W.D[j][k] * C.phase(t, tD + M.hash(100 + j * 10 + k) * 0.8, 0.6, "in-out-cubic") * on;
    let c;
    if (t < run1.start) {
      c = Array(N_HID).fill(0);
      c[EX.j] = EX.product * C.phase(t, tAdd, 0.9, "in-out-cubic");
    } else if (t < run1.end) c = CUM1[step1(t)];
    else
      c = PRE.map((v, j) =>
        v < 0 ? v * (1 - C.phase(t, tRelu + below.indexOf(j) * 0.15, 0.9, "in-out-cubic")) : v,
      );
    const e = t < run2.start ? CUM2[0] : t < run2.end ? CUM2[step2(t)] : CUM2.at(-1);
    const ring =
      4.2 +
      360 * C.phase(t, tSpin, 2.4, "in-out-cubic") +
      EX.angle * C.phase(t, tMul, 1.7, "in-out-cubic") * on +
      360 * 4 * C.phase(t, run1.start, run1.end - run1.start, "in-quad") +
      360 * 2 * C.phase(t, run2.start, run2.end - run2.start, "in-out-quad");
    return { a, b, c: c.map((v) => v * on), d, e: e.map((v) => v * on), ring };
  };

  // -------------------------------------------------------------- the board
  // boardL is the camera (position and zoom); spinL turns the table under it
  const boardL = M.layer(scene, 0, 0, "board");
  const spinL = M.layer(boardL, 0, 0);
  Object.assign(spinL.style, { width: "1220px", height: "1220px" });
  M.set(spinL, { transformOrigin: "610px 610px" });
  const apparatus = new PerceptronApparatus(spinL, {
    size: 1200,
    nInput: N_IN,
    nHidden: N_HID,
    nOutput: N_OUT,
  });
  // marks that sit on the board and move with it, in board units from the centre
  const ov = M.svg("svg", { viewBox: "-610 -610 1220 1220" }, spinL);
  M.set(boardL, camProps(HOME_CAM));
  // push-ins take the board past the scene's edges on purpose
  boardL.setAttribute("data-layout-allow-overflow", "");
  // covers the left of the scene while a push-in would spill the board into it
  const shade = M.layer(scene, 0, 0);
  Object.assign(shade.style, { width: "940px", height: "890px", background: "#000" });
  M.set(shade, { opacity: 0 });
  const RIGHT = { sx: 1430, sy: 445 }; // the middle of what the shade leaves
  const cam = (target, t, dur = 0.9) =>
    tl.to(boardL, camProps(target), t, { dur, ease: "in-out-cubic" });
  const o = (tag, attrs, parent = ov) => {
    const e = M.svg(tag, attrs, parent);
    e.style.transformOrigin = "center";
    return e;
  };
  const hidden = (e) => (M.set(e, { opacity: 0 }), e);
  const fadeIn = (e, t, dur = 0.4) => tl.to(e, { opacity: 1 }, t, { dur });
  const fadeOut = (e, t, dur = 0.4) => tl.to(e, { opacity: 0 }, t, { dur, ease: "in-cubic" });

  const band = (r, w) =>
    hidden(
      o("circle", {
        cx: 0,
        cy: 0,
        r,
        fill: "none",
        stroke: GOLD,
        "stroke-width": w,
        "stroke-opacity": 0.24,
      }),
    );
  const bands = {
    rule: band(555, 36),
    A: band(510, 30),
    B: band(410, 116),
    C: band(320, 30),
    D: band(220, 116),
    E: band(130, 30),
  };
  const lit = (b, t0, t1) => {
    fadeIn(b, t0);
    fadeOut(b, t1, 0.5);
  };

  // a gold ring round a slider; `at(t)` keeps it on a slider that moves
  const follows = [];
  const ring = (at, r = 15) => {
    const e = hidden(o("circle", { r, fill: "none", stroke: GOLD, "stroke-width": 3 }));
    follows.push({ e, at: typeof at === "function" ? at : () => at });
    return e;
  };
  const pulseIn = (e, t) =>
    tl.fromTo(e, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1 }, t, {
      dur: 0.45,
      ease: "out-cubic",
    });

  // ------------------------------------------------------------- left panel
  // title and credits
  const titleL = M.layer(scene, 110, 230);
  M.el("div", { class: "title", text: "Perceptron" }, titleL);
  M.el("div", { class: "title", text: "Apparatus" }, titleL);
  const tagline = M.el("div", { class: "tagline", text: "An abacus for deep learning" }, titleL);
  tagline.style.marginTop = "28px";
  const creditL = M.layer(scene, 110, 590);
  creditL.innerHTML = `
    <div class="credit"><b>Cybernetic Studio</b> · ANU School of Cybernetics</div>
    <div class="credit">Designed by Ben Swift · fabricated with Sam Shellard, UC Workshop7</div>
    <div class="credit">github.com/ANUcybernetics/perceptron-apparatus</div>`;
  M.set(creditL, { opacity: 0 });
  fadeOut(titleL, T.start(1) - 0.5);
  fadeIn(titleL, END - 0.4, 0.8);
  fadeIn(creditL, END + 0.4, 0.8);
  fadeOut(creditL, TOTAL - 1.8, 0.6);

  // the network diagram: 36, 6 and 10 nodes, every node joined to the next column
  const netL = M.layer(scene, 0, 0);
  const net = M.svg("svg", { width: 960, height: 890, viewBox: "0 0 960 890" }, netL);
  const col = (x, n, pitch) =>
    Array.from({ length: n }, (_, i) => [x, 445 + (i - (n - 1) / 2) * pitch]);
  const cols = [col(170, N_IN, 21.5), col(480, N_HID, 92), col(790, N_OUT, 62)];
  const wires = (from, to) =>
    from.flatMap(([x1, y1]) => to.map(([x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`)).join("");
  const netPart = (k) => {
    const g = hidden(M.svg("g", {}, net));
    const gold = hidden(M.svg("g", {}, net));
    if (k % 2) {
      const d = wires(cols[(k - 1) / 2], cols[(k + 1) / 2]);
      M.svg(
        "path",
        { d, stroke: WHITE, "stroke-width": 1, "stroke-opacity": 0.2, fill: "none" },
        g,
      );
      M.svg(
        "path",
        { d, stroke: GOLD, "stroke-width": 1, "stroke-opacity": 0.55, fill: "none" },
        gold,
      );
    } else
      for (const [cx, cy] of cols[k / 2]) {
        M.svg("circle", { cx, cy, r: 7, fill: WHITE }, g);
        M.svg("circle", { cx, cy, r: 7, fill: GOLD }, gold);
      }
    return { g, gold };
  };
  // wires first, so the nodes sit on top of them
  const netParts = [1, 3, 0, 2, 4]
    .map((k) => [k, netPart(k)])
    .sort((a, b) => a[0] - b[0])
    .map((p) => p[1]);
  const tNet = T.word(1, "neural");
  const tSame = T.word(1, "same");
  const tNetOut = T.end(1) + 0.5;
  netParts.forEach(({ g, gold }, k) => {
    fadeIn(g, tNet + (k % 2 ? 0.45 : 0) + (k >> 1) * 0.12, 0.5);
    const t = tSame + k * 0.6;
    fadeIn(gold, t, 0.35);
    lit(bands["ABCDE"[k]], t, tNetOut);
    fadeOut([g, gold], tNetOut);
  });

  // the digit: written, then its 6x6 grid of ink values
  const CELL = 80;
  const gridL = M.layer(scene, 90, 60);
  Object.assign(gridL.style, { width: `${6 * CELL}px`, height: `${6 * CELL}px` });
  M.set(gridL, { opacity: 0 });
  const cellEls = PX.map((v, i) => {
    const c = M.el("div", {}, gridL);
    Object.assign(c.style, {
      position: "absolute",
      left: `${(i % 6) * CELL}px`,
      top: `${Math.floor(i / 6) * CELL}px`,
      width: `${CELL}px`,
      height: `${CELL}px`,
    });
    const ink = M.el("div", {}, c);
    Object.assign(ink.style, { position: "absolute", inset: "0", background: WHITE });
    M.set(ink, { opacity: 0 });
    const edge = M.el("div", {}, c);
    Object.assign(edge.style, {
      position: "absolute",
      inset: "0",
      border: "1px solid rgb(255 255 255 / 28%)",
    });
    M.set(edge, { opacity: 0 });
    const hl = M.el("div", {}, c);
    Object.assign(hl.style, {
      position: "absolute",
      inset: "-2px",
      border: `4px solid ${GOLD}`,
      zIndex: 1,
    });
    M.set(hl, { opacity: 0 });
    return { ink, edge, hl, v };
  });
  const frame = (colour) => {
    const f = M.el("div", {}, gridL);
    Object.assign(f.style, { position: "absolute", inset: "-2px", border: `3px solid ${colour}` });
    return f;
  };
  frame("rgb(255 255 255 / 70%)");
  const goldFrame = frame(GOLD);
  M.set(goldFrame, { opacity: 0 });
  const penSvg = M.svg("svg", { width: 6 * CELL, height: 6 * CELL, viewBox: "0 0 6 6" }, gridL);
  penSvg.style.position = "absolute";
  const pen = M.svg(
    "path",
    {
      d: "M1.35 3.45 L1.45 2.5 L4.55 2.5 C4.75 3.5 3.85 4.4 4.45 5.75",
      fill: "none",
      stroke: WHITE,
      "stroke-width": 0.42,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    penSvg,
  );
  M.prepDraw([pen]);
  const tShrunk = T.word(2, "shrunk");
  fadeIn(gridL, T.start(2) - 0.3);
  M.drawOn(tl, [pen], T.word(2, "handwritten"), 1.1, 0, "in-out-cubic");
  fadeOut(pen, tShrunk + 0.25, 0.7);
  cellEls.forEach(({ ink, edge, hl, v }, i) => {
    tl.to(edge, { opacity: 1 }, tShrunk + M.hash(i) * 0.5, { dur: 0.4 });
    tl.to(ink, { opacity: v }, tShrunk + 0.15 + M.hash(i) * 0.5, { dur: 0.5 });
    if (!CLOSE.includes(i)) tl.to(hl, { opacity: 1 }, tA[i], { dur: 0.16, yoyo: true });
  });
  lit(bands.A, T.word(2, "outer"), tPushA + 3.7);

  // push in on ring A, walking round the table so its labels read upright:
  // three neighbouring squares of the grid, three distances
  const TURN = -135; // brings sliders A21 to A23 to the bottom of the table
  tl.to(shade, { opacity: 1 }, tPushA - 0.1, { dur: 0.25 });
  cam({ by: 500, s: 2.6, sx: RIGHT.sx, sy: 560 }, tPushA, 1.2);
  tl.to(spinL, { rotation: TURN }, tPushA, { dur: 1.2, ease: "in-out-cubic" });
  const closeRings = CLOSE.map((i) => {
    const r = ring((t) => azPos("A", i, apparatusAt(t).a[i]), 11);
    pulseIn(r, tA[i]);
    tl.to(cellEls[i].hl, { opacity: 1 }, tA[i], { dur: 0.25 });
    return r;
  });
  fadeOut([...closeRings, ...CLOSE.map((i) => cellEls[i].hl)], tPushA + 3.6);
  cam(HOME_CAM, tPushA + 3.7, 1.1);
  tl.to(spinL, { rotation: 0 }, tPushA + 3.7, { dur: 1.1, ease: "in-out-cubic" });
  tl.to(shade, { opacity: 0 }, tPushA + 4.7, { dur: 0.25 });

  // the training digits the weights came from: here, then gone
  const tKnows = seg(3, 1).start;
  const THUMB = 28;
  const PITCH = 34.6;
  const mosaicL = M.layer(scene, 620, 130);
  SAMPLE.images.forEach((img, n) => {
    const thumb = M.svg("svg", { width: THUMB, height: THUMB, viewBox: "0 0 6 6" }, mosaicL);
    Object.assign(thumb.style, {
      position: "absolute",
      left: `${(n % 10) * PITCH}px`,
      top: `${Math.floor(n / 10) * PITCH}px`,
    });
    // one path per ink level, rather than 36 cells
    for (const level of [0.25, 0.5, 0.75, 1]) {
      const d = img
        .map((v, c) =>
          Math.ceil(v * 4) / 4 === level ? `M${c % 6} ${Math.floor(c / 6)}h1v1h-1z` : "",
        )
        .join("");
      if (d) M.svg("path", { d, fill: WHITE, "fill-opacity": level, stroke: "none" }, thumb);
    }
    M.set(thumb, { opacity: 0 });
    tl.to(thumb, { opacity: 1 }, tLearn + M.hash(n + 7) * 2.6, { dur: 0.25 });
  });
  fadeOut(mosaicL, tKnows + 0.2, 0.9);
  lit(bands.B, T.word(3, "next"), T.end(3) + 0.5);

  // one step, written out as a sum
  const sumL = M.layer(scene, 90, 610);
  Object.assign(sumL.style, { display: "flex", gap: "30px", alignItems: "flex-start" });
  const term = (text, label, cls = "") => {
    const d = M.el("div", {}, sumL);
    M.el("div", { class: `num ${cls}`.trim(), text }, d);
    if (label) M.el("div", { class: "label", text: label }, d).style.marginTop = "14px";
    M.set(d, { opacity: 0 });
    return d;
  };
  const sum = {
    input: term(num(EX.input, 2), "input"),
    times: term("×"),
    weight: term(num(EX.weight, 1), "weight"),
    equals: term("="),
    product: term(num(EX.product, 1), "", "gold"),
  };
  for (const e of [sum.times, sum.equals]) e.firstChild.style.fontWeight = 300;
  const tIn = T.word(4, "input");
  const tWt = T.word(4, "weight");
  const tStepOut = T.start(5) - 0.35;
  tl.to(shade, { opacity: 1 }, T.start(4) - 0.2, { dur: 0.25 });
  cam({ bx: -130, by: 345, s: 1.7, ...RIGHT }, T.start(4) - 0.1, 1.1);
  cam(HOME_CAM, tStepOut, 1.0);
  tl.to(shade, { opacity: 0 }, tStepOut + 1.0, { dur: 0.25 });
  const exRings = [
    ring(azPos("A", EX.i, EX.input)),
    ring(radPos("B", EX.j, EX.i, EX.weight)),
    ring((t) => azPos("C", EX.j, apparatusAt(t).c[EX.j])),
  ];
  M.appear(tl, sum.input, tIn);
  pulseIn(exRings[0], tIn);
  tl.to(cellEls[EX.i].hl, { opacity: 1 }, tIn, { dur: 0.3 });
  M.appear(tl, [sum.times, sum.weight], tWt);
  pulseIn(exRings[1], tWt);
  lit(bands.rule, tMul - 0.3, tMul + 2.4);
  M.appear(tl, [sum.equals, sum.product], tMul + 1.5);
  pulseIn(exRings[2], T.word(4, "slider"));
  tl.to(sum.product, { scale: 1.12 }, tAdd, { dur: 0.3, yoyo: true });
  fadeOut([...Object.values(sum), ...exRings, cellEls[EX.i].hl], tStepOut, 0.3);

  // the same step, 216 times, then 60 more
  const countL = M.layer(scene, 90, 590);
  const count = M.el("div", { class: "count gold" }, countL);
  const countLabel = M.el("div", { class: "label" }, countL);
  countLabel.style.fontSize = "34px";
  M.set(countL, { opacity: 0 });
  fadeIn(countL, run1.start - 0.1, 0.3);
  fadeOut(countL, T.start(6) - 0.25, 0.3);
  fadeIn(countL, run2.start - 0.1, 0.3);
  fadeOut(countL, tPushE - 0.1, 0.3);
  const runInput = (t) => {
    if (t < run2.start) {
      const { i } = ORDER1[step1(t) - 1];
      return azPos("A", i, PX[i]);
    }
    const { j } = ORDER2[step2(t) - 1];
    return azPos("C", j, HIDDEN[j]);
  };
  const runWeight = (t) => {
    if (t < run2.start) {
      const { i, j } = ORDER1[step1(t) - 1];
      return radPos("B", j, i, W.B[i][j]);
    }
    const { j, k } = ORDER2[step2(t) - 1];
    return radPos("D", k, j, W.D[j][k]);
  };
  const runRings = [ring(runInput, 13), ring(runWeight, 13)];
  for (const run of [run1, run2]) {
    tl.set(runRings, { opacity: 1 }, run.start);
    fadeOut(runRings, run.end, 0.3);
  }

  // below zero goes back to zero
  const tBelow = T.word(6, "below");
  const tReluOut = T.end(6) + 0.9;
  lit(bands.C, T.start(6) - 0.2, tReluOut);
  tl.to(shade, { opacity: 1 }, T.start(6) - 0.7, { dur: 0.25 });
  cam({ s: 1.25, ...RIGHT }, T.start(6) - 0.6, 1.0);
  const zeros = Array.from({ length: N_HID }, (_, j) => {
    const [x1, y1] = azPos("C", j, 0).map((v) => (v * 300) / 320);
    const [x2, y2] = azPos("C", j, 0).map((v) => (v * 340) / 320);
    return hidden(o("line", { x1, y1, x2, y2, stroke: GOLD, "stroke-width": 3.5 }));
  });
  const reluRings = below.map((j) => ring((t) => azPos("C", j, apparatusAt(t).c[j])));
  reluRings.forEach((r, n) => pulseIn(r, tBelow + n * 0.12));
  fadeIn(zeros, T.word(6, "zero"), 0.3);
  fadeOut([...zeros, ...reluRings], tReluOut);

  // the second weights, the ten outputs and the answer
  lit(bands.D, T.start(7), run2.end + 0.3);
  cam({ s: 2.4, sx: 960, sy: 445 }, tPushE, 1.0);
  tl.to(shade, { opacity: 0 }, tPushE, { dur: 0.4 });
  fadeOut(gridL, tPushE - 0.1);
  lit(bands.E, T.word(7, "inner"), T.word(7, "furthest"));
  // (the twin's stylesheet sizes every <text> on the page, so these are styled inline)
  const label = (text, x, y, fill, size, weight) => {
    const e = hidden(
      o("text", {
        x,
        y,
        text,
        fill,
        "text-anchor": "middle",
        "dominant-baseline": "central",
        stroke: "none",
      }),
    );
    Object.assign(e.style, {
      fontFamily: "Public Sans",
      fontSize: `${size}px`,
      fontWeight: weight,
    });
    return e;
  };
  const digit = (k, fill) => label(String(k), ...polar(36 * k + 18, 92), fill, 26, 600);
  const digits = Array.from({ length: N_OUT }, (_, k) => digit(k, WHITE));
  const goldDigit = digit(ANSWER, GOLD);
  tl.to(digits, { opacity: 1 }, T.word(7, "ten"), { dur: 0.3, stagger: 0.05 });
  const tFurthest = T.word(7, "furthest");
  const winner = ring((t) => azPos("E", ANSWER, apparatusAt(t).e[ANSWER]), 11);
  pulseIn(winner, tFurthest);
  // how far each output slider has come, drawn along its track
  const trails = hidden(o("g", {}));
  const trailEls = Array.from({ length: N_OUT }, () =>
    M.svg("path", { fill: "none", stroke: GOLD, "stroke-width": 7 }, trails),
  );
  fadeIn(trails, tFurthest - 0.2);
  tl.to(digits, { opacity: (i) => (i === ANSWER ? 0 : 0.4) }, tFurthest + 0.2, { dur: 0.4 });
  fadeIn(goldDigit, tFurthest + 0.2);
  const logo = [...apparatus.svg.querySelectorAll("path.full, text.logo")];
  const logoRest = logo.map((e) => M.get(e, "opacity"));
  // its two words sit one above the other; turned with the table, their boxes cross
  for (const e of logo) e.setAttribute("data-layout-allow-overlap", "");
  const answer = label(String(ANSWER), 0, 4, GOLD, 120, 700);
  fadeOut(logo, tSeven - 0.25, 0.25);
  tl.fromTo(answer, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, tSeven, {
    dur: 0.5,
    ease: "out-back(1.4)",
  });
  cam(HOME_CAM, tBack, 1.0);
  fadeIn(gridL, tBack + 0.6);
  tl.set(goldFrame, { opacity: 1 }, tBack);

  // by hand: most of an hour, swept round the rim
  const clock = o("path", { fill: "none", stroke: GOLD, "stroke-width": 7 });
  // 276 steps at ten seconds each is 46 minutes
  const tHand = T.word(8, "hand");
  fadeOut(clock, zoomOut.start - 0.1, 0.4);

  // a chip: the same table, tiny, thousands of times over
  const FAR = 0.02;
  const SPACING = 1300;
  const zoom = (t) =>
    C.phase(t, zoomOut.start, zoomOut.dur, "in-out-quad") -
    C.phase(t, zoomIn.start, zoomIn.dur, "in-out-quad");
  const view = (z) => ({
    s: Math.exp(lerp(Math.log(HOME.s), Math.log(FAR), z)),
    sx: lerp(HOME.cx, 960, z),
    sy: HOME.cy,
  });
  // the board and the field below read the same zoom(t), so they can't drift apart
  for (const { start, dur } of [zoomOut, zoomIn])
    tl.sample(boardL, start, dur, (p) => camProps(view(zoom(start + p * dur))));
  fadeOut(gridL, zoomOut.start - 0.1);
  fadeIn(gridL, zoomIn.start + zoomIn.dur - 0.5);
  const smooth = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  const field = C.canvas(
    tl,
    scene,
    (ctx, t, { w, h }) => {
      const z = zoom(t);
      if (z <= 0.001) return;
      const { s, sx, sy } = view(z);
      const R = 600 * s;
      const pitch = SPACING * s;
      const fade = smooth(z, 0.1, 0.4);
      const twinkle = smooth(z, 0.93, 1);
      const tick = Math.floor(t * 10);
      const circle = (x, y, r) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI);
      };
      for (let i = -15; i <= 15; i++)
        for (let j = -15; j <= 15; j++) {
          if (i === 0 && j === 0) continue; // the table itself
          const x = sx + i * pitch;
          const y = sy + j * pitch;
          if (x < -R || x > w + R || y < -R || y > h + R) continue;
          ctx.lineWidth = Math.min(2, Math.max(1, R / 40));
          ctx.fillStyle = GOLD;
          ctx.globalAlpha = 0.14 * fade;
          circle(x, y, R);
          ctx.fill();
          ctx.globalAlpha = 0.4 * fade;
          ctx.strokeStyle = WHITE;
          circle(x, y, R);
          ctx.stroke();
          ctx.strokeStyle = GOLD;
          ctx.globalAlpha = 0.75 * fade;
          for (const f of R > 30 ? [0.85, 0.68, 0.53, 0.37, 0.22] : [0.72, 0.36]) {
            circle(x, y, R * f);
            ctx.stroke();
          }
          if (twinkle > 0 && M.hash(i * 57.3 + j * 131.7 + tick * 7.31) > 0.94) {
            ctx.globalAlpha = 0.9 * twinkle;
            ctx.fillStyle = GOLD;
            circle(x, y, R * 0.86);
            ctx.fill();
          }
        }
    },
    { x: 0, y: 0, w: 1920, h: 890 },
  );
  // under the board, which stays the one real table in the middle
  scene.insertBefore(field.el, boardL);
  const chipL = M.layer(scene, 0, 0);
  const chip = M.svg("svg", { width: 1920, height: 890, viewBox: "0 0 1920 890" }, chipL);
  const HALF = 412;
  const pins = Array.from({ length: 18 }, (_, n) => {
    const u = -HALF + ((n + 0.5) * 2 * HALF) / 18;
    return [
      `M${960 + u} ${445 - HALF}v-16`,
      `M${960 + u} ${445 + HALF}v16`,
      `M${960 - HALF} ${445 + u}h-16`,
      `M${960 + HALF} ${445 + u}h16`,
    ].join("");
  }).join("");
  const chipPaths = [
    M.svg(
      "path",
      {
        d: `M${960 - HALF} ${445 - HALF}h${2 * HALF}v${2 * HALF}h${-2 * HALF}Z`,
        fill: "none",
        stroke: WHITE,
        "stroke-width": 2.5,
      },
      chip,
    ),
    M.svg("path", { d: pins, fill: "none", stroke: WHITE, "stroke-width": 2.5 }, chip),
  ];
  M.prepDraw([chipPaths[0]]);
  M.set(chipPaths[1], { opacity: 0 });
  M.drawOn(tl, [chipPaths[0]], zoomOut.start + zoomOut.dur - 0.9, 0.9, 0, "in-out-cubic");
  fadeIn(chipPaths[1], zoomOut.start + zoomOut.dur - 0.2);
  fadeOut(chipL, zoomIn.start, 0.5);

  // back to rest, so the last frame is the first
  fadeOut(gridL, END - 1.2);
  fadeOut([answer, goldDigit, ...digits, winner, trails], tReset, 0.8);
  tl.to(logo, { opacity: (i) => logoRest[i] }, tReset + 0.6, { dur: 0.8 });

  // ------------------------------------------------- the apparatus, each frame
  const sliders = [...apparatus.svg.querySelectorAll("circle.slider")];
  const GLINT = { spread: 1.3, dur: 0.5, size: 1.3 };
  const applied = new Map();
  const put = (id, v) => {
    const r = Math.round(v * 1e4) / 1e4;
    if (applied.get(id) === r) return;
    applied.set(id, r);
    apparatus.setSlider(id, r);
  };
  tl.draw((t) => {
    const st = apparatusAt(t);
    st.a.forEach((v, i) => put(`A${i}`, v));
    st.c.forEach((v, j) => put(`C${j}`, v));
    st.e.forEach((v, k) => put(`E${k}`, v));
    for (let j = 0; j < N_HID; j++) {
      for (let i = 0; i < N_IN; i++) put(`B${j}-${i}`, st.b(i, j));
      for (let k = 0; k < N_OUT; k++) put(`D${k}-${j}`, st.d(j, k));
    }
    apparatus.setLogRingRotation(st.ring);
    for (const { e, at } of follows) {
      const [x, y] = at(t);
      e.setAttribute("cx", x);
      e.setAttribute("cy", y);
    }
    st.e.forEach((v, k) => {
      const [x0, y0] = azPos("E", k, 0);
      const [x1, y1] = azPos("E", k, v);
      trailEls[k].setAttribute("d", v > 0.005 ? `M${x0} ${y0}A130 130 0 0 0 ${x1} ${y1}` : "");
    });
    const swept = 276 * C.phase(t, tHand, 2.6, "in-out-quad"); // degrees: 46 minutes of an hour
    const [hx, hy] = polar(180 - swept, 592);
    clock.setAttribute(
      "d",
      swept > 0.1 ? `M0 -592A592 592 0 ${swept > 180 ? 1 : 0} 1 ${hx} ${hy}` : "",
    );
    const inRun2 = t >= run2.start - 0.5;
    count.textContent = String(inRun2 ? Math.min(60, step2(t)) : Math.min(216, step1(t)));
    countLabel.textContent = inRun2 ? "of 60 more" : "of 216 multiplications";
    sliders.forEach((c, n) => {
      const lag = (n / sliders.length) * GLINT.spread;
      const u = tGlint.map((t0) => (t - t0 - lag) / GLINT.dur).find((v) => v > 0 && v < 1);
      const k = u ? 1 + GLINT.size * Math.sin(Math.PI * u) ** 2 : 1;
      const key = `glint${n}`;
      if (applied.get(key) === k) return;
      applied.set(key, k);
      c.style.scale = k;
    });
  });

  // ---------------------------------------------------------------- captions
  const capBand = M.el("div", { class: "captions" }, S.root);
  const cues = T.lines.flatMap((l) => l.segments);
  cues.forEach((cue, n) => {
    const c = M.el("div", { class: "caption", text: cue.caption }, capBand);
    M.set(c, { opacity: 0 });
    const next = cues[n + 1]?.start ?? Infinity;
    tl.set(c, { opacity: 1 }, cue.start);
    // held across a short pause, so the band doesn't blink between sentences
    tl.set(c, { opacity: 0 }, next - cue.end < 1.2 ? next : cue.end + 0.5);
  });
}
