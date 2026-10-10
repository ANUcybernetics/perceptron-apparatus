import { describe, it, expect } from "vitest";
import { PerceptronApparatus } from "../src/index.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

function getStyle(el: Element): CSSStyleDeclaration {
  return (el as HTMLElement).style;
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
    expect(getStyle(logRing!).transform).toBe("rotate(45deg)");
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
    expect(getStyle(logRing!).transform).toBe("rotate(90deg)");
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
    expect(getStyle(slider!).transform).toMatch(/^rotate\(/);
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
    expect(getStyle(slider!).transform).toMatch(/^translate\(/);
  });

  it("moves a radial slider to its value on the engraved scale", async () => {
    const container = makeContainer();
    const apparatus = new PerceptronApparatus(container, {
      nInput: 36,
      nHidden: 6,
      nOutput: 10,
    });
    const slider = apparatus.svg.querySelector("[data-slider='B0-0']")!;
    const circle = slider.querySelector("circle")!;
    const radiusAt = async (value: number) => {
      await apparatus.setSlider("B0-0", value);
      const [dx, dy] = getStyle(slider).transform.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
      return Math.hypot(
        Number(circle.getAttribute("cx")) + dx,
        Number(circle.getAttribute("cy")) + dy,
      );
    };

    // the guide arcs put the scale's minimum on the outside of the ring
    expect(await radiusAt(-5)).toBeCloseTo(465);
    expect(await radiusAt(5)).toBeCloseTo(355);
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
      expect(getStyle(slider!).transform).toMatch(/^rotate\(/);
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
    expect(getStyle(azimuthal!).transform).toMatch(/^rotate\(/);
    expect(getStyle(radial!).transform).toMatch(/^translate\(/);
  });
});
