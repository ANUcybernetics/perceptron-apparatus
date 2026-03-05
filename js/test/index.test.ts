import { describe, it, expect } from "vitest";
import { PerceptronApparatus } from "../src/index.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

describe("PerceptronApparatus", () => {
  it("creates an SVG in the container", () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 3,
      nHidden: 2,
      nOutput: 2,
    });
    expect(apparatus.svg).toBeDefined();
    expect(container.querySelector("svg")).toBe(apparatus.svg);
  });

  it("exposes the SVG element", () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 2,
      nHidden: 2,
      nOutput: 2,
    });
    expect(apparatus.svg.tagName).toBe("svg");
  });
});

describe("setLogRingRotation", () => {
  it("sets rotation on the log ring group", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 2,
      nHidden: 2,
      nOutput: 2,
    });

    await apparatus.setLogRingRotation(45);

    const logRing = apparatus.svg.querySelector("[data-ring='log']");
    expect(logRing!.getAttribute("transform")).toBe("rotate(45)");
  });

  it("updates rotation when called multiple times", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 2,
      nHidden: 2,
      nOutput: 2,
    });

    await apparatus.setLogRingRotation(30);
    await apparatus.setLogRingRotation(90);

    const logRing = apparatus.svg.querySelector("[data-ring='log']");
    expect(logRing!.getAttribute("transform")).toBe("rotate(90)");
  });
});

describe("setSlider (azimuthal)", () => {
  it("sets transform on an azimuthal slider", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 4,
      nHidden: 3,
      nOutput: 2,
    });

    await apparatus.setSlider("A0", 0.5);

    const slider = apparatus.svg.querySelector("[data-slider='A0']");
    expect(slider).not.toBeNull();
    const transform = slider!.getAttribute("transform");
    expect(transform).toMatch(/^rotate\(/);
  });

  it("resolves immediately with duration 0", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 2,
      nHidden: 2,
      nOutput: 2,
    });

    const result = apparatus.setSlider("A0", 0.5);
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it("returns resolved promise for non-existent slider", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 2,
      nHidden: 2,
      nOutput: 2,
    });

    await apparatus.setSlider("Z99", 0.5);
  });
});

describe("setSlider (radial)", () => {
  it("sets transform on a radial slider", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 3,
      nHidden: 2,
      nOutput: 2,
    });

    await apparatus.setSlider("B0-0", 2.5);

    const slider = apparatus.svg.querySelector("[data-slider='B0-0']");
    expect(slider).not.toBeNull();
    const transform = slider!.getAttribute("transform");
    expect(transform).toMatch(/^translate\(/);
  });
});

describe("setSliders (batch)", () => {
  it("sets multiple sliders at once", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 3,
      nHidden: 2,
      nOutput: 2,
    });

    await apparatus.setSliders({
      A0: 0.5,
      A1: 0.8,
      A2: 0.2,
    });

    for (let i = 0; i < 3; i++) {
      const slider = apparatus.svg.querySelector(`[data-slider='A${i}']`);
      expect(slider!.getAttribute("transform")).toMatch(/^rotate\(/);
    }
  });

  it("handles mixed azimuthal and radial sliders", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 3,
      nHidden: 2,
      nOutput: 2,
    });

    await apparatus.setSliders({
      A0: 0.5,
      "B0-0": 2.0,
    });

    const azimuthal = apparatus.svg.querySelector("[data-slider='A0']");
    const radial = apparatus.svg.querySelector("[data-slider='B0-0']");
    expect(azimuthal!.getAttribute("transform")).toMatch(/^rotate\(/);
    expect(radial!.getAttribute("transform")).toMatch(/^translate\(/);
  });
});
