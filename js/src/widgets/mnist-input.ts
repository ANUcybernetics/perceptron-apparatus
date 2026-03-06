export class MnistInputWidget {
  readonly element: HTMLElement;
  private readonly cells: HTMLElement[] = [];
  private readonly values: number[] = Array.from({ length: 36 }, () => 0);
  private listeners: Array<(values: number[]) => void> = [];
  private painting = false;
  private paintValue = 1;

  constructor(container: Element, opts: { cellSize?: number } = {}) {
    const cellSize = opts.cellSize ?? 48;

    this.element = document.createElement("div");
    this.element.classList.add("pa-mnist-grid");
    this.element.setAttribute("role", "grid");
    this.element.setAttribute("aria-label", "6x6 digit drawing grid");
    this.element.style.display = "grid";
    this.element.style.gridTemplateColumns = `repeat(6, ${cellSize}px)`;
    this.element.style.gridTemplateRows = `repeat(6, ${cellSize}px)`;
    this.element.style.gap = "1px";
    this.element.style.userSelect = "none";
    this.element.style.touchAction = "none";

    for (let i = 0; i < 36; i++) {
      const cell = document.createElement("div");
      cell.classList.add("pa-mnist-cell");
      cell.dataset.index = String(i);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute(
        "aria-label",
        `Row ${Math.floor(i / 6)}, column ${i % 6}`,
      );
      cell.style.width = `${cellSize}px`;
      cell.style.height = `${cellSize}px`;
      cell.style.border = "1px solid #ccc";
      cell.style.cursor = "crosshair";
      cell.style.boxSizing = "border-box";
      this.updateCellColor(cell, 0);
      this.cells.push(cell);
      this.element.appendChild(cell);
    }

    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    this.element.addEventListener("pointerup", this.onPointerUp);
    this.element.addEventListener("pointerleave", this.onPointerUp);
    this.element.addEventListener("contextmenu", (e) => e.preventDefault());

    container.appendChild(this.element);
  }

  getValues(): number[] {
    return [...this.values];
  }

  setValues(values: number[]): void {
    for (let i = 0; i < 36; i++) {
      this.values[i] = values[i] ?? 0;
      this.updateCellColor(this.cells[i], this.values[i]);
    }
  }

  clear(): void {
    this.setValues(Array.from({ length: 36 }, () => 0));
    this.notify();
  }

  onChange(fn: (values: number[]) => void): void {
    this.listeners.push(fn);
  }

  destroy(): void {
    this.element.removeEventListener("pointerdown", this.onPointerDown);
    this.element.removeEventListener("pointermove", this.onPointerMove);
    this.element.removeEventListener("pointerup", this.onPointerUp);
    this.element.removeEventListener("pointerleave", this.onPointerUp);
    this.element.remove();
  }

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    this.painting = true;
    this.paintValue = e.button === 2 || e.shiftKey ? 0 : 1;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    this.paintCell(e);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.painting) return;
    this.paintCell(e);
  };

  private onPointerUp = () => {
    this.painting = false;
  };

  private paintCell(e: PointerEvent): void {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || !("dataset" in target)) return;
    const el = target as HTMLElement;
    const idx = el.dataset.index;
    if (idx === undefined) return;
    const i = parseInt(idx, 10);
    if (this.values[i] !== this.paintValue) {
      this.values[i] = this.paintValue;
      this.updateCellColor(this.cells[i], this.paintValue);
      this.notify();
    }
  }

  private updateCellColor(cell: HTMLElement, value: number): void {
    const gray = Math.round(255 * (1 - value));
    cell.style.backgroundColor = `rgb(${gray},${gray},${gray})`;
  }

  private notify(): void {
    const vals = this.getValues();
    for (const fn of this.listeners) fn(vals);
  }
}
