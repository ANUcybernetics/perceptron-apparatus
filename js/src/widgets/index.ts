export {
  ComputationAnimator,
  type ComputeOptions,
  type ComputeResult,
  type StepInfo,
} from "./animator.js";
export {
  computeTrace,
  traceResult,
  type ComputationStep,
  type SetInputStep,
  type MultiplyAccumulateStep,
  type ReluStep,
  type ArgmaxStep,
} from "./trace.js";
export { MnistInputWidget } from "./mnist-input.js";
export {
  ZooInputWidget,
  encodeAnimal,
  ZOO_TRAITS,
  ZOO_LEG_COUNTS,
  ZOO_CLASS_NAMES,
  ZOO_EXAMPLES,
  type Animal,
  type ZooExample,
  type ZooTrait,
  type LegCount,
} from "./zoo-input.js";
export {
  LettersInputWidget,
  LETTERS_ALPHABET,
  encodeContext,
  symbolName,
} from "./letters-input.js";
export { sampleDigits, type SampleDigit } from "./sample-digits.js";
export { mnistWeights, zooWeights, lettersWeights, type Weights } from "./weights.js";
