// @vitest-environment node
import { describe, it, expect } from "vitest";
import { el, textEl, findAll, find, type VNode } from "../src/vnode.js";

describe("el", () => {
  it("creates a node with tag and defaults", () => {
    const node = el("g");
    expect(node).toEqual({ tag: "g", attrs: {}, children: [] });
  });

  it("creates a node with attributes", () => {
    const node = el("circle", { cx: "0", cy: "0", r: "5" });
    expect(node.tag).toBe("circle");
    expect(node.attrs).toEqual({ cx: "0", cy: "0", r: "5" });
    expect(node.children).toEqual([]);
  });

  it("creates a node with children", () => {
    const child = el("line");
    const node = el("g", {}, [child]);
    expect(node.children).toEqual([child]);
  });
});

describe("textEl", () => {
  it("creates a node with text content", () => {
    const node = textEl("text", "hello");
    expect(node.tag).toBe("text");
    expect(node.text).toBe("hello");
    expect(node.children).toEqual([]);
  });

  it("creates a node with text and attributes", () => {
    const node = textEl("text", "label", { class: "etch" });
    expect(node.attrs).toEqual({ class: "etch" });
    expect(node.text).toBe("label");
  });
});

describe("findAll", () => {
  const tree: VNode = el("svg", {}, [
    el("g", { "data-ring": "log" }, [
      el("circle", { class: "full" }),
      el("line", { class: "etch" }),
    ]),
    el("g", { "data-ring-type": "azimuthal" }, [
      el("circle", { class: "slider" }),
      el("circle", { class: "slider" }),
    ]),
  ]);

  it("finds all nodes matching a predicate", () => {
    const circles = findAll(tree, (n) => n.tag === "circle");
    expect(circles).toHaveLength(3);
  });

  it("finds nodes by attribute", () => {
    const sliders = findAll(
      tree,
      (n) => n.attrs["class"] === "slider",
    );
    expect(sliders).toHaveLength(2);
  });

  it("includes the root if it matches", () => {
    const svgs = findAll(tree, (n) => n.tag === "svg");
    expect(svgs).toHaveLength(1);
  });

  it("returns empty array when nothing matches", () => {
    const result = findAll(tree, (n) => n.tag === "rect");
    expect(result).toEqual([]);
  });
});

describe("find", () => {
  const tree: VNode = el("g", {}, [
    el("circle", { class: "a" }),
    el("circle", { class: "b" }),
  ]);

  it("returns the first match", () => {
    const result = find(tree, (n) => n.tag === "circle");
    expect(result?.attrs["class"]).toBe("a");
  });

  it("returns undefined when nothing matches", () => {
    const result = find(tree, (n) => n.tag === "rect");
    expect(result).toBeUndefined();
  });
});
