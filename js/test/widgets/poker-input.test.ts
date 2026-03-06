import { describe, it, expect } from "vitest";
import {
  PokerInputWidget,
  encodeHand,
  POKER_HAND_NAMES,
  type Card,
} from "../../src/widgets/poker-input.js";

function makeContainer(): HTMLDivElement {
  return document.createElement("div");
}

describe("encodeHand", () => {
  it("produces 36 values", () => {
    const cards: Card[] = [
      { suit: 1, rank: 13 },
      { suit: 2, rank: 3 },
      { suit: 3, rank: 7 },
      { suit: 4, rank: 11 },
      { suit: 1, rank: 2 },
    ];
    const encoded = encodeHand(cards);
    expect(encoded).toHaveLength(36);
  });

  it("encodes suit as one-hot", () => {
    const cards: (Card | null)[] = [
      { suit: 1, rank: 5 },
      null,
      null,
      null,
      null,
    ];
    const encoded = encodeHand(cards);
    // First 4 values: suit one-hot for Hearts (suit 1)
    expect(encoded.slice(0, 4)).toEqual([1, 0, 0, 0]);
  });

  it("encodes Spades correctly", () => {
    const cards: (Card | null)[] = [
      { suit: 2, rank: 5 },
      null,
      null,
      null,
      null,
    ];
    const encoded = encodeHand(cards);
    expect(encoded.slice(0, 4)).toEqual([0, 1, 0, 0]);
  });

  it("encodes low rank (2-5) correctly", () => {
    const cards: (Card | null)[] = [
      { suit: 1, rank: 3 },
      null,
      null,
      null,
      null,
    ];
    const encoded = encodeHand(cards);
    expect(encoded.slice(4, 7)).toEqual([1, 0, 0]);
  });

  it("encodes mid rank (6-9) correctly", () => {
    const cards: (Card | null)[] = [
      { suit: 1, rank: 7 },
      null,
      null,
      null,
      null,
    ];
    const encoded = encodeHand(cards);
    expect(encoded.slice(4, 7)).toEqual([0, 1, 0]);
  });

  it("encodes high rank (10-K) correctly", () => {
    const cards: (Card | null)[] = [
      { suit: 1, rank: 12 },
      null,
      null,
      null,
      null,
    ];
    const encoded = encodeHand(cards);
    expect(encoded.slice(4, 7)).toEqual([0, 0, 1]);
  });

  it("encodes Ace as high rank", () => {
    const cards: (Card | null)[] = [
      { suit: 1, rank: 1 },
      null,
      null,
      null,
      null,
    ];
    const encoded = encodeHand(cards);
    // Ace remapped to 14 -> High bin
    expect(encoded.slice(4, 7)).toEqual([0, 0, 1]);
  });

  it("pads null cards with zeros", () => {
    const encoded = encodeHand([null, null, null, null, null]);
    expect(encoded).toEqual(Array.from({ length: 36 }, () => 0));
  });

  it("last value is always 0 (padding)", () => {
    const cards: Card[] = [
      { suit: 1, rank: 13 },
      { suit: 2, rank: 3 },
      { suit: 3, rank: 7 },
      { suit: 4, rank: 11 },
      { suit: 1, rank: 2 },
    ];
    const encoded = encodeHand(cards);
    expect(encoded[35]).toBe(0);
  });
});

describe("POKER_HAND_NAMES", () => {
  it("has 10 hand names", () => {
    expect(POKER_HAND_NAMES).toHaveLength(10);
  });

  it("starts with High card and ends with Royal flush", () => {
    expect(POKER_HAND_NAMES[0]).toBe("High card");
    expect(POKER_HAND_NAMES[9]).toBe("Royal flush");
  });
});

describe("PokerInputWidget", () => {
  it("creates 5 card slots", () => {
    const container = makeContainer();
    const widget = new PokerInputWidget(container);
    expect(widget.element.children).toHaveLength(5);
  });

  it("appends to container", () => {
    const container = makeContainer();
    new PokerInputWidget(container);
    expect(container.children).toHaveLength(1);
  });

  it("initialises with no cards selected", () => {
    const container = makeContainer();
    const widget = new PokerInputWidget(container);
    expect(widget.getCards()).toEqual([null, null, null, null, null]);
    expect(widget.getValues()).toEqual(
      Array.from({ length: 36 }, () => 0),
    );
  });

  it("setCards updates cards and encoding", () => {
    const container = makeContainer();
    const widget = new PokerInputWidget(container);
    widget.setCards([{ suit: 1, rank: 13 }, null, null, null, null]);
    const cards = widget.getCards();
    expect(cards[0]).toEqual({ suit: 1, rank: 13 });
    expect(cards[1]).toBeNull();

    const values = widget.getValues();
    // Hearts King: [1,0,0,0, 0,0,1] then 28 zeros + 1 padding
    expect(values.slice(0, 7)).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });

  it("clear resets all cards", () => {
    const container = makeContainer();
    const widget = new PokerInputWidget(container);
    widget.setCards([
      { suit: 1, rank: 1 },
      { suit: 2, rank: 2 },
      { suit: 3, rank: 3 },
      { suit: 4, rank: 4 },
      { suit: 1, rank: 5 },
    ]);
    widget.clear();
    expect(widget.getCards()).toEqual([null, null, null, null, null]);
  });

  it("destroy removes element", () => {
    const container = makeContainer();
    const widget = new PokerInputWidget(container);
    expect(container.children).toHaveLength(1);
    widget.destroy();
    expect(container.children).toHaveLength(0);
  });
});
