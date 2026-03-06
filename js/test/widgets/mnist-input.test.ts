import { describe, it, expect } from "vitest";
import { MnistInputWidget } from "../../src/widgets/mnist-input.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

describe("MnistInputWidget", () => {
  it("creates a 6x6 grid", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container);
    expect(widget.element.children).toHaveLength(36);
  });

  it("appends to container", () => {
    const container = makeContainer();
    new MnistInputWidget(container);
    expect(container.children).toHaveLength(1);
  });

  it("initialises all values to 0", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container);
    const values = widget.getValues();
    expect(values).toHaveLength(36);
    expect(values.every((v) => v === 0)).toBe(true);
  });

  it("setValues updates values", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container);
    const newValues = Array.from({ length: 36 }, (_, i) =>
      i < 6 ? 1 : 0,
    );
    widget.setValues(newValues);
    expect(widget.getValues()).toEqual(newValues);
  });

  it("clear resets all values to 0", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container);
    widget.setValues(Array.from({ length: 36 }, () => 1));
    widget.clear();
    expect(widget.getValues().every((v) => v === 0)).toBe(true);
  });

  it("getValues returns a copy", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container);
    const values = widget.getValues();
    values[0] = 999;
    expect(widget.getValues()[0]).toBe(0);
  });

  it("destroy removes element from container", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container);
    expect(container.children).toHaveLength(1);
    widget.destroy();
    expect(container.children).toHaveLength(0);
  });

  it("respects custom cell size", () => {
    const container = makeContainer();
    const widget = new MnistInputWidget(container, { cellSize: 32 });
    const cell = widget.element.children[0] as HTMLElement;
    expect(cell.style.width).toBe("32px");
    expect(cell.style.height).toBe("32px");
  });
});
