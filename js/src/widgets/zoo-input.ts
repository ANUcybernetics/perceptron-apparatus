export const ZOO_TRAITS = [
  "hair",
  "feathers",
  "eggs",
  "milk",
  "airborne",
  "aquatic",
  "predator",
  "toothed",
  "backbone",
  "breathes",
  "venomous",
  "fins",
  "tail",
  "domestic",
  "catsize",
] as const;

export const ZOO_LEG_COUNTS = [0, 2, 4, 5, 6, 8] as const;

export const ZOO_CLASS_NAMES = [
  "mammal",
  "bird",
  "reptile",
  "fish",
  "amphibian",
  "insect",
  "invertebrate",
] as const;

export type ZooTrait = (typeof ZOO_TRAITS)[number];
export type LegCount = (typeof ZOO_LEG_COUNTS)[number];

export interface Animal {
  traits: Record<ZooTrait, boolean>;
  legs: LegCount;
}

export interface ZooExample {
  name: string;
  animal: Animal;
  className: (typeof ZOO_CLASS_NAMES)[number];
}

export function encodeAnimal(animal: Animal): number[] {
  const encoded: number[] = ZOO_TRAITS.map((t) => (animal.traits[t] ? 1 : 0));
  for (const n of ZOO_LEG_COUNTS) encoded.push(n === animal.legs ? 1 : 0);
  while (encoded.length < 36) encoded.push(0);
  return encoded;
}

function makeAnimal(traits: ZooTrait[], legs: LegCount): Animal {
  const record = Object.fromEntries(ZOO_TRAITS.map((t) => [t, traits.includes(t)])) as Record<
    ZooTrait,
    boolean
  >;
  return { traits: record, legs };
}

export const ZOO_EXAMPLES: readonly ZooExample[] = [
  {
    name: "dog",
    className: "mammal",
    animal: makeAnimal(
      [
        "hair",
        "milk",
        "predator",
        "toothed",
        "backbone",
        "breathes",
        "tail",
        "domestic",
        "catsize",
      ],
      4,
    ),
  },
  {
    name: "eagle",
    className: "bird",
    animal: makeAnimal(
      ["feathers", "eggs", "airborne", "predator", "backbone", "breathes", "tail", "catsize"],
      2,
    ),
  },
  {
    name: "snake",
    className: "reptile",
    animal: makeAnimal(
      ["eggs", "predator", "toothed", "backbone", "breathes", "venomous", "tail"],
      0,
    ),
  },
  {
    name: "shark",
    className: "fish",
    animal: makeAnimal(
      ["eggs", "aquatic", "predator", "toothed", "backbone", "fins", "tail", "catsize"],
      0,
    ),
  },
  {
    name: "frog",
    className: "amphibian",
    animal: makeAnimal(["eggs", "aquatic", "predator", "toothed", "backbone", "breathes"], 4),
  },
  {
    name: "bee",
    className: "insect",
    animal: makeAnimal(["eggs", "airborne", "breathes", "venomous", "domestic"], 6),
  },
  {
    name: "octopus",
    className: "invertebrate",
    animal: makeAnimal(["eggs", "aquatic", "predator", "catsize"], 8),
  },
];

export class ZooInputWidget {
  readonly element: HTMLElement;
  private readonly checkboxes = new Map<ZooTrait, HTMLInputElement>();
  private readonly legsSelect: HTMLSelectElement;
  private readonly exampleSelect: HTMLSelectElement;
  private listeners: Array<(values: number[]) => void> = [];

  constructor(container: Element, opts: { onChange?: (values: number[]) => void } = {}) {
    if (opts.onChange) this.listeners.push(opts.onChange);

    this.element = document.createElement("fieldset");
    this.element.classList.add("pa-zoo-input");
    this.element.style.display = "flex";
    this.element.style.flexDirection = "column";
    this.element.style.gap = "8px";

    const legend = document.createElement("legend");
    legend.textContent = "Animal features";
    this.element.appendChild(legend);

    const exampleLabel = document.createElement("label");
    exampleLabel.classList.add("pa-zoo-example-label");
    exampleLabel.textContent = "Example animal ";
    this.exampleSelect = document.createElement("select");
    this.exampleSelect.classList.add("pa-zoo-example-select");
    const blank = document.createElement("option");
    blank.value = "";
    blank.textContent = "Choose…";
    this.exampleSelect.appendChild(blank);
    for (const ex of ZOO_EXAMPLES) {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name;
      this.exampleSelect.appendChild(opt);
    }
    exampleLabel.appendChild(this.exampleSelect);
    this.element.appendChild(exampleLabel);

    const traits = document.createElement("div");
    traits.classList.add("pa-zoo-traits");
    traits.style.display = "flex";
    traits.style.flexWrap = "wrap";
    traits.style.gap = "4px 16px";
    for (const trait of ZOO_TRAITS) {
      const label = document.createElement("label");
      label.classList.add("pa-zoo-trait");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.name = trait;
      box.addEventListener("change", this.onUserChange);
      label.appendChild(box);
      label.appendChild(document.createTextNode(` ${trait}`));
      this.checkboxes.set(trait, box);
      traits.appendChild(label);
    }
    this.element.appendChild(traits);

    const legsLabel = document.createElement("label");
    legsLabel.classList.add("pa-zoo-legs-label");
    legsLabel.textContent = "Legs ";
    this.legsSelect = document.createElement("select");
    this.legsSelect.classList.add("pa-zoo-legs-select");
    for (const n of ZOO_LEG_COUNTS) {
      const opt = document.createElement("option");
      opt.value = String(n);
      opt.textContent = String(n);
      this.legsSelect.appendChild(opt);
    }
    legsLabel.appendChild(this.legsSelect);
    this.element.appendChild(legsLabel);

    this.legsSelect.addEventListener("change", this.onUserChange);
    this.exampleSelect.addEventListener("change", this.onExampleChange);

    container.appendChild(this.element);
  }

  getAnimal(): Animal {
    const traits = {} as Record<ZooTrait, boolean>;
    for (const t of ZOO_TRAITS) traits[t] = this.checkboxes.get(t)!.checked;
    return { traits, legs: parseInt(this.legsSelect.value, 10) as LegCount };
  }

  setAnimal(animal: Animal): void {
    this.showAnimal(animal);
    this.exampleSelect.value = "";
    this.notify();
  }

  getValues(): number[] {
    return encodeAnimal(this.getAnimal());
  }

  onChange(fn: (values: number[]) => void): void {
    this.listeners.push(fn);
  }

  destroy(): void {
    this.legsSelect.removeEventListener("change", this.onUserChange);
    this.exampleSelect.removeEventListener("change", this.onExampleChange);
    for (const box of this.checkboxes.values()) {
      box.removeEventListener("change", this.onUserChange);
    }
    this.element.remove();
  }

  private showAnimal(animal: Animal): void {
    for (const t of ZOO_TRAITS) this.checkboxes.get(t)!.checked = animal.traits[t];
    this.legsSelect.value = String(animal.legs);
  }

  private onUserChange = () => {
    this.exampleSelect.value = "";
    this.notify();
  };

  private onExampleChange = () => {
    const example = ZOO_EXAMPLES.find((e) => e.name === this.exampleSelect.value);
    if (!example) return;
    this.showAnimal(example.animal);
    this.notify();
  };

  private notify(): void {
    const vals = this.getValues();
    for (const fn of this.listeners) fn(vals);
  }
}
