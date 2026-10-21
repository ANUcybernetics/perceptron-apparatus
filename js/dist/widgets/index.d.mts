import { a as ArgmaxStep, c as ReluStep, d as traceResult, f as Weights, h as zooWeights, l as SetInputStep, m as mnistWeights, n as PerceptronApparatus, o as ComputationStep, p as lettersWeights, s as MultiplyAccumulateStep, u as computeTrace } from "../index-Brc7XGgU.mjs";
//#region src/widgets/animator.d.ts
interface ComputeOptions {
  mode?: "step" | "neuron" | "fast";
  stepDuration?: number;
  signal?: AbortSignal;
  onStep?: (info: StepInfo) => void;
}
interface StepInfo {
  phase: "weights" | "input" | "hidden" | "output";
  progress: number;
  description: string;
  step?: ComputationStep;
}
interface ComputeResult {
  hidden: number[];
  output: number[];
  prediction: number;
}
export declare class ComputationAnimator {
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
export declare class MnistInputWidget {
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
//#region src/widgets/zoo-input.d.ts
export declare const ZOO_TRAITS: readonly ["hair", "feathers", "eggs", "milk", "airborne", "aquatic", "predator", "toothed", "backbone", "breathes", "venomous", "fins", "tail", "domestic", "catsize"];
export declare const ZOO_LEG_COUNTS: readonly [0, 2, 4, 5, 6, 8];
export declare const ZOO_CLASS_NAMES: readonly ["mammal", "bird", "reptile", "fish", "amphibian", "insect", "invertebrate"];
type ZooTrait = (typeof ZOO_TRAITS)[number];
type LegCount = (typeof ZOO_LEG_COUNTS)[number];
interface Animal {
  traits: Record<ZooTrait, boolean>;
  legs: LegCount;
}
interface ZooExample {
  name: string;
  animal: Animal;
  className: (typeof ZOO_CLASS_NAMES)[number];
}
export declare function encodeAnimal(animal: Animal): number[];
export declare const ZOO_EXAMPLES: readonly ZooExample[];
export declare class ZooInputWidget {
  readonly element: HTMLElement;
  private readonly checkboxes;
  private readonly legsSelect;
  private readonly exampleSelect;
  private listeners;
  constructor(container: Element, opts?: {
    onChange?: (values: number[]) => void;
  });
  getAnimal(): Animal;
  setAnimal(animal: Animal): void;
  getValues(): number[];
  onChange(fn: (values: number[]) => void): void;
  destroy(): void;
  private showAnimal;
  private onUserChange;
  private onExampleChange;
  private notify;
}
//#endregion
//#region src/widgets/letters-input.d.ts
export declare const LETTERS_ALPHABET = "etaoinshr ";
export declare function symbolName(index: number): string;
export declare function encodeContext(context: string): number[];
export declare class LettersInputWidget {
  readonly element: HTMLElement;
  private readonly selects;
  private listeners;
  constructor(container: Element, opts?: {
    onChange?: (values: number[]) => void;
  });
  getContext(): string;
  setContext(context: string): void;
  append(symbol: string): void;
  getValues(): number[];
  onChange(fn: (values: number[]) => void): void;
  destroy(): void;
  private onUserChange;
  private notify;
}
//#endregion
//#region src/widgets/sample-digits.d.ts
interface SampleDigit {
  label: number;
  pixels: number[];
}
export declare const sampleDigits: SampleDigit[];
//#endregion
export { type Animal, type ArgmaxStep, type ComputationStep, type ComputeOptions, type ComputeResult, type LegCount, type MultiplyAccumulateStep, type ReluStep, type SampleDigit, type SetInputStep, type StepInfo, type Weights, type ZooExample, type ZooTrait, computeTrace, lettersWeights, mnistWeights, traceResult, zooWeights };