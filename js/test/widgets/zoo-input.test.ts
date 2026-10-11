import { describe, it, expect, vi } from "vitest";
import {
  ZooInputWidget,
  encodeAnimal,
  ZOO_TRAITS,
  ZOO_LEG_COUNTS,
  ZOO_CLASS_NAMES,
  ZOO_EXAMPLES,
} from "../../src/widgets/zoo-input.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

function dog() {
  return ZOO_EXAMPLES.find((e) => e.name === "dog")!.animal;
}

describe("encodeAnimal", () => {
  it("produces 36 values", () => {
    expect(encodeAnimal(dog())).toHaveLength(36);
  });

  it("encodes traits in ZOO_TRAITS order", () => {
    const encoded = encodeAnimal(dog());
    const expected = ZOO_TRAITS.map((t) => (dog().traits[t] ? 1 : 0));
    expect(encoded.slice(0, 15)).toEqual(expected);
    expect(encoded[ZOO_TRAITS.indexOf("hair")]).toBe(1);
    expect(encoded[ZOO_TRAITS.indexOf("feathers")]).toBe(0);
  });

  it("one-hot encodes the leg count", () => {
    const base = dog();
    for (let i = 0; i < ZOO_LEG_COUNTS.length; i++) {
      const encoded = encodeAnimal({ ...base, legs: ZOO_LEG_COUNTS[i] });
      const legs = encoded.slice(15, 21);
      expect(legs.reduce((a, b) => a + b, 0)).toBe(1);
      expect(legs[i]).toBe(1);
    }
  });

  it("pads indices 21-35 with zeros", () => {
    expect(encodeAnimal(dog()).slice(21)).toEqual(Array.from({ length: 15 }, () => 0));
  });
});

describe("ZOO_EXAMPLES", () => {
  it("names a valid class for every example", () => {
    for (const ex of ZOO_EXAMPLES) {
      expect(ZOO_CLASS_NAMES).toContain(ex.className);
    }
  });

  it("covers all seven classes", () => {
    expect(new Set(ZOO_EXAMPLES.map((e) => e.className)).size).toBe(7);
  });
});

describe("ZooInputWidget", () => {
  it("appends to container with a checkbox per trait", () => {
    const container = makeContainer();
    const widget = new ZooInputWidget(container);
    expect(container.children).toHaveLength(1);
    expect(widget.element.querySelectorAll('input[type="checkbox"]')).toHaveLength(15);
  });

  it("labels every checkbox", () => {
    const widget = new ZooInputWidget(makeContainer());
    for (const label of widget.element.querySelectorAll("label.pa-zoo-trait")) {
      expect(label.querySelector("input")).not.toBeNull();
      expect(label.textContent?.trim()).not.toBe("");
    }
  });

  it("starts with no traits and zero legs", () => {
    const widget = new ZooInputWidget(makeContainer());
    const values = widget.getValues();
    expect(values).toHaveLength(36);
    expect(values.slice(0, 15).every((v) => v === 0)).toBe(true);
    expect(values.slice(15, 21)).toEqual([1, 0, 0, 0, 0, 0]);
  });

  it("checking a trait changes values and fires onChange", () => {
    const onChange = vi.fn();
    const widget = new ZooInputWidget(makeContainer(), { onChange });
    const box = widget.element.querySelector('input[name="milk"]') as HTMLInputElement;
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    expect(widget.getValues()[ZOO_TRAITS.indexOf("milk")]).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(36);
  });

  it("changing the leg select updates the one-hot", () => {
    const widget = new ZooInputWidget(makeContainer());
    const select = widget.element.querySelector(".pa-zoo-legs-select") as HTMLSelectElement;
    select.value = "8";
    select.dispatchEvent(new Event("change"));
    expect(widget.getValues().slice(15, 21)).toEqual([0, 0, 0, 0, 0, 1]);
  });

  it("choosing an example loads it", () => {
    const onChange = vi.fn();
    const widget = new ZooInputWidget(makeContainer(), { onChange });
    const select = widget.element.querySelector(".pa-zoo-example-select") as HTMLSelectElement;
    select.value = "eagle";
    select.dispatchEvent(new Event("change"));
    const eagle = ZOO_EXAMPLES.find((e) => e.name === "eagle")!;
    expect(widget.getAnimal()).toEqual(eagle.animal);
    expect(widget.getValues()).toEqual(encodeAnimal(eagle.animal));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("setAnimal updates the controls and notifies", () => {
    const widget = new ZooInputWidget(makeContainer());
    const listener = vi.fn();
    widget.onChange(listener);
    widget.setAnimal(dog());
    expect(widget.getAnimal()).toEqual(dog());
    const box = widget.element.querySelector('input[name="hair"]') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("destroy removes element", () => {
    const container = makeContainer();
    const widget = new ZooInputWidget(container);
    widget.destroy();
    expect(container.children).toHaveLength(0);
  });
});
