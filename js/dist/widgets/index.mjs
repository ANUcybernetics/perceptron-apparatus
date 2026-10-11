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
			.361,
			.984,
			.984,
			.984,
			0,
			0,
			0,
			.992,
			.992,
			.992,
			.122,
			0,
			1,
			.992,
			.992,
			.992,
			.992,
			0,
			0,
			.984,
			.984,
			.984,
			.984,
			0,
			0,
			0,
			.984,
			.443,
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
			0,
			.333,
			.11,
			0,
			0,
			0,
			.141,
			.988,
			0,
			0,
			0,
			0,
			.988,
			0,
			0,
			0,
			0,
			.98,
			.161,
			0,
			0,
			0,
			0,
			.98,
			0,
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
			.996,
			0,
			0,
			0,
			0,
			.2,
			.996,
			.671,
			.988,
			0,
			0,
			.122,
			.988,
			.98,
			.98,
			0,
			0,
			0,
			.988,
			.98,
			.98,
			0,
			0,
			0,
			0,
			0,
			.157,
			.624
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
			.314,
			.992,
			.384,
			0,
			0,
			.992,
			.992,
			.22,
			0,
			0,
			.922,
			.992,
			.992,
			.992,
			.941,
			0,
			.667,
			.992,
			.447,
			.992,
			.51,
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
			.98,
			.98,
			.98,
			.867,
			0,
			0,
			.871,
			0,
			.2,
			.988,
			.353,
			0,
			0,
			0,
			.91,
			.988,
			.157,
			0,
			0,
			0,
			0,
			.824,
			0
		]
	}
];
//#endregion
//#region src/widgets/weights.ts
const mnistWeights = {
	B: [
		[
			-.0840420052409172,
			-.1332234889268875,
			.06724315881729126,
			.0721232071518898,
			.13941682875156403,
			-.10765780508518219
		],
		[
			-.14931172132492065,
			-.2319524735212326,
			-.14937540888786316,
			.0642942488193512,
			-.20196443796157837,
			-.13974064588546753
		],
		[
			.04409770295023918,
			0,
			.17230336368083954,
			-.17960330843925476,
			-.17228512465953827,
			.1202782541513443
		],
		[
			-.13672879338264465,
			.19722336530685425,
			.022097347304224968,
			.11613595485687256,
			.24464577436447144,
			-.15451285243034363
		],
		[
			-.15809708833694458,
			-.22032855451107025,
			.21688175201416016,
			-.025900352746248245,
			.04151980206370354,
			.10911542177200317
		],
		[
			0,
			.06250385195016861,
			-.02142401784658432,
			-.08288194984197617,
			-.20563071966171265,
			-.05009007826447487
		],
		[
			-.024990832433104515,
			0,
			-.08574847131967545,
			0,
			.11357257515192032,
			.15204395353794098
		],
		[
			-.9416853189468384,
			.5299679040908813,
			-.33103856444358826,
			-.30679529905319214,
			-.07055012136697769,
			-.17409124970436096
		],
		[
			-.1502474695444107,
			1.0816833972930908,
			-.34923040866851807,
			-.6788114309310913,
			.6467554569244385,
			-.14743953943252563
		],
		[
			.21205031871795654,
			.6473329663276672,
			.055041056126356125,
			-2.0193769931793213,
			.38764137029647827,
			-.40912309288978577
		],
		[
			.4053819477558136,
			.27146396040916443,
			.28077059984207153,
			-.9049463272094727,
			.4840852618217468,
			.06222589313983917
		],
		[
			.6635615229606628,
			0,
			.11984525620937347,
			-.9256584644317627,
			-.09126295894384384,
			1.5948173999786377
		],
		[
			0,
			.45375579595565796,
			.08942444622516632,
			.5769505500793457,
			-.1230374425649643,
			-.3030640482902527
		],
		[
			-.21775974333286285,
			1.1202282905578613,
			.032610632479190826,
			.3087569773197174,
			-.15536266565322876,
			-.461855411529541
		],
		[
			.5321034789085388,
			.1736200898885727,
			.20661911368370056,
			.7703394889831543,
			.31528833508491516,
			.14920851588249207
		],
		[
			.11996078491210938,
			-.07872220128774643,
			-.17838752269744873,
			.22687003016471863,
			-.2885880470275879,
			-.53610759973526
		],
		[
			.1078830435872078,
			.4738239645957947,
			-.07917478680610657,
			.6151777505874634,
			-.4532760977745056,
			-.2070396989583969
		],
		[
			1.3166916370391846,
			1.24411141872406,
			.542356014251709,
			-.03294025734066963,
			-.21645674109458923,
			.9149464964866638
		],
		[
			.35833942890167236,
			.08690151572227478,
			.14577829837799072,
			-.3915460407733917,
			-.4677937626838684,
			.3464166820049286
		],
		[
			.04632827267050743,
			-1.9845505952835083,
			-.9132975935935974,
			.39845359325408936,
			-.6056543588638306,
			.3312115967273712
		],
		[
			.30109545588493347,
			-.8160567283630371,
			-1.0095008611679077,
			0,
			.18621207773685455,
			.6563510298728943
		],
		[
			-.6930211186408997,
			.059483449906110764,
			1.3726060390472412,
			-.3183457553386688,
			.1386965811252594,
			.5945143699645996
		],
		[
			-.3926082253456116,
			-.08812817931175232,
			-.5015048384666443,
			.6489448547363281,
			.15135346353054047,
			.3907148241996765
		],
		[
			.4920960068702698,
			-2.0738186836242676,
			-.9719061851501465,
			-.23897062242031097,
			.6338915228843689,
			0
		],
		[
			-.02194264344871044,
			-.5282604098320007,
			.15468987822532654,
			-.4241146743297577,
			.25773918628692627,
			.28393563628196716
		],
		[
			.4440965950489044,
			1.1443023681640625,
			-1.6055903434753418,
			-.6781386733055115,
			-.09756475687026978,
			-1.0952837467193604
		],
		[
			.7486460208892822,
			-.06949057430028915,
			.48519185185432434,
			-.15303976833820343,
			1.1505155563354492,
			-.0492410734295845
		],
		[
			-.0694485753774643,
			-.1349119246006012,
			.6071465611457825,
			.6316649317741394,
			.8207855224609375,
			.10039161890745163
		],
		[
			.15277867019176483,
			.20236223936080933,
			-.6892791986465454,
			-.21550382673740387,
			.42171862721443176,
			.09557082504034042
		],
		[
			.35684525966644287,
			1.1251846551895142,
			.31300345063209534,
			-1.310487151145935,
			.5953507423400879,
			-.25114086270332336
		],
		[
			0,
			.185796320438385,
			.022527549415826797,
			.05704089254140854,
			.1688486635684967,
			-.1530679315328598
		],
		[
			-.23406407237052917,
			.9848207831382751,
			-.2191101312637329,
			-.39257967472076416,
			-.46611905097961426,
			-.7602736353874207
		],
		[
			.35379210114479065,
			.9310585260391235,
			.10664793848991394,
			-.11108788102865219,
			-1.0678688287734985,
			-.18776462972164154
		],
		[
			.502514660358429,
			.73175048828125,
			.23007544875144958,
			.3037512004375458,
			-1.5459543466567993,
			.3688344955444336
		],
		[
			-.03005530871450901,
			.25515317916870117,
			.4582920968532562,
			.168656125664711,
			-.642998218536377,
			.4272099435329437
		],
		[
			-.24335217475891113,
			.2558833062648773,
			.06625095009803772,
			.24917812645435333,
			.0913323163986206,
			.2810778319835663
		]
	],
	D: [
		[
			.9975922107696533,
			0,
			.07983282953500748,
			0,
			.18875424563884735,
			.44711318612098694,
			.11489097774028778,
			.12601596117019653,
			.44966012239456177,
			.06966236978769302
		],
		[
			.024514634162187576,
			0,
			.439286470413208,
			.6073259711265564,
			0,
			.2959970235824585,
			0,
			.21742308139801025,
			.26359808444976807,
			0
		],
		[
			0,
			.8174377679824829,
			.18172836303710938,
			0,
			.03328504413366318,
			.0990266501903534,
			.020911240950226784,
			.16039763391017914,
			.42566144466400146,
			.16768337786197662
		],
		[
			0,
			0,
			.1278490424156189,
			.10375254601240158,
			.4320700764656067,
			.16844746470451355,
			0,
			.8077505826950073,
			.0804993137717247,
			.6217131018638611
		],
		[
			0,
			0,
			.56441730260849,
			.08609487861394882,
			.26099565625190735,
			.028953632339835167,
			.652127742767334,
			0,
			0,
			.10308178514242172
		],
		[
			0,
			0,
			0,
			.4382765293121338,
			.774095892906189,
			.6209017634391785,
			.47089967131614685,
			0,
			.47411850094795227,
			.6361900568008423
		]
	]
};
const zooWeights = {
	B: [
		[
			-.748577356338501,
			-.25585803389549255,
			.5043228268623352,
			-.5527157783508301,
			-1.6496071815490723,
			1.0142968893051147
		],
		[
			-.8531429767608643,
			-.4720587730407715,
			-.3656786382198334,
			.869556188583374,
			-.8998729586601257,
			-.9563547968864441
		],
		[
			.7069976925849915,
			1.2228232622146606,
			-.627845823764801,
			.5335828065872192,
			.06482968479394913,
			-.3075946867465973
		],
		[
			-1.555429458618164,
			-.2754126489162445,
			.9583297371864319,
			-.5416080355644226,
			-1.844001293182373,
			1.0851694345474243
		],
		[
			-.3600151240825653,
			-.6076483726501465,
			0,
			.8016173839569092,
			-.7504933476448059,
			1.1173712015151978
		],
		[
			-.3539731502532959,
			1.7592774629592896,
			-.914940595626831,
			.3957403600215912,
			.7760295867919922,
			-.32620012760162354
		],
		[
			.11739515513181686,
			.9280568361282349,
			.2072521299123764,
			.09823855012655258,
			.12070736289024353,
			-.058755453675985336
		],
		[
			.27645808458328247,
			-.9535873532295227,
			.48293671011924744,
			-.2657313346862793,
			.9620048403739929,
			.37458112835884094
		],
		[
			.4874442219734192,
			-1.0210634469985962,
			.6274458765983582,
			.6894770264625549,
			.8823499083518982,
			-.2799006700515747
		],
		[
			-.76128089427948,
			.584751546382904,
			.4999430477619171,
			.09103253483772278,
			.7566147446632385,
			1.2124994993209839
		],
		[
			.27917179465293884,
			.4390508830547333,
			.2988922894001007,
			-.7310380339622498,
			.3203074634075165,
			-.1636880785226822
		],
		[
			.9331203103065491,
			-1.371131420135498,
			-.8006846904754639,
			.5821630954742432,
			-2.2130017280578613,
			.8386712670326233
		],
		[
			.8636013865470886,
			-1.0617350339889526,
			.7289059162139893,
			.5066943168640137,
			-.051344454288482666,
			-.5497834086418152
		],
		[
			.3212805688381195,
			.07506478577852249,
			.07647840678691864,
			.20676182210445404,
			-.8605276942253113,
			.13790111243724823
		],
		[
			.5626269578933716,
			-.8151174187660217,
			.664052426815033,
			.3685988485813141,
			-.33455538749694824,
			.2745189964771271
		],
		[
			1.12715744972229,
			.6144293546676636,
			.3362465500831604,
			-.6373618841171265,
			-.5578724145889282,
			-.23987670242786407
		],
		[
			-.7252067923545837,
			-.29455626010894775,
			.09470734745264053,
			.7437004446983337,
			-.8138200640678406,
			-.3522074520587921
		],
		[
			-.024955708533525467,
			.596572756767273,
			.25033286213874817,
			-.7645323276519775,
			1.1171562671661377,
			-.21919642388820648
		],
		[
			.382734090089798,
			.8115095496177673,
			.05994544178247452,
			-.3636658489704132,
			-.6558762788772583,
			.07676011323928833
		],
		[
			.1240144744515419,
			-.1868511140346527,
			-.6336091756820679,
			-.5944796800613403,
			-1.0069018602371216,
			1.963427186012268
		],
		[
			.4496214985847473,
			1.904959797859192,
			-.865936279296875,
			-.201813742518425,
			-1.1452821493148804,
			-.6589643955230713
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
			0,
			0,
			.3121718764305115,
			.6183604001998901,
			0,
			0,
			.2628989517688751,
			0,
			0,
			0
		],
		[
			0,
			0,
			0,
			0,
			.38723355531692505,
			.20428672432899475,
			.7703617811203003,
			0,
			0,
			0
		],
		[
			.7779911160469055,
			.20502164959907532,
			.5501610636711121,
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
			.6548818945884705,
			0,
			.2516947090625763,
			.05911039561033249,
			0,
			0,
			0,
			0,
			0
		],
		[
			0,
			0,
			.407087504863739,
			0,
			.623639702796936,
			0,
			0,
			0,
			0,
			0
		],
		[
			.3710872232913971,
			0,
			0,
			0,
			0,
			.6714776754379272,
			0,
			0,
			0,
			0
		]
	]
};
const lettersWeights = {
	B: [
		[
			.2916230857372284,
			.5800091028213501,
			.7559055089950562,
			-.08054803311824799,
			.43737879395484924,
			.0569688081741333
		],
		[
			.8756206631660461,
			.5222907662391663,
			.8578954339027405,
			.39531901478767395,
			-.2125054895877838,
			-.06261701136827469
		],
		[
			.5705602765083313,
			.8039433360099792,
			.9183467626571655,
			.06911228597164154,
			.4368255138397217,
			.15177473425865173
		],
		[
			1.143859624862671,
			.763342559337616,
			.9023235440254211,
			.15447552502155304,
			.6063313484191895,
			.4898533821105957
		],
		[
			.3856680393218994,
			1.0325560569763184,
			.7300296425819397,
			.2867202162742615,
			.9247070550918579,
			-.576715350151062
		],
		[
			.4711786210536957,
			.35111403465270996,
			.6052330136299133,
			-.23576687276363373,
			.6121132373809814,
			.4797585904598236
		],
		[
			-.3417230546474457,
			.631766676902771,
			1.0851140022277832,
			-.06539107859134674,
			.5604180097579956,
			-.4219146966934204
		],
		[
			1.4638174772262573,
			-.08531365543603897,
			-.3577652871608734,
			-.13455353677272797,
			.9866349101066589,
			.1627119928598404
		],
		[
			.25030845403671265,
			.48046913743019104,
			.8340595364570618,
			0,
			.06321723014116287,
			-.04112080857157707
		],
		[
			.5157069563865662,
			-.6449413299560547,
			-.1302771419286728,
			.4898010194301605,
			.5568217039108276,
			.5118004679679871
		],
		[
			-.18943382799625397,
			.5726537108421326,
			.783221423625946,
			-.5673114061355591,
			1.561429738998413,
			-1.8897993564605713
		],
		[
			.9692453145980835,
			.11138974875211716,
			-.15302538871765137,
			-1.73783278465271,
			.7396182417869568,
			-1.320160984992981
		],
		[
			.7348519563674927,
			.04451284557580948,
			.8099390864372253,
			-.7358652353286743,
			1.39607572555542,
			.261458158493042
		],
		[
			.6108725666999817,
			.4528365433216095,
			.1164366826415062,
			-.301821231842041,
			-.26125970482826233,
			1.6300336122512817
		],
		[
			.3794213533401489,
			2.3567447662353516,
			1.3101518154144287,
			-1.4318275451660156,
			1.2244566679000854,
			-.12885329127311707
		],
		[
			1.3826535940170288,
			0,
			1.5603992938995361,
			0,
			.5715331435203552,
			-.3409145772457123
		],
		[
			1.8862378597259521,
			-.17090953886508942,
			.05082330107688904,
			-.26784515380859375,
			.3362533748149872,
			-.5477318167686462
		],
		[
			.0915529802441597,
			-.02921295166015625,
			1.683833360671997,
			-1.9153887033462524,
			.6888803839683533,
			1.7105209827423096
		],
		[
			1.6837379932403564,
			-.4870316982269287,
			.40505531430244446,
			-.3440224528312683,
			.7366604804992676,
			.6878984570503235
		],
		[
			.1029108390212059,
			-.05475480481982231,
			-.3805413246154785,
			1.7258517742156982,
			-.6614209413528442,
			-.3981950283050537
		],
		[
			-.6343711614608765,
			.5702443718910217,
			-4.261693477630615,
			-2.679043769836426,
			-.17106229066848755,
			-.0414438359439373
		],
		[
			.8717193007469177,
			-3.882580518722534,
			-.9831601977348328,
			.6708536148071289,
			-.13592949509620667,
			1.0340733528137207
		],
		[
			-1.7356367111206055,
			.5681095123291016,
			.38825759291648865,
			-3.0192201137542725,
			1.9886807203292847,
			-2.688286066055298
		],
		[
			-.15460851788520813,
			2.120964288711548,
			.27969881892204285,
			.8499007225036621,
			1.2433381080627441,
			-.9984437823295593
		],
		[
			-3.728286027908325,
			.6510987281799316,
			.5674561262130737,
			-2.910513401031494,
			1.5639028549194336,
			-2.8255910873413086
		],
		[
			2.801330327987671,
			-.6987897753715515,
			-.1336730718612671,
			.6046136617660522,
			2.451935291290283,
			-1.4460805654525757
		],
		[
			1.7829525470733643,
			-.6445045471191406,
			.1186152771115303,
			-.08089733123779297,
			.2570711076259613,
			.9573265910148621
		],
		[
			2.274644136428833,
			-1.636467695236206,
			-1.8747628927230835,
			-2.5550615787506104,
			-1.5706157684326172,
			-.04034626856446266
		],
		[
			2.203719139099121,
			-.18151071667671204,
			-.8623207211494446,
			-2.2545583248138428,
			.4808087646961212,
			-.8395403623580933
		],
		[
			-3.1499180793762207,
			-1.3753726482391357,
			1.3671562671661377,
			.06583212316036224,
			-3.6875669956207275,
			-2.5108489990234375
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
			.5890017151832581,
			.13896673917770386,
			.4062124192714691,
			.2264966368675232,
			.3595390319824219,
			0,
			0,
			.12226967513561249,
			0,
			.31665048003196716
		],
		[
			0,
			.46000418066978455,
			0,
			0,
			.22794166207313538,
			.7991786003112793,
			.2439003735780716,
			0,
			.3929080665111542,
			.7028297781944275
		],
		[
			0,
			.4538523852825165,
			.3477977216243744,
			.18603625893592834,
			.3856793940067291,
			.2386806756258011,
			.3287356495857239,
			.3413032293319702,
			0,
			0
		],
		[
			.1369353085756302,
			.28463175892829895,
			0,
			.756594717502594,
			.10945148766040802,
			.24752509593963623,
			0,
			.7821500897407532,
			.33337074518203735,
			0
		],
		[
			.10058455914258957,
			.3490906357765198,
			0,
			.28461840748786926,
			0,
			.18458077311515808,
			.5216128826141357,
			0,
			.5084458589553833,
			.5043249726295471
		],
		[
			0,
			0,
			.07454229891300201,
			.025253554806113243,
			.2270836979150772,
			0,
			.1730235368013382,
			.4459582567214966,
			.5156923532485962,
			.5620794296264648
		]
	]
};
//#endregion
export { ComputationAnimator, LETTERS_ALPHABET, LettersInputWidget, MnistInputWidget, ZOO_CLASS_NAMES, ZOO_EXAMPLES, ZOO_LEG_COUNTS, ZOO_TRAITS, ZooInputWidget, computeTrace, encodeAnimal, encodeContext, lettersWeights, mnistWeights, sampleDigits, symbolName, traceResult, zooWeights };
