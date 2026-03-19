//#region src/vnode.d.ts
interface VNode {
  tag: string;
  attrs: Record<string, string>;
  children: VNode[];
  text?: string;
}
declare function el(tag: string, attrs?: Record<string, string>, children?: VNode[]): VNode;
declare function textEl(tag: string, content: string, attrs?: Record<string, string>): VNode;
declare function findAll(node: VNode, predicate: (n: VNode) => boolean): VNode[];
declare function find(node: VNode, predicate: (n: VNode) => boolean): VNode | undefined;
declare function render(node: VNode, parent?: Element): Element;
//#endregion
//#region src/board.d.ts
interface BoardConfig {
  size?: number;
  nInput: number;
  nHidden: number;
  nOutput: number;
}
declare function buildBoard(config: BoardConfig): VNode;
declare function renderBoard(config: BoardConfig, parent: SVGElement | Element): SVGSVGElement;
//#endregion
//#region src/widgets/weights.d.ts
interface Weights {
  B: number[][];
  D: number[][];
}
declare const mnistWeights: Weights;
declare const pokerWeights: Weights;
//#endregion
//#region src/widgets/trace.d.ts
type ComputationStep = SetInputStep | MultiplyAccumulateStep | ReluStep | ArgmaxStep;
interface SetInputStep {
  type: "set-input";
  slider: string;
  value: number;
}
interface MultiplyAccumulateStep {
  type: "multiply-accumulate";
  target: string;
  inputSlider: string;
  inputValue: number;
  weightSlider: string;
  weightValue: number;
  product: number;
  accumulator: number;
  logRingAngle: number;
  productSign: 1 | -1;
}
interface ReluStep {
  type: "relu";
  neuron: string;
  pre: number;
  post: number;
}
interface ArgmaxStep {
  type: "argmax";
  prediction: number;
  values: number[];
}
declare function computeTrace(inputs: number[], weights: Weights): ComputationStep[];
declare function traceResult(steps: ComputationStep[]): {
  hidden: number[];
  output: number[];
  prediction: number;
};
//#endregion
//#region src/rule-ring.d.ts
interface LogRuleTick {
  outerLabel: string | null;
  theta: number;
  innerLabel: string | null;
}
declare function logRule(): LogRuleTick[];
declare function reluRule(maxValue: number, deltaValue: number): LogRuleTick[];
//#endregion
//#region src/index.d.ts
interface AnimationOptions {
  duration?: number;
}
declare class PerceptronApparatus {
  readonly svg: SVGSVGElement;
  private readonly config;
  constructor(container: Element, config: BoardConfig);
  setLogRingRotation(degrees: number, opts?: AnimationOptions): Promise<void>;
  setSlider(id: string, value: number, opts?: AnimationOptions): Promise<void>;
  setSliders(values: Record<string, number>, opts?: AnimationOptions): Promise<void>;
  private setAzimuthalSlider;
  private setRadialSlider;
  private findAzimuthalRing;
  private findRadialRing;
  private getRadiusForLayer;
  private getRuleRingRadius;
  private valueToRuleAngle;
  setSlideRuleMarkers(mac: MultiplyAccumulateStep, opts?: AnimationOptions): Promise<void>;
  clearSlideRuleMarkers(): void;
}
//#endregion
export { textEl as C, render as S, renderBoard as _, ArgmaxStep as a, find as b, ReluStep as c, traceResult as d, Weights as f, buildBoard as g, BoardConfig as h, reluRule as i, SetInputStep as l, pokerWeights as m, PerceptronApparatus as n, ComputationStep as o, mnistWeights as p, logRule as r, MultiplyAccumulateStep as s, AnimationOptions as t, computeTrace as u, VNode as v, findAll as x, el as y };