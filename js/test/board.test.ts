// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildBoard } from "../src/board.js";
import { findAll, find } from "../src/vnode.js";

describe("buildBoard", () => {
  it("creates an svg root node", () => {
    const tree = buildBoard({ nInput: 6, nHidden: 4, nOutput: 3 });
    expect(tree.tag).toBe("svg");
  });

  it("sets viewBox with default size", () => {
    const tree = buildBoard({ nInput: 6, nHidden: 4, nOutput: 3 });
    expect(tree.attrs["viewBox"]).toContain("-610");
    expect(tree.attrs["viewBox"]).toContain("1220");
  });

  it("sets viewBox with custom size", () => {
    const tree = buildBoard({
      size: 600,
      nInput: 2,
      nHidden: 2,
      nOutput: 2,
    });
    expect(tree.attrs["viewBox"]).toContain("-310");
    expect(tree.attrs["viewBox"]).toContain("620");
  });

  it("contains a style node", () => {
    const tree = buildBoard({ nInput: 2, nHidden: 2, nOutput: 2 });
    const style = find(tree, (n) => n.tag === "style");
    expect(style).toBeDefined();
    expect(style!.text).toContain(".slider");
  });

  it("creates board edge circle", () => {
    const tree = buildBoard({ nInput: 2, nHidden: 2, nOutput: 2 });
    const edge = find(
      tree,
      (n) => n.tag === "circle" && (n.attrs["class"] ?? "").includes("full"),
    );
    expect(edge).toBeDefined();
    expect(edge!.attrs["r"]).toBe("600");
  });

  it("creates the log ring with data-ring attribute", () => {
    const tree = buildBoard({ nInput: 2, nHidden: 2, nOutput: 2 });
    const logRing = find(tree, (n) => n.attrs["data-ring"] === "log");
    expect(logRing).toBeDefined();
    expect(logRing!.attrs["style"]).toBe("transform: rotate(4.2deg)");
  });

  it("creates azimuthal ring sliders", () => {
    const tree = buildBoard({ nInput: 3, nHidden: 2, nOutput: 2 });
    const inputSliders = findAll(
      tree,
      (n) =>
        (n.attrs["data-slider"] ?? "").startsWith("A") &&
        n.attrs["data-slider-type"] === "azimuthal",
    );
    expect(inputSliders.length).toBe(3);
  });

  it("creates radial ring sliders", () => {
    const tree = buildBoard({ nInput: 3, nHidden: 2, nOutput: 2 });
    const weightSliders = findAll(
      tree,
      (n) =>
        (n.attrs["data-slider"] ?? "").startsWith("B") &&
        n.attrs["data-slider-type"] === "radial",
    );
    expect(weightSliders.length).toBe(6);
  });

  it("creates all expected layer letters", () => {
    const tree = buildBoard({ nInput: 2, nHidden: 2, nOutput: 2 });

    for (const letter of ["A", "B", "C", "D", "E"]) {
      const found = find(
        tree,
        (n) => (n.attrs["data-slider"] ?? "").startsWith(letter),
      );
      expect(found, `expected slider starting with ${letter}`).toBeDefined();
    }
  });

  it("renders center logo text", () => {
    const tree = buildBoard({ nInput: 2, nHidden: 2, nOutput: 2 });
    const logoTexts = findAll(
      tree,
      (n) => n.tag === "text" && (n.attrs["class"] ?? "").includes("logo"),
    ).map((n) => n.text);
    expect(logoTexts).toContain("Cybernetic");
    expect(logoTexts).toContain("Studio");
  });
});
