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
}
//#endregion
export { BoardConfig as a, VNode as c, findAll as d, render as f, reluRule as i, el as l, PerceptronApparatus as n, buildBoard as o, textEl as p, logRule as r, renderBoard as s, AnimationOptions as t, find as u };