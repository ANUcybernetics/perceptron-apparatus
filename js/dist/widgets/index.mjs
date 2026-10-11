//#region src/widgets/trace.ts
function slideRuleAngle(absValue) {
	if (absValue <= 0) return 0;
	const mantissa = absValue / 10 ** Math.floor(Math.log10(absValue));
	return Math.log10(mantissa) / Math.log10(10) * 360;
}
function computeTrace(inputs, weights) {
	const nInput = weights.B.length;
	const nHidden = weights.B[0].length;
	const nOutput = weights.D[0].length;
	const steps = [];
	for (let i = 0; i < inputs.length; i++) steps.push({
		type: "set-input",
		slider: `A${i}`,
		value: inputs[i]
	});
	const hidden = Array.from({ length: nHidden }, () => 0);
	for (let j = 0; j < nHidden; j++) {
		let acc = 0;
		for (let i = 0; i < nInput; i++) {
			const inputValue = inputs[i];
			const weightValue = weights.B[i][j];
			const product = inputValue * weightValue;
			acc += product;
			const absInput = Math.abs(inputValue);
			const productSign = Math.sign(inputValue) * Math.sign(weightValue) >= 0 ? 1 : -1;
			steps.push({
				type: "multiply-accumulate",
				target: `C${j}`,
				inputSlider: `A${i}`,
				inputValue,
				weightSlider: `B${j}-${i}`,
				weightValue,
				product,
				accumulator: acc,
				logRingAngle: slideRuleAngle(absInput),
				productSign
			});
		}
		const post = Math.max(0, acc);
		steps.push({
			type: "relu",
			neuron: `C${j}`,
			pre: acc,
			post
		});
		hidden[j] = post;
	}
	const output = Array.from({ length: nOutput }, () => 0);
	for (let k = 0; k < nOutput; k++) {
		let acc = 0;
		for (let j = 0; j < nHidden; j++) {
			const inputValue = hidden[j];
			const weightValue = weights.D[j][k];
			const product = inputValue * weightValue;
			acc += product;
			const absInput = Math.abs(inputValue);
			const productSign = Math.sign(inputValue) * Math.sign(weightValue) >= 0 ? 1 : -1;
			steps.push({
				type: "multiply-accumulate",
				target: `E${k}`,
				inputSlider: `C${j}`,
				inputValue,
				weightSlider: `D${k}-${j}`,
				weightValue,
				product,
				accumulator: acc,
				logRingAngle: slideRuleAngle(absInput),
				productSign
			});
		}
		output[k] = acc;
	}
	let prediction = 0;
	for (let k = 1; k < nOutput; k++) if (output[k] > output[prediction]) prediction = k;
	steps.push({
		type: "argmax",
		prediction,
		values: [...output]
	});
	return steps;
}
function traceResult(steps) {
	const last = steps[steps.length - 1];
	if (!last || last.type !== "argmax") throw new Error("Trace does not end with argmax step");
	return {
		hidden: steps.filter((s) => s.type === "relu").map((s) => s.post),
		output: last.values,
		prediction: last.prediction
	};
}
//#endregion
//#region src/widgets/animator.ts
var ComputationAnimator = class {
	apparatus;
	weights;
	nInput;
	nHidden;
	nOutput;
	constructor(apparatus, weights) {
		this.apparatus = apparatus;
		this.weights = weights;
		this.nInput = weights.B.length;
		this.nHidden = weights.B[0].length;
		this.nOutput = weights.D[0].length;
	}
	async compute(inputs, opts = {}) {
		const { mode = "step", stepDuration = 100, signal, onStep } = opts;
		const animate = mode !== "fast";
		const perMultiply = mode === "step";
		const animOpts = { duration: animate ? stepDuration : 0 };
		const trace = computeTrace(inputs, this.weights);
		const macSteps = trace.filter((s) => s.type === "multiply-accumulate");
		const totalSteps = perMultiply ? this.nInput * this.nHidden + this.nHidden * this.nOutput : this.nHidden + this.nOutput;
		let currentStep = 0;
		const emit = (phase, description, step) => {
			onStep?.({
				phase,
				description,
				progress: currentStep / totalSteps,
				step
			});
		};
		signal?.throwIfAborted();
		emit("weights", "Setting weight sliders");
		await this.setWeights(signal);
		emit("input", "Setting input sliders");
		await this.setInputs(inputs, animOpts, signal);
		const hidden = Array.from({ length: this.nHidden }, () => 0);
		let macIndex = 0;
		for (let j = 0; j < this.nHidden; j++) {
			let acc = 0;
			for (let i = 0; i < this.nInput; i++) {
				signal?.throwIfAborted();
				const mac = macSteps[macIndex++];
				acc = mac.accumulator;
				if (perMultiply) {
					currentStep++;
					emit("hidden", `C${j} += A${i} × B${i},${j}`, mac);
					await Promise.all([
						this.apparatus.setLogRingRotation(mac.logRingAngle, animOpts),
						this.apparatus.setSlider(`C${j}`, Math.max(0, acc), animOpts),
						this.apparatus.setSlideRuleMarkers?.(mac, animOpts)
					]);
				}
			}
			hidden[j] = Math.max(0, acc);
			if (!perMultiply) {
				currentStep++;
				if (animate) {
					emit("hidden", `Hidden neuron ${j}: ${hidden[j].toFixed(2)}`);
					await this.apparatus.setSlider(`C${j}`, hidden[j], animOpts);
				} else await this.apparatus.setSlider(`C${j}`, hidden[j], { duration: 0 });
			}
		}
		const output = Array.from({ length: this.nOutput }, () => 0);
		for (let k = 0; k < this.nOutput; k++) {
			let acc = 0;
			for (let j = 0; j < this.nHidden; j++) {
				signal?.throwIfAborted();
				const mac = macSteps[macIndex++];
				acc = mac.accumulator;
				if (perMultiply) {
					currentStep++;
					emit("output", `E${k} += C${j} × D${j},${k}`, mac);
					await Promise.all([
						this.apparatus.setLogRingRotation(mac.logRingAngle, animOpts),
						this.apparatus.setSlider(`E${k}`, acc, animOpts),
						this.apparatus.setSlideRuleMarkers?.(mac, animOpts)
					]);
				}
			}
			output[k] = acc;
			if (!perMultiply) {
				currentStep++;
				if (animate) {
					emit("output", `Output ${k}: ${output[k].toFixed(2)}`);
					await this.apparatus.setSlider(`E${k}`, output[k], animOpts);
				} else await this.apparatus.setSlider(`E${k}`, output[k], { duration: 0 });
			}
		}
		let prediction = 0;
		for (let k = 1; k < this.nOutput; k++) if (output[k] > output[prediction]) prediction = k;
		const argmaxStep = trace[trace.length - 1];
		emit("output", `Prediction: ${prediction}`, argmaxStep);
		this.apparatus.clearSlideRuleMarkers?.();
		return {
			hidden,
			output,
			prediction
		};
	}
	async setWeights(signal) {
		signal?.throwIfAborted();
		const values = {};
		for (let j = 0; j < this.nHidden; j++) for (let i = 0; i < this.nInput; i++) values[`B${j}-${i}`] = this.weights.B[i][j];
		for (let k = 0; k < this.nOutput; k++) for (let j = 0; j < this.nHidden; j++) values[`D${k}-${j}`] = this.weights.D[j][k];
		await this.apparatus.setSliders(values);
	}
	async setInputs(inputs, animOpts, signal) {
		signal?.throwIfAborted();
		const values = {};
		for (let i = 0; i < inputs.length; i++) values[`A${i}`] = inputs[i];
		await this.apparatus.setSliders(values, animOpts);
	}
};
//#endregion
//#region src/widgets/mnist-input.ts
var MnistInputWidget = class {
	element;
	cells = [];
	values = Array.from({ length: 36 }, () => 0);
	listeners = [];
	painting = false;
	paintValue = 1;
	constructor(container, opts = {}) {
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
			cell.setAttribute("aria-label", `Row ${Math.floor(i / 6)}, column ${i % 6}`);
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
	getValues() {
		return [...this.values];
	}
	setValues(values) {
		for (let i = 0; i < 36; i++) {
			this.values[i] = values[i] ?? 0;
			this.updateCellColor(this.cells[i], this.values[i]);
		}
	}
	clear() {
		this.setValues(Array.from({ length: 36 }, () => 0));
		this.notify();
	}
	onChange(fn) {
		this.listeners.push(fn);
	}
	destroy() {
		this.element.removeEventListener("pointerdown", this.onPointerDown);
		this.element.removeEventListener("pointermove", this.onPointerMove);
		this.element.removeEventListener("pointerup", this.onPointerUp);
		this.element.removeEventListener("pointerleave", this.onPointerUp);
		this.element.remove();
	}
	onPointerDown = (e) => {
		e.preventDefault();
		this.painting = true;
		this.paintValue = e.button === 2 || e.shiftKey ? 0 : 1;
		e.target.releasePointerCapture?.(e.pointerId);
		this.paintCell(e);
	};
	onPointerMove = (e) => {
		if (!this.painting) return;
		this.paintCell(e);
	};
	onPointerUp = () => {
		this.painting = false;
	};
	paintCell(e) {
		const target = document.elementFromPoint(e.clientX, e.clientY);
		if (!target || !("dataset" in target)) return;
		const idx = target.dataset.index;
		if (idx === void 0) return;
		const i = parseInt(idx, 10);
		if (this.values[i] !== this.paintValue) {
			this.values[i] = this.paintValue;
			this.updateCellColor(this.cells[i], this.paintValue);
			this.notify();
		}
	}
	updateCellColor(cell, value) {
		const gray = Math.round(255 * (1 - value));
		cell.style.backgroundColor = `rgb(${gray},${gray},${gray})`;
	}
	notify() {
		const vals = this.getValues();
		for (const fn of this.listeners) fn(vals);
	}
};
//#endregion
//#region src/widgets/zoo-input.ts
const ZOO_TRAITS = [
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
	"catsize"
];
const ZOO_LEG_COUNTS = [
	0,
	2,
	4,
	5,
	6,
	8
];
const ZOO_CLASS_NAMES = [
	"mammal",
	"bird",
	"reptile",
	"fish",
	"amphibian",
	"insect",
	"invertebrate"
];
function encodeAnimal(animal) {
	const encoded = ZOO_TRAITS.map((t) => animal.traits[t] ? 1 : 0);
	for (const n of ZOO_LEG_COUNTS) encoded.push(n === animal.legs ? 1 : 0);
	while (encoded.length < 36) encoded.push(0);
	return encoded;
}
function makeAnimal(traits, legs) {
	return {
		traits: Object.fromEntries(ZOO_TRAITS.map((t) => [t, traits.includes(t)])),
		legs
	};
}
const ZOO_EXAMPLES = [
	{
		name: "dog",
		className: "mammal",
		animal: makeAnimal([
			"hair",
			"milk",
			"predator",
			"toothed",
			"backbone",
			"breathes",
			"tail",
			"domestic",
			"catsize"
		], 4)
	},
	{
		name: "eagle",
		className: "bird",
		animal: makeAnimal([
			"feathers",
			"eggs",
			"airborne",
			"predator",
			"backbone",
			"breathes",
			"tail",
			"catsize"
		], 2)
	},
	{
		name: "snake",
		className: "reptile",
		animal: makeAnimal([
			"eggs",
			"predator",
			"toothed",
			"backbone",
			"breathes",
			"venomous",
			"tail"
		], 0)
	},
	{
		name: "shark",
		className: "fish",
		animal: makeAnimal([
			"eggs",
			"aquatic",
			"predator",
			"toothed",
			"backbone",
			"fins",
			"tail",
			"catsize"
		], 0)
	},
	{
		name: "frog",
		className: "amphibian",
		animal: makeAnimal([
			"eggs",
			"aquatic",
			"predator",
			"toothed",
			"backbone",
			"breathes"
		], 4)
	},
	{
		name: "bee",
		className: "insect",
		animal: makeAnimal([
			"eggs",
			"airborne",
			"breathes",
			"venomous",
			"domestic"
		], 6)
	},
	{
		name: "octopus",
		className: "invertebrate",
		animal: makeAnimal([
			"eggs",
			"aquatic",
			"predator",
			"catsize"
		], 8)
	}
];
var ZooInputWidget = class {
	element;
	checkboxes = /* @__PURE__ */ new Map();
	legsSelect;
	exampleSelect;
	listeners = [];
	constructor(container, opts = {}) {
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
	getAnimal() {
		const traits = {};
		for (const t of ZOO_TRAITS) traits[t] = this.checkboxes.get(t).checked;
		return {
			traits,
			legs: parseInt(this.legsSelect.value, 10)
		};
	}
	setAnimal(animal) {
		this.showAnimal(animal);
		this.exampleSelect.value = "";
		this.notify();
	}
	getValues() {
		return encodeAnimal(this.getAnimal());
	}
	onChange(fn) {
		this.listeners.push(fn);
	}
	destroy() {
		this.legsSelect.removeEventListener("change", this.onUserChange);
		this.exampleSelect.removeEventListener("change", this.onExampleChange);
		for (const box of this.checkboxes.values()) box.removeEventListener("change", this.onUserChange);
		this.element.remove();
	}
	showAnimal(animal) {
		for (const t of ZOO_TRAITS) this.checkboxes.get(t).checked = animal.traits[t];
		this.legsSelect.value = String(animal.legs);
	}
	onUserChange = () => {
		this.exampleSelect.value = "";
		this.notify();
	};
	onExampleChange = () => {
		const example = ZOO_EXAMPLES.find((e) => e.name === this.exampleSelect.value);
		if (!example) return;
		this.showAnimal(example.animal);
		this.notify();
	};
	notify() {
		const vals = this.getValues();
		for (const fn of this.listeners) fn(vals);
	}
};
//#endregion
//#region src/widgets/letters-input.ts
const LETTERS_ALPHABET = "etaoinshr ";
const CONTEXT_LENGTH = 3;
function symbolName(index) {
	const ch = LETTERS_ALPHABET[index];
	if (ch === void 0) throw new Error(`Symbol index out of range: ${index}`);
	return ch === " " ? "␣" : ch;
}
function encodeContext(context) {
	if (context.length !== CONTEXT_LENGTH) throw new Error(`Context must be exactly ${CONTEXT_LENGTH} characters`);
	const n = 10;
	const encoded = Array.from({ length: 36 }, () => 0);
	for (let pos = 0; pos < CONTEXT_LENGTH; pos++) {
		const idx = LETTERS_ALPHABET.indexOf(context[pos]);
		if (idx < 0) throw new Error(`Character not in alphabet: "${context[pos]}"`);
		encoded[pos * n + idx] = 1;
	}
	return encoded;
}
const POSITION_NAMES = [
	"Oldest",
	"Middle",
	"Most recent"
];
var LettersInputWidget = class {
	element;
	selects = [];
	listeners = [];
	constructor(container, opts = {}) {
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
			for (let s = 0; s < 10; s++) {
				const opt = document.createElement("option");
				opt.value = LETTERS_ALPHABET[s];
				opt.textContent = "etaoinshr "[s] === " " ? "␣ (space)" : LETTERS_ALPHABET[s];
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
	getContext() {
		return this.selects.map((s) => s.value).join("");
	}
	setContext(context) {
		encodeContext(context);
		for (let i = 0; i < CONTEXT_LENGTH; i++) this.selects[i].value = context[i];
		this.notify();
	}
	append(symbol) {
		if (symbol.length !== 1 || !"etaoinshr ".includes(symbol)) throw new Error(`Character not in alphabet: "${symbol}"`);
		this.setContext(this.getContext().slice(1) + symbol);
	}
	getValues() {
		return encodeContext(this.getContext());
	}
	onChange(fn) {
		this.listeners.push(fn);
	}
	destroy() {
		for (const s of this.selects) s.removeEventListener("change", this.onUserChange);
		this.element.remove();
	}
	onUserChange = () => this.notify();
	notify() {
		const vals = this.getValues();
		for (const fn of this.listeners) fn(vals);
	}
};
//#endregion
//#region src/widgets/sample-digits.ts
const sampleDigits = [
	{
		label: 0,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.988,
			.443,
			0,
			0,
			0,
			.322,
			0,
			.02,
			0,
			0,
			0,
			.965,
			0,
			0,
			.259,
			0,
			0,
			.345,
			0,
			.8,
			0,
			0,
			0,
			.412,
			.18,
			0,
			0
		]
	},
	{
		label: 1,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.502,
			0,
			0,
			0,
			0,
			0,
			.502,
			0,
			0,
			0,
			0,
			0,
			1,
			0,
			0,
			0,
			0,
			0,
			.502,
			0,
			0,
			0,
			0,
			0,
			.502,
			0,
			0
		]
	},
	{
		label: 2,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.404,
			.918,
			.4,
			0,
			0,
			0,
			0,
			0,
			.388,
			0,
			0,
			0,
			0,
			0,
			.608,
			0,
			0,
			0,
			.996,
			.996,
			.608,
			0,
			0,
			0,
			.376,
			0,
			.325,
			0
		]
	},
	{
		label: 3,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.071,
			.988,
			.188,
			0,
			0,
			0,
			0,
			0,
			.8,
			0,
			0,
			0,
			.125,
			.992,
			.675,
			0,
			0,
			0,
			0,
			0,
			.384,
			0,
			0,
			0,
			.988,
			.514,
			0,
			0
		]
	},
	{
		label: 4,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.659,
			0,
			0,
			0,
			0,
			0,
			.839,
			.416,
			.906,
			0,
			0,
			0,
			0,
			.812,
			0,
			0,
			0,
			0,
			0,
			.094,
			0,
			0
		]
	},
	{
		label: 5,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.773,
			.306,
			0,
			0,
			0,
			.824,
			.42,
			0,
			0,
			0,
			0,
			0,
			0,
			.529,
			0,
			0,
			0,
			.259,
			.992,
			0,
			0
		]
	},
	{
		label: 6,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.278,
			0,
			0,
			0,
			0,
			0,
			.557,
			0,
			0,
			0,
			0,
			.639,
			.608,
			.871,
			0,
			0,
			0,
			1,
			0,
			.608,
			0,
			0,
			0,
			0,
			0,
			0,
			0
		]
	},
	{
		label: 7,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.847,
			.961,
			.996,
			0,
			0,
			0,
			0,
			0,
			.294,
			0,
			0,
			0,
			0,
			.71,
			0,
			0,
			0,
			0,
			0,
			.584,
			0,
			0
		]
	},
	{
		label: 8,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.169,
			.408,
			0,
			0,
			0,
			.165,
			0,
			.576,
			0,
			0,
			0,
			0,
			.992,
			0,
			0,
			0,
			0,
			.271,
			0,
			.678,
			0,
			0,
			0,
			.055,
			.855,
			.055,
			0
		]
	},
	{
		label: 9,
		pixels: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			.373,
			.145,
			.039,
			0,
			0,
			0,
			.631,
			.875,
			.976,
			0,
			0,
			0,
			0,
			.647,
			0,
			0,
			0,
			0,
			0,
			.553,
			0,
			0
		]
	}
];
//#endregion
//#region src/widgets/weights.ts
const mnistWeights = {
	B: [
		[
			-.0397165,
			-.102823,
			-.161124,
			.490461,
			0,
			.125066
		],
		[
			-.161626,
			.0768379,
			.0240893,
			.283059,
			-.349239,
			.0356823
		],
		[
			.158086,
			0,
			.167115,
			.0820687,
			.165263,
			0
		],
		[
			-.0796269,
			-.071492,
			.49416,
			-.17506,
			.56771,
			-.253422
		],
		[
			.0631518,
			.0990379,
			.0695485,
			.473962,
			-.0281842,
			-.114472
		],
		[
			.035881,
			0,
			-.0545806,
			.244189,
			.0341188,
			-.195689
		],
		[
			.0919326,
			-.0770706,
			-.17424,
			.156157,
			.318315,
			.13538
		],
		[
			-.285293,
			-.301287,
			.236397,
			.170002,
			-.472852,
			-1.14374
		],
		[
			-.554507,
			-.817794,
			.455879,
			.145827,
			.320139,
			-.268021
		],
		[
			-1.49118,
			-.0714821,
			.21669,
			.115682,
			.215886,
			.210135
		],
		[
			-.545356,
			0,
			0,
			.249927,
			.386908,
			.156836
		],
		[
			.422667,
			.0611629,
			-1.3328,
			1.11285,
			.940094,
			.242728
		],
		[
			-.174061,
			.0357673,
			.417684,
			-.980355,
			.310002,
			.46575
		],
		[
			.169316,
			-.418285,
			.720348,
			-.0705657,
			-.570714,
			.425792
		],
		[
			.292978,
			-.769334,
			0,
			0,
			0,
			.408438
		],
		[
			.0413044,
			.157333,
			.0651794,
			.10682,
			-.0980158,
			.625183
		],
		[
			.445104,
			.0619977,
			.367631,
			-.0397368,
			-.636611,
			.54269
		],
		[
			-.317053,
			-.700556,
			-.494431,
			1.11513,
			-.528865,
			.413535
		],
		[
			-.0362813,
			-.0562376,
			-.0852247,
			1.27591,
			.223913,
			.0787551
		],
		[
			.513274,
			-.310618,
			-1.89835,
			-1.07235,
			-.18759,
			.180935
		],
		[
			.36854,
			-.752363,
			-.530145,
			-.112836,
			.399382,
			.218912
		],
		[
			-.0466859,
			.638883,
			-.0920178,
			.247562,
			.173622,
			-3.04762
		],
		[
			.551619,
			-.49878,
			0,
			-.0868772,
			.249263,
			-.421372
		],
		[
			-.154835,
			-.558886,
			-.796711,
			-2.04039,
			.534822,
			.437045
		],
		[
			.278911,
			.345714,
			-.371762,
			-.99589,
			0,
			-.241402
		],
		[
			-.8442,
			-.799557,
			.338288,
			-.138586,
			-.790078,
			.270928
		],
		[
			-.48897,
			-.266592,
			-.0592319,
			-.321435,
			.474104,
			.105343
		],
		[
			.30827,
			.169235,
			.16027,
			-.419518,
			.406451,
			-.543516
		],
		[
			-.177967,
			-.84088,
			-.0324874,
			.196388,
			.503154,
			.106463
		],
		[
			-1.59192,
			-.443928,
			.309982,
			.11811,
			.152178,
			0
		],
		[
			-.141941,
			0,
			.050652,
			-.348794,
			.240922,
			-.153189
		],
		[
			-.71491,
			.0486626,
			.429246,
			.0904401,
			-.58639,
			0
		],
		[
			-.168275,
			.0688809,
			.18631,
			.408191,
			-1.41955,
			.608425
		],
		[
			.132787,
			-.0642556,
			-.0280715,
			.630514,
			-1.65605,
			.276233
		],
		[
			.0947459,
			-.225287,
			-.180476,
			.265291,
			-1.04281,
			-.544189
		],
		[
			.233363,
			-.195416,
			.039163,
			-3.45959,
			-.942495,
			-1.92587
		]
	],
	D: [
		[
			0,
			0,
			0,
			.241195,
			1.3997,
			.649444,
			.123117,
			1.21384,
			.433091,
			1.48894
		],
		[
			0,
			2.87271,
			.0924853,
			.184793,
			.644427,
			.819296,
			.811376,
			.745438,
			1.16572,
			1.43827
		],
		[
			.0207011,
			.171151,
			2.134,
			1.71949,
			0,
			.240395,
			0,
			1.33755,
			1.1012,
			0
		],
		[
			0,
			0,
			0,
			.732985,
			.069113,
			.843342,
			0,
			0,
			.847377,
			.0426548
		],
		[
			.277891,
			0,
			.699055,
			.113265,
			.539048,
			.341382,
			1.16632,
			0,
			0,
			.154343
		],
		[
			1.32214,
			0,
			.0323359,
			.18706,
			.0467432,
			.493482,
			.200532,
			.587546,
			0,
			0
		]
	]
};
const zooWeights = {
	B: [
		[
			1.41394,
			-1.05318,
			-.501543,
			-.0679739,
			.416888,
			-.130722
		],
		[
			-.562297,
			-1.16571,
			-.14081,
			1.42635,
			-.622368,
			-.275245
		],
		[
			-1.04205,
			.289883,
			.751247,
			-.28797,
			.504413,
			.775538
		],
		[
			1.28622,
			-1.43644,
			-1.0412,
			.137631,
			.13461,
			-.164109
		],
		[
			.177704,
			-.860357,
			-.497767,
			.687611,
			1.41408,
			-1.03507
		],
		[
			.518961,
			-.43227,
			.524393,
			-.589458,
			-.951402,
			.89547
		],
		[
			0,
			.393267,
			-.479621,
			.141883,
			-.321917,
			.92578
		],
		[
			.777035,
			-.0326068,
			.802936,
			-.192929,
			-.579768,
			-1.29544
		],
		[
			-.145383,
			.10384,
			.149689,
			.443179,
			-.638385,
			-1.5608
		],
		[
			.390828,
			.0642287,
			-1.59363,
			.166415,
			.774526,
			-.0278011
		],
		[
			-.196823,
			.33591,
			-.963594,
			.0788832,
			.191073,
			.195027
		],
		[
			-.105141,
			-2.46278,
			1.29756,
			-.857384,
			-.635395,
			-.842436
		],
		[
			-.126664,
			.806387,
			.407833,
			.689018,
			-.718538,
			-.404805
		],
		[
			.527355,
			.03264,
			.344146,
			.507528,
			-.467357,
			-.146462
		],
		[
			.385508,
			.216442,
			.359022,
			.475637,
			.0868947,
			.0359661
		],
		[
			-.534559,
			.843571,
			.722192,
			.171366,
			-.189831,
			1.14353
		],
		[
			.415119,
			-1.16689,
			-.292616,
			1.25788,
			-.763331,
			-.381248
		],
		[
			.491155,
			.665343,
			-.99957,
			-.56302,
			-.314993,
			-.547828
		],
		[
			-.0755588,
			.364809,
			-.792458,
			-.0507328,
			.0397466,
			.448256
		],
		[
			-.440544,
			-.560928,
			-.729506,
			-.704298,
			1.69902,
			-.571447
		],
		[
			-.174207,
			-.396237,
			-.0612776,
			-.552671,
			.560688,
			1.90076
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		]
	],
	D: [
		[
			.924807,
			0,
			0,
			0,
			.497013,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			.669691,
			0,
			.444413,
			0,
			.114291,
			0,
			0,
			0
		],
		[
			0,
			0,
			.164969,
			.657399,
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			.219614,
			.725906,
			.31477,
			0,
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			.614711,
			.0905545,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0,
			1.03734,
			0,
			0,
			0
		]
	]
};
const lettersWeights = {
	B: [
		[
			-.535279,
			-.381852,
			-.534349,
			-.531368,
			.223036,
			-.131072
		],
		[
			-.21149,
			.322616,
			-.469,
			-.689536,
			-.603294,
			-.0416566
		],
		[
			-.279185,
			-.196623,
			-.624656,
			-1.35564,
			.0457907,
			-.11764
		],
		[
			.0394606,
			-.222538,
			-.500958,
			-1.47701,
			1.12985,
			-.10451
		],
		[
			.185567,
			-.215636,
			-.224705,
			-.762437,
			.246286,
			.209562
		],
		[
			-.354094,
			.0816232,
			-.294744,
			-1.69519,
			.674417,
			-.138057
		],
		[
			-.416032,
			.293611,
			-.553327,
			-1.02605,
			-.261229,
			0
		],
		[
			-.122216,
			-.340038,
			-.330823,
			.904404,
			.475432,
			-1.93051
		],
		[
			-.437443,
			-.129813,
			-.631754,
			-1.39512,
			-.422061,
			-.0821802
		],
		[
			.325178,
			.0826906,
			.51959,
			.600778,
			.311439,
			.30242
		],
		[
			-1.40441,
			.220135,
			-1.35501,
			-.770788,
			.261401,
			.746939
		],
		[
			-.43007,
			.0838797,
			-.850051,
			.170819,
			.326265,
			-1.9196
		],
		[
			-1.09776,
			-.204578,
			-2.13132,
			-1.25233,
			.160885,
			-1.53979
		],
		[
			-.829594,
			-.416981,
			-.587412,
			-1.30839,
			-.293673,
			1.06778
		],
		[
			-1.08784,
			-.111694,
			-2.15995,
			-1.08925,
			0,
			1.60752
		],
		[
			.93471,
			.616325,
			-.112472,
			.042475,
			-.527829,
			.0320672
		],
		[
			1.29187,
			-.0459515,
			-2.24399,
			-.336257,
			-.270366,
			-1.0068
		],
		[
			.250063,
			.977443,
			-.48604,
			.80609,
			1.03651,
			-.113895
		],
		[
			.471591,
			.337474,
			.158469,
			.108755,
			.267304,
			-.712622
		],
		[
			.0882146,
			-1.8922,
			1.17502,
			-2.22565,
			-2.45218,
			0
		],
		[
			-.911556,
			-2.72595,
			-2.12425,
			-.146956,
			.502485,
			-.343705
		],
		[
			-.309963,
			-1.9854,
			.895957,
			.142239,
			.600078,
			-1.5297
		],
		[
			-2.83198,
			-.102051,
			-2.34428,
			-.633366,
			-1.54837,
			.923671
		],
		[
			-2.86607,
			-.115981,
			-1.57609,
			-1.07916,
			.630303,
			.523381
		],
		[
			-2.81891,
			-.0647273,
			-2.2734,
			1.01712,
			-1.94453,
			1.33001
		],
		[
			1.64556,
			.319377,
			.777914,
			-.640501,
			.952964,
			-.994844
		],
		[
			.180181,
			.312541,
			.181971,
			-.982543,
			.864386,
			-1.22796
		],
		[
			1.71529,
			-1.16181,
			-2.11485,
			-.21974,
			-.81533,
			-.138868
		],
		[
			2.08901,
			-2.11947,
			-1.66362,
			-.508046,
			.566028,
			.0290938
		],
		[
			-3.06031,
			.869712,
			-.311449,
			-.628477,
			-2.51745,
			-2.4652
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			0,
			0
		]
	],
	D: [
		[
			.924892,
			.0502862,
			.525168,
			.502527,
			.608222,
			0,
			0,
			0,
			0,
			.0994979
		],
		[
			0,
			1.07715,
			.78415,
			.47965,
			.863233,
			.494079,
			.683309,
			.76958,
			0,
			0
		],
		[
			.171839,
			0,
			0,
			.952462,
			.152057,
			0,
			0,
			1.11026,
			0,
			0
		],
		[
			.708846,
			.0521493,
			1.12951,
			0,
			.458004,
			.447572,
			1.14537,
			0,
			1.32721,
			.0611202
		],
		[
			.383702,
			.256859,
			0,
			.0890577,
			.0543586,
			.151265,
			.154891,
			.0334456,
			.469529,
			1.20335
		],
		[
			.0281054,
			1.15648,
			0,
			0,
			0,
			1.15392,
			1.01641,
			0,
			.677624,
			1.19404
		]
	]
};
//#endregion
export { ComputationAnimator, LETTERS_ALPHABET, LettersInputWidget, MnistInputWidget, ZOO_CLASS_NAMES, ZOO_EXAMPLES, ZOO_LEG_COUNTS, ZOO_TRAITS, ZooInputWidget, computeTrace, encodeAnimal, encodeContext, lettersWeights, mnistWeights, sampleDigits, symbolName, traceResult, zooWeights };
