//#region src/board.d.ts
interface BoardConfig {
  size?: number;
  nInput: number;
  nHidden: number;
  nOutput: number;
}
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
export { BoardConfig as a, reluRule as i, PerceptronApparatus as n, renderBoard as o, logRule as r, AnimationOptions as t };