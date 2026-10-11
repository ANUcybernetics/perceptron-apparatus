export const LETTERS_ALPHABET = "etaoinshr ";

const CONTEXT_LENGTH = 3;

export function symbolName(index: number): string {
  const ch = LETTERS_ALPHABET[index];
  if (ch === undefined) throw new Error(`Symbol index out of range: ${index}`);
  return ch === " " ? "␣" : ch;
}

export function encodeContext(context: string): number[] {
  if (context.length !== CONTEXT_LENGTH) {
    throw new Error(`Context must be exactly ${CONTEXT_LENGTH} characters`);
  }
  const n = LETTERS_ALPHABET.length;
  const encoded = Array.from({ length: 36 }, () => 0);
  for (let pos = 0; pos < CONTEXT_LENGTH; pos++) {
    const idx = LETTERS_ALPHABET.indexOf(context[pos]);
    if (idx < 0) {
      throw new Error(`Character not in alphabet: "${context[pos]}"`);
    }
    encoded[pos * n + idx] = 1;
  }
  return encoded;
}

const POSITION_NAMES = ["Oldest", "Middle", "Most recent"];

export class LettersInputWidget {
  readonly element: HTMLElement;
  private readonly selects: HTMLSelectElement[] = [];
  private listeners: Array<(values: number[]) => void> = [];

  constructor(container: Element, opts: { onChange?: (values: number[]) => void } = {}) {
    if (opts.onChange) this.listeners.push(opts.onChange);

    this.element = document.createElement("fieldset");
    this.element.classList.add("pa-letters-input");
    this.element.style.display = "flex";
    this.element.style.gap = "12px";
    this.element.style.flexWrap = "wrap";

    const legend = document.createElement("legend");
    legend.textContent = "Previous three symbols";
    this.element.appendChild(legend);

    const defaultContext = "the";
    for (let i = 0; i < CONTEXT_LENGTH; i++) {
      const label = document.createElement("label");
      label.classList.add("pa-letters-slot");
      label.textContent = `${POSITION_NAMES[i]} `;
      const select = document.createElement("select");
      select.classList.add("pa-letters-select");
      for (let s = 0; s < LETTERS_ALPHABET.length; s++) {
        const opt = document.createElement("option");
        opt.value = LETTERS_ALPHABET[s];
        opt.textContent = LETTERS_ALPHABET[s] === " " ? "␣ (space)" : LETTERS_ALPHABET[s];
        select.appendChild(opt);
      }
      select.value = defaultContext[i];
      select.addEventListener("change", this.onUserChange);
      label.appendChild(select);
      this.selects.push(select);
      this.element.appendChild(label);
    }

    container.appendChild(this.element);
  }

  getContext(): string {
    return this.selects.map((s) => s.value).join("");
  }

  setContext(context: string): void {
    encodeContext(context); // validates
    for (let i = 0; i < CONTEXT_LENGTH; i++) this.selects[i].value = context[i];
    this.notify();
  }

  append(symbol: string): void {
    if (symbol.length !== 1 || !LETTERS_ALPHABET.includes(symbol)) {
      throw new Error(`Character not in alphabet: "${symbol}"`);
    }
    this.setContext(this.getContext().slice(1) + symbol);
  }

  getValues(): number[] {
    return encodeContext(this.getContext());
  }

  onChange(fn: (values: number[]) => void): void {
    this.listeners.push(fn);
  }

  destroy(): void {
    for (const s of this.selects) s.removeEventListener("change", this.onUserChange);
    this.element.remove();
  }

  private onUserChange = () => this.notify();

  private notify(): void {
    const vals = this.getValues();
    for (const fn of this.listeners) fn(vals);
  }
}
