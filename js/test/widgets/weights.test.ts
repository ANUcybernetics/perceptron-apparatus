// @vitest-environment node
import { describe, it, expect } from "vitest";
import { mnistWeights, zooWeights, lettersWeights } from "../../src/widgets/weights.js";
import { computeTrace, traceResult } from "../../src/widgets/trace.js";
import { sampleDigits } from "../../src/widgets/sample-digits.js";
import { ZOO_EXAMPLES, ZOO_CLASS_NAMES, encodeAnimal } from "../../src/widgets/zoo-input.js";
import { LETTERS_ALPHABET, encodeContext } from "../../src/widgets/letters-input.js";

const predict = (inputs: number[], weights: typeof mnistWeights) =>
  traceResult(computeTrace(inputs, weights));

describe("bundled weights", () => {
  it.each([
    ["mnist", mnistWeights],
    ["zoo", zooWeights],
    ["letters", lettersWeights],
  ])("%s weights fill the 36-6-10 board and can be set on its sliders", (_name, weights) => {
    expect(weights.B.length).toBe(36);
    expect(weights.B.every((row) => row.length === 6)).toBe(true);
    expect(weights.D.length).toBe(6);
    expect(weights.D.every((row) => row.length === 10)).toBe(true);

    for (const magnitude of weights.B.flat().map(Math.abs)) {
      expect(magnitude === 0 || (magnitude >= 0.02 && magnitude <= 5.001)).toBe(true);
    }
    // output weights are never negative, so outputs only accumulate upwards
    for (const weight of weights.D.flat()) {
      expect(weight === 0 || (weight >= 0.02 && weight <= 5.001)).toBe(true);
    }
  });

  it("zoo weights classify the example animals", () => {
    for (const example of ZOO_EXAMPLES) {
      const { prediction } = predict(encodeAnimal(example.animal), zooWeights);
      expect(ZOO_CLASS_NAMES[prediction], example.name).toBe(example.className);
    }
  });

  it("zoo and letters weights keep the hidden and output sliders in range", () => {
    const cases: Array<[number[], typeof zooWeights]> = [
      ...ZOO_EXAMPLES.map((e): [number[], typeof zooWeights] => [
        encodeAnimal(e.animal),
        zooWeights,
      ]),
      [encodeContext("the"), lettersWeights],
      [encodeContext(" a "), lettersWeights],
    ];
    for (const [inputs, weights] of cases) {
      const { hidden, output } = predict(inputs, weights);
      for (const value of [...hidden, ...output]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(5.5);
      }
    }
  });

  it("letters weights continue common contexts sensibly", () => {
    const next = (context: string) =>
      LETTERS_ALPHABET[predict(encodeContext(context), lettersWeights).prediction];

    expect(next(" th")).toBe("e");
    expect(next("the")).toBe(" ");
  });

  it("mnist weights recognise every sample digit", () => {
    expect(sampleDigits.length).toBeGreaterThanOrEqual(5);
    for (const digit of sampleDigits) {
      expect(predict(digit.pixels, mnistWeights).prediction).toBe(digit.label);
    }
  });
});
