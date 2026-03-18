import { n as PerceptronApparatus } from "../index-Bb8Zwht9.mjs";

//#region src/widgets/weights.d.ts
interface Weights {
  B: number[][];
  D: number[][];
}
declare const mnistWeights: Weights;
declare const pokerWeights: Weights;
//#endregion
//#region src/widgets/animator.d.ts
interface ComputeOptions {
  mode?: "step" | "fast";
  stepDuration?: number;
  signal?: AbortSignal;
  onStep?: (info: StepInfo) => void;
}
interface StepInfo {
  phase: "weights" | "input" | "hidden" | "output";
  progress: number;
  description: string;
}
interface ComputeResult {
  hidden: number[];
  output: number[];
  prediction: number;
}
declare class ComputationAnimator {
  private readonly apparatus;
  private readonly weights;
  private readonly nInput;
  private readonly nHidden;
  private readonly nOutput;
  constructor(apparatus: PerceptronApparatus, weights: Weights);
  compute(inputs: number[], opts?: ComputeOptions): Promise<ComputeResult>;
  private setWeights;
  private setInputs;
}
//#endregion
//#region src/widgets/mnist-input.d.ts
declare class MnistInputWidget {
  readonly element: HTMLElement;
  private readonly cells;
  private readonly values;
  private listeners;
  private painting;
  private paintValue;
  constructor(container: Element, opts?: {
    cellSize?: number;
  });
  getValues(): number[];
  setValues(values: number[]): void;
  clear(): void;
  onChange(fn: (values: number[]) => void): void;
  destroy(): void;
  private onPointerDown;
  private onPointerMove;
  private onPointerUp;
  private paintCell;
  private updateCellColor;
  private notify;
}
//#endregion
//#region src/widgets/poker-input.d.ts
interface Card {
  suit: number;
  rank: number;
}
declare function encodeHand(cards: (Card | null)[]): number[];
declare class PokerInputWidget {
  readonly element: HTMLElement;
  private readonly cards;
  private readonly selectors;
  private listeners;
  constructor(container: Element);
  getCards(): (Card | null)[];
  setCards(cards: (Card | null)[]): void;
  getValues(): number[];
  clear(): void;
  onChange(fn: (values: number[]) => void): void;
  destroy(): void;
  private createCardSlot;
  private updateSlotDisplay;
  private notify;
}
declare const POKER_HAND_NAMES: string[];
//#endregion
export { type Card, ComputationAnimator, type ComputeOptions, type ComputeResult, MnistInputWidget, POKER_HAND_NAMES, PokerInputWidget, type StepInfo, type Weights, encodeHand, mnistWeights, pokerWeights };