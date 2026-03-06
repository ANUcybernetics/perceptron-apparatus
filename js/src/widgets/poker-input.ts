export interface Card {
  suit: number;
  rank: number;
}

const SUIT_NAMES = ["Hearts", "Spades", "Diamonds", "Clubs"];
const SUIT_SYMBOLS = ["\u2665", "\u2660", "\u2666", "\u2663"];
const RANK_NAMES = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K",
];

function encodeCard(card: Card): number[] {
  const suit = Array.from({ length: 4 }, (_, i) => (i === card.suit - 1 ? 1 : 0));
  const rank = card.rank === 1 ? 14 : card.rank;
  let bin: number[];
  if (rank >= 2 && rank <= 5) bin = [1, 0, 0];
  else if (rank >= 6 && rank <= 9) bin = [0, 1, 0];
  else bin = [0, 0, 1];
  return [...suit, ...bin];
}

export function encodeHand(cards: (Card | null)[]): number[] {
  const encoded: number[] = [];
  for (let i = 0; i < 5; i++) {
    const card = cards[i];
    if (card) {
      encoded.push(...encodeCard(card));
    } else {
      encoded.push(0, 0, 0, 0, 0, 0, 0);
    }
  }
  encoded.push(0);
  return encoded;
}

export class PokerInputWidget {
  readonly element: HTMLElement;
  private readonly cards: (Card | null)[] = [null, null, null, null, null];
  private readonly selectors: HTMLElement[] = [];
  private listeners: Array<(values: number[]) => void> = [];

  constructor(container: Element) {
    this.element = document.createElement("div");
    this.element.classList.add("pa-poker-input");
    this.element.setAttribute("role", "group");
    this.element.setAttribute("aria-label", "Poker hand selector");
    this.element.style.display = "flex";
    this.element.style.gap = "8px";
    this.element.style.flexWrap = "wrap";

    for (let i = 0; i < 5; i++) {
      const slot = this.createCardSlot(i);
      this.selectors.push(slot);
      this.element.appendChild(slot);
    }

    container.appendChild(this.element);
  }

  getCards(): (Card | null)[] {
    return [...this.cards];
  }

  setCards(cards: (Card | null)[]): void {
    for (let i = 0; i < 5; i++) {
      this.cards[i] = cards[i] ?? null;
      this.updateSlotDisplay(i);
    }
    this.notify();
  }

  getValues(): number[] {
    return encodeHand(this.cards);
  }

  clear(): void {
    this.setCards([null, null, null, null, null]);
  }

  onChange(fn: (values: number[]) => void): void {
    this.listeners.push(fn);
  }

  destroy(): void {
    this.element.remove();
  }

  private createCardSlot(index: number): HTMLElement {
    const slot = document.createElement("div");
    slot.classList.add("pa-poker-card-slot");
    slot.style.display = "flex";
    slot.style.flexDirection = "column";
    slot.style.gap = "4px";
    slot.style.alignItems = "center";

    const label = document.createElement("span");
    label.classList.add("pa-poker-card-label");
    label.textContent = `Card ${index + 1}`;
    label.style.fontSize = "12px";
    slot.appendChild(label);

    const suitSelect = document.createElement("select");
    suitSelect.classList.add("pa-poker-suit-select");
    suitSelect.setAttribute("aria-label", `Card ${index + 1} suit`);
    const suitBlank = document.createElement("option");
    suitBlank.value = "";
    suitBlank.textContent = "Suit";
    suitSelect.appendChild(suitBlank);
    for (let s = 0; s < 4; s++) {
      const opt = document.createElement("option");
      opt.value = String(s + 1);
      opt.textContent = `${SUIT_SYMBOLS[s]} ${SUIT_NAMES[s]}`;
      suitSelect.appendChild(opt);
    }

    const rankSelect = document.createElement("select");
    rankSelect.classList.add("pa-poker-rank-select");
    rankSelect.setAttribute("aria-label", `Card ${index + 1} rank`);
    const rankBlank = document.createElement("option");
    rankBlank.value = "";
    rankBlank.textContent = "Rank";
    rankSelect.appendChild(rankBlank);
    for (let r = 0; r < 13; r++) {
      const opt = document.createElement("option");
      opt.value = String(r + 1);
      opt.textContent = RANK_NAMES[r];
      rankSelect.appendChild(opt);
    }

    const onchange = () => {
      const suit = parseInt(suitSelect.value, 10);
      const rank = parseInt(rankSelect.value, 10);
      if (suit >= 1 && suit <= 4 && rank >= 1 && rank <= 13) {
        this.cards[index] = { suit, rank };
      } else {
        this.cards[index] = null;
      }
      this.notify();
    };

    suitSelect.addEventListener("change", onchange);
    rankSelect.addEventListener("change", onchange);

    slot.appendChild(suitSelect);
    slot.appendChild(rankSelect);

    return slot;
  }

  private updateSlotDisplay(index: number): void {
    const slot = this.selectors[index];
    const suitSelect = slot.querySelector(
      ".pa-poker-suit-select",
    ) as HTMLSelectElement;
    const rankSelect = slot.querySelector(
      ".pa-poker-rank-select",
    ) as HTMLSelectElement;

    const card = this.cards[index];
    suitSelect.value = card ? String(card.suit) : "";
    rankSelect.value = card ? String(card.rank) : "";
  }

  private notify(): void {
    const vals = this.getValues();
    for (const fn of this.listeners) fn(vals);
  }
}

export const POKER_HAND_NAMES = [
  "High card",
  "One pair",
  "Two pairs",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
  "Royal flush",
];
