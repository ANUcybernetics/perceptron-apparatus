import { describe, it, expect, vi } from "vitest";
import {
  LettersInputWidget,
  LETTERS_ALPHABET,
  encodeContext,
  symbolName,
} from "../../src/widgets/letters-input.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

function selectsOf(widget: LettersInputWidget): HTMLSelectElement[] {
  return [...widget.element.querySelectorAll("select")];
}

describe("encodeContext", () => {
  it("produces 36 values with three hot positions", () => {
    const encoded = encodeContext("the");
    expect(encoded).toHaveLength(36);
    expect(encoded.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("puts the oldest symbol first", () => {
    const encoded = encodeContext("the");
    expect(encoded[LETTERS_ALPHABET.indexOf("t")]).toBe(1);
    expect(encoded[10 + LETTERS_ALPHABET.indexOf("h")]).toBe(1);
    expect(encoded[10 + LETTERS_ALPHABET.indexOf("t")]).toBe(0);
    expect(encoded[20 + LETTERS_ALPHABET.indexOf("e")]).toBe(1);
    expect(encoded[20 + LETTERS_ALPHABET.indexOf("h")]).toBe(0);
  });

  it("encodes the most recent symbol in 20-29", () => {
    const encoded = encodeContext("ets");
    expect(encoded[20 + LETTERS_ALPHABET.indexOf("s")]).toBe(1);
  });

  it("encodes space as the last alphabet index", () => {
    const encoded = encodeContext("   ");
    expect(encoded[9]).toBe(1);
    expect(encoded[19]).toBe(1);
    expect(encoded[29]).toBe(1);
  });

  it("pads indices 30-35 with zeros", () => {
    expect(encodeContext("the").slice(30)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("throws on wrong length", () => {
    expect(() => encodeContext("th")).toThrow(Error);
    expect(() => encodeContext("then")).toThrow(Error);
  });

  it("throws on characters outside the alphabet", () => {
    expect(() => encodeContext("thz")).toThrow(Error);
    expect(() => encodeContext("THE")).toThrow(Error);
  });
});

describe("symbolName", () => {
  it("returns the character for an index", () => {
    expect(symbolName(0)).toBe("e");
    expect(symbolName(8)).toBe("r");
  });

  it("shows the space as a visible symbol", () => {
    expect(symbolName(9)).toBe("␣");
  });
});

describe("LettersInputWidget", () => {
  it("appends to container with three selects", () => {
    const container = makeContainer();
    const widget = new LettersInputWidget(container);
    expect(container.children).toHaveLength(1);
    expect(selectsOf(widget)).toHaveLength(3);
    for (const s of selectsOf(widget)) expect(s.options).toHaveLength(10);
  });

  it("defaults to the context 'the'", () => {
    const widget = new LettersInputWidget(makeContainer());
    expect(widget.getContext()).toBe("the");
    expect(widget.getValues()).toEqual(encodeContext("the"));
  });

  it("labels the space option", () => {
    const widget = new LettersInputWidget(makeContainer());
    const labels = [...selectsOf(widget)[0].options].map((o) => o.textContent);
    expect(labels).toContain("␣ (space)");
  });

  it("changing a select updates values and fires onChange", () => {
    const onChange = vi.fn();
    const widget = new LettersInputWidget(makeContainer(), { onChange });
    const [first] = selectsOf(widget);
    first.value = "a";
    first.dispatchEvent(new Event("change"));
    expect(widget.getContext()).toBe("ahe");
    expect(widget.getValues()).toEqual(encodeContext("ahe"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("setContext updates the selects", () => {
    const widget = new LettersInputWidget(makeContainer());
    widget.setContext("a r");
    expect(widget.getContext()).toBe("a r");
    expect(selectsOf(widget).map((s) => s.value)).toEqual(["a", " ", "r"]);
  });

  it("setContext rejects invalid input", () => {
    const widget = new LettersInputWidget(makeContainer());
    expect(() => widget.setContext("xyz")).toThrow(Error);
    expect(widget.getContext()).toBe("the");
  });

  it("append shifts left and fires onChange", () => {
    const listener = vi.fn();
    const widget = new LettersInputWidget(makeContainer());
    widget.onChange(listener);
    widget.append(" ");
    expect(widget.getContext()).toBe("he ");
    widget.append("a");
    expect(widget.getContext()).toBe("e a");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("append rejects symbols outside the alphabet", () => {
    const widget = new LettersInputWidget(makeContainer());
    expect(() => widget.append("z")).toThrow(Error);
    expect(() => widget.append("ab")).toThrow(Error);
  });

  it("destroy removes element", () => {
    const container = makeContainer();
    const widget = new LettersInputWidget(container);
    widget.destroy();
    expect(container.children).toHaveLength(0);
  });
});
