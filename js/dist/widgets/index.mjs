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
		const totalSteps = perMultiply ? this.nInput * this.nHidden + this.nHidden * this.nOutput : this.nHidden + this.nOutput;
		let currentStep = 0;
		const emit = (phase, description) => {
			onStep?.({
				phase,
				description,
				progress: currentStep / totalSteps
			});
		};
		signal?.throwIfAborted();
		emit("weights", "Setting weight sliders");
		await this.setWeights(signal);
		emit("input", "Setting input sliders");
		await this.setInputs(inputs, animOpts, signal);
		const hidden = Array.from({ length: this.nHidden }, () => 0);
		for (let j = 0; j < this.nHidden; j++) {
			let acc = 0;
			for (let i = 0; i < this.nInput; i++) {
				signal?.throwIfAborted();
				const product = inputs[i] * this.weights.B[i][j];
				acc += product;
				if (perMultiply) {
					currentStep++;
					emit("hidden", `C${j} += A${i} × B${i},${j}`);
					const logAngle = currentStep / totalSteps * 360;
					await Promise.all([this.apparatus.setLogRingRotation(logAngle, animOpts), this.apparatus.setSlider(`C${j}`, Math.max(0, acc), animOpts)]);
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
				const product = hidden[j] * this.weights.D[j][k];
				acc += product;
				if (perMultiply) {
					currentStep++;
					emit("output", `E${k} += C${j} × D${j},${k}`);
					const logAngle = currentStep / totalSteps * 360;
					await Promise.all([this.apparatus.setLogRingRotation(logAngle, animOpts), this.apparatus.setSlider(`E${k}`, acc, animOpts)]);
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
		emit("output", `Prediction: ${prediction}`);
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
//#region src/widgets/poker-input.ts
const SUIT_NAMES = [
	"Hearts",
	"Spades",
	"Diamonds",
	"Clubs"
];
const SUIT_SYMBOLS = [
	"♥",
	"♠",
	"♦",
	"♣"
];
const RANK_NAMES = [
	"A",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"10",
	"J",
	"Q",
	"K"
];
function encodeCard(card) {
	const suit = Array.from({ length: 4 }, (_, i) => i === card.suit - 1 ? 1 : 0);
	const rank = card.rank === 1 ? 14 : card.rank;
	let bin;
	if (rank >= 2 && rank <= 5) bin = [
		1,
		0,
		0
	];
	else if (rank >= 6 && rank <= 9) bin = [
		0,
		1,
		0
	];
	else bin = [
		0,
		0,
		1
	];
	return [...suit, ...bin];
}
function encodeHand(cards) {
	const encoded = [];
	for (let i = 0; i < 5; i++) {
		const card = cards[i];
		if (card) encoded.push(...encodeCard(card));
		else encoded.push(0, 0, 0, 0, 0, 0, 0);
	}
	encoded.push(0);
	return encoded;
}
var PokerInputWidget = class {
	element;
	cards = [
		null,
		null,
		null,
		null,
		null
	];
	selectors = [];
	listeners = [];
	constructor(container) {
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
	getCards() {
		return [...this.cards];
	}
	setCards(cards) {
		for (let i = 0; i < 5; i++) {
			this.cards[i] = cards[i] ?? null;
			this.updateSlotDisplay(i);
		}
		this.notify();
	}
	getValues() {
		return encodeHand(this.cards);
	}
	clear() {
		this.setCards([
			null,
			null,
			null,
			null,
			null
		]);
	}
	onChange(fn) {
		this.listeners.push(fn);
	}
	destroy() {
		this.element.remove();
	}
	createCardSlot(index) {
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
			if (suit >= 1 && suit <= 4 && rank >= 1 && rank <= 13) this.cards[index] = {
				suit,
				rank
			};
			else this.cards[index] = null;
			this.notify();
		};
		suitSelect.addEventListener("change", onchange);
		rankSelect.addEventListener("change", onchange);
		slot.appendChild(suitSelect);
		slot.appendChild(rankSelect);
		return slot;
	}
	updateSlotDisplay(index) {
		const slot = this.selectors[index];
		const suitSelect = slot.querySelector(".pa-poker-suit-select");
		const rankSelect = slot.querySelector(".pa-poker-rank-select");
		const card = this.cards[index];
		suitSelect.value = card ? String(card.suit) : "";
		rankSelect.value = card ? String(card.rank) : "";
	}
	notify() {
		const vals = this.getValues();
		for (const fn of this.listeners) fn(vals);
	}
};
const POKER_HAND_NAMES = [
	"High card",
	"One pair",
	"Two pairs",
	"Three of a kind",
	"Straight",
	"Flush",
	"Full house",
	"Four of a kind",
	"Straight flush",
	"Royal flush"
];
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
			.04590938193556123,
			.04530166314502861,
			-.029808968477382108,
			.01169841906671423,
			.05226156080893102,
			.050099543831691275
		],
		[
			-.04914401403329617,
			-.06380147393082163,
			-.03271129999237155,
			-.03065230187428583,
			-.03375210738437106,
			.06027694614690409
		],
		[
			-.024039966445737068,
			-.057997248956782224,
			-.016705749981534592,
			-.011660773296407592,
			.06053498813575784,
			.009814097106527383
		],
		[
			.027130175285888503,
			-.008493152941219636,
			-.0325607736961742,
			.040674540449250444,
			.0030407571918704577,
			-.011984293832020081
		],
		[
			-.031854949303537355,
			-.0013358218429565868,
			.013800752274222032,
			-.027526231936173855,
			.0018318634094075918,
			-.021894511768678918
		],
		[
			.06114368038393377,
			.004572108818685181,
			.012775609438133056,
			.005826171035798391,
			-.018327692658256872,
			-.043088382806671696
		],
		[
			.048123273388994234,
			-.009629524129254685,
			.041489040571568644,
			.044208545924945365,
			.008591320736451078,
			.017653248754372255
		],
		[
			-.040059058334012305,
			-.03193878023092181,
			-.053149321731056555,
			.03377302590750654,
			-.09189580763549371,
			-.16127007780184993
		],
		[
			-.07611339845294823,
			-.27165460421410076,
			-.10943596765220154,
			.04471736141891602,
			-.18008597569252902,
			-.021819483872844037
		],
		[
			-.1851343162146235,
			-2.2667746048038864,
			-3.3709524669545314,
			.06270805385724934,
			.005276820495154726,
			.02844379959052824
		],
		[
			-.051443504862165666,
			.062282571745645436,
			-2.622048398548823,
			.03892077538332772,
			-.022927661293884252,
			.045365446253058564
		],
		[
			.031303207031545016,
			.022117741830587706,
			-3.9989629604298904,
			.012600807541955247,
			-.581312475646253,
			-.1250934930353043
		],
		[
			-.12448993848024589,
			.03181012428311118,
			.28488322298275176,
			-.14618498877780722,
			.013734297565770952,
			-.03415790131513868
		],
		[
			-.09515365669802199,
			-.20388369449967533,
			.05769077204207497,
			-.011185387284325917,
			-1.393741880497959,
			-.1764187552423939
		],
		[
			-.009688550815077385,
			-.718976908650181,
			.0810174563280077,
			-.00872948614861495,
			-.26182324445869837,
			.020278507183580926
		],
		[
			-.08047003242228312,
			-.13504621051024132,
			.13663863578797875,
			.012219955759248852,
			.056569224450708576,
			.017361264190330027
		],
		[
			.0332836741583044,
			.09895556042120933,
			.10567519792254276,
			.029966076428867956,
			-.1677047518023936,
			-.4790157490044427
		],
		[
			-.05888177042819469,
			-.2050508918464157,
			-.10930443189219606,
			.06038881265441635,
			-.270146956280901,
			-.3574944453208928
		],
		[
			-.006762425696843381,
			.020872689504773282,
			-.03434676832223805,
			.25306537052757216,
			.06787863361885553,
			-.06923381104462026
		],
		[
			.1001571100065631,
			-.24495564632776473,
			-.014325375638700705,
			-.008503462128067362,
			-.012277131523524725,
			-.04310226809833414
		],
		[
			.12972414451503952,
			-1.264374291885278,
			-.17247822033460083,
			-.0034784484227572006,
			-1.0397276111491343,
			.07752550151845548
		],
		[
			.03759861439596582,
			.13156062644015487,
			-.1816914993836672,
			-.022004005473185564,
			.11103583447281239,
			.01578556480773926
		],
		[
			.085970625141173,
			-.17672731968293628,
			.03602856241973085,
			-.03032312717219502,
			-2.363776846750389,
			.06260983198103771
		],
		[
			-.02036970664451556,
			-.3331206667290141,
			.007053935700284488,
			.018436678001549783,
			-.6494469826066569,
			.11263708576651596
		],
		[
			.7491138160792568,
			.9154908798181135,
			-1.0555852794237048,
			-.6495192347961838,
			.9632738053745108,
			.046096788756195606
		],
		[
			-.05780176243770824,
			-.7821738221197129,
			-.3849763227411681,
			.07909770591770181,
			-.3397986077946251,
			-.20701816321400998
		],
		[
			-.03440625740044133,
			-.010476543820970255,
			-.19771006939048366,
			.029553089727735755,
			-.4552154883912278,
			.07560804954980742
		],
		[
			.03493216248415038,
			-.09295805543208749,
			.09539054220742743,
			-.034231670476159756,
			.06386293696480165,
			.003637842985686487
		],
		[
			-.039828584124807755,
			-2.3354526039827554,
			-.005401097573601013,
			.026114764322183782,
			-.15692958159700218,
			.10658118413499057
		],
		[
			-.21765288511386152,
			-1.4784120149005302,
			-.24027240650289783,
			.0414635981744407,
			-.42141015991425684,
			-.060136411311795875
		],
		[
			.010641471206178572,
			.028332706441032626,
			.05855323388167006,
			.006273020542673303,
			-.06192191109689104,
			.012501673049202997
		],
		[
			-.3650958948365315,
			.020164148894906656,
			.021084330012628473,
			.035533637625520656,
			-.18271910290435459,
			-2.5362543315836596
		],
		[
			-.06712306824469373,
			.020088989852694836,
			.025839965341619777,
			.05738874058393891,
			-.05997502825882642,
			-2.954147843312812
		],
		[
			-.0032113891064698926,
			-.6406504299585025,
			.02652007963627677,
			.048814341786187654,
			-.029100001979796526,
			-3.146914954379189
		],
		[
			.06686292791380881,
			.026978407831195903,
			-.04814229366972522,
			.017604091847433282,
			-.002754851837010188,
			-5.000000000000001
		],
		[
			.11810276921269655,
			-.14827213604607914,
			-.34421797570097434,
			.022845041780455936,
			-.3954921746465735,
			-2.62450687664324
		]
	],
	D: [
		[
			0,
			0,
			.011975969293203336,
			.040463536645707475,
			2.360018955570204,
			.3567456934320194,
			0,
			0,
			.0762246200503892,
			1.9381787098252696
		],
		[
			0,
			3.6850786410750342,
			0,
			0,
			0,
			0,
			0,
			.20311196782945243,
			.06297923606355993,
			0
		],
		[
			0,
			0,
			.013207676835266626,
			0,
			0,
			.03189278899380972,
			0,
			2.5865273042821824,
			0,
			.12873682503186054
		],
		[
			1.8748887431772567,
			.0022885224642431377,
			1.0516401891270934,
			1.4208209172159372,
			.05252663596352817,
			.7984054024066385,
			.0152318313503839,
			0,
			1.1536273094324012,
			.005489004885168269
		],
		[
			0,
			5.000000000000001,
			0,
			0,
			0,
			0,
			0,
			0,
			.003694051914291374,
			0
		],
		[
			0,
			0,
			.1611805675333667,
			0,
			0,
			0,
			3.2456529907043743,
			0,
			0,
			0
		]
	]
};
const pokerWeights = {
	B: [
		[
			-1.2926039580948914,
			2.064865320346671,
			1.301732127728411,
			1.2254150268132566,
			.2865850341677568,
			.13956120238127298
		],
		[
			-1.3058526468547975,
			2.317912799048696,
			1.095095026571231,
			-3.697949768491632,
			-3.295985823931204,
			-1.0063166364391454
		],
		[
			.22131909214100662,
			1.1624338892848174,
			1.6212662624440122,
			.3628482650605011,
			.5440811831099677,
			.001669235566326462
		],
		[
			-1.1871062853984997,
			2.629413219093986,
			.8782783820052384,
			-2.024271867121185,
			-2.0595862806006937,
			-2.946734270961897
		],
		[
			-1.6842070623369514,
			3.021104117013311,
			.7206698971971631,
			-.866491339331698,
			.797478093994521,
			-3.298964580352748
		],
		[
			-1.1435789365409506,
			3.515876062852205,
			.41538918462571356,
			-1.1348651174720925,
			1.0592737973956836,
			-1.4046042207640825
		],
		[
			-2.255928831597846,
			2.4464986517145335,
			.7770770382399598,
			-4.1582594334009615,
			-.00999473943288903,
			-5
		],
		[
			1.429369749359729,
			.4376228963181586,
			.4232227682698939,
			1.0509267245495917,
			-4.143192733341061,
			.919165617789277
		],
		[
			-2.4220856325291233,
			-.6374720409763939,
			1.179408841274133,
			.4292911725355751,
			-4.063658483544558,
			-4.171584496728084
		],
		[
			2.4281417649590042,
			.9656646046621051,
			.3397435867015358,
			-.29912054760001155,
			.5852280924225395,
			-2.635322979295047
		],
		[
			1.7424520868972326,
			.6059993423779012,
			.394832673259339,
			-2.4207820743818877,
			-3.9667289250387925,
			-1.1721158116056833
		],
		[
			-1.2892253845214763,
			.5578867017849285,
			1.775203429221034,
			-.5589628416820177,
			1.6100427602664324,
			.5703283412345665
		],
		[
			-4.22914126038264,
			-.6830287288199236,
			2.5980246066694956,
			-1.4994326630206982,
			.7955246846753644,
			-.07529760239916392
		],
		[
			.47055142022289387,
			.3560351716894339,
			1.6950479501777997,
			1.9069181180404973,
			-1.9700035105606895,
			-.8485344180281706
		],
		[
			-3.2288553970510576,
			.6439167197482267,
			-.7976279512764074,
			-2.638903834246486,
			-.6132009079408551,
			1.656847912758711
		],
		[
			-4.556101227533568,
			-.2177510836883737,
			-.2464411157128971,
			1.5197018799592306,
			-1.2345152418721739,
			.9566660493426568
		],
		[
			-2.7647068349631914,
			1.7547902128557706,
			-1.7535296617463847,
			-.1664188472618991,
			-.49892119811556807,
			-1.6519798126743934
		],
		[
			-1.2709776466620073,
			.6358976126407709,
			-.8635820615213007,
			-1.9815124904895127,
			-2.006332000332667,
			-1.7991364008839636
		],
		[
			-2.640283322060546,
			-.13720669682161973,
			.5595656075624998,
			-.7392433762933106,
			-.2451948941036224,
			1.8123309600962314
		],
		[
			-2.868410150230405,
			-.5771598608968505,
			.64258550362665,
			-3.805455202505015,
			-3.0756578030249195,
			-1.9563219337198074
		],
		[
			-3.6221891638162393,
			-.28423697966378103,
			.49264398726612024,
			-1.1660857799987732,
			-2.690959849459944,
			-.018233323781939842
		],
		[
			-3.269298029043809,
			1.1219742769271217,
			1.5388569180171965,
			-1.086091206597149,
			-2.820953218664509,
			1.3345832760400496
		],
		[
			-3.7735190659986593,
			.648216533732407,
			2.0042121982670715,
			-.8716011686287565,
			-1.8111469318541917,
			1.1005204385460274
		],
		[
			-.3196606347269314,
			.010744683924150176,
			2.072785437117007,
			-3.8250225149258146,
			-2.610480631231794,
			.8679741923367271
		],
		[
			-3.9076253910229544,
			1.4352683870510021,
			1.2059383999222668,
			-.6405495652848614,
			-.15396568674587158,
			-2.1026766631236775
		],
		[
			-1.8382091845711392,
			4.59406902694827,
			-1.7955513935288703,
			-3.932466256084903,
			-4.081822876730677,
			-4.3691413291939005
		],
		[
			2.061315756722771,
			3.9726994882933657,
			-1.6295371090230188,
			-.22503376942271977,
			-4.242784279189588,
			-2.958128466589701
		],
		[
			1.9470012705168782,
			2.7675577566722303,
			-.8079266538400894,
			-2.5624038051203404,
			-1.7822370078111456,
			-1.0017879212035137
		],
		[
			-2.8126721393764966,
			-1.411412086555549,
			-1.6853595026511912,
			.345849362600107,
			-.4009425274114995,
			-2.962088673275
		],
		[
			-1.3533281159370083,
			-1.9309946442297663,
			-1.397477064791615,
			.9493025029621467,
			-2.743997611537418,
			-3.6326256372011705
		],
		[
			-2.2775941459650557,
			-.553511365959283,
			-2.1832021509925488,
			-1.3984175842193474,
			-.28261804275148705,
			.32369120982415994
		],
		[
			1.8167417025780375,
			.8571154343301514,
			-2.936769391992006,
			-2.1991159413979577,
			1.0053584692958817,
			-2.5689177400531245
		],
		[
			1.886316708809609,
			1.5273436373845883,
			1.266516333835695,
			1.7317400718698024,
			-3.032674493196168,
			-.8786799046086105
		],
		[
			-2.2218849053364673,
			2.0943242514728873,
			1.2806014353317112,
			-2.7108928700025965,
			1.0517241343513761,
			-3.035680833441988
		],
		[
			-3.7573347761551896,
			1.0041057039433479,
			1.5181650457066933,
			1.9305979413806362,
			-.12348018504119124,
			1.3811563388280705
		],
		[
			.7968735485124725,
			-2.908012217083392,
			3.552350183352349,
			-2.50719700533394,
			-3.323866545068469,
			-3.010923016453128
		]
	],
	D: [
		[
			2.04224162856783,
			-.9379055770081599,
			-2.1332708967242415,
			1.1520317060180683,
			-1.1837530029528047,
			2.3500142249777296,
			-2.8835171991124744,
			.858829815815533,
			3.687751099095098,
			2.1047242507480846
		],
		[
			2.608804187155728,
			1.9197731930420747,
			.2490000631072656,
			.0888879892174568,
			.004740566366719321,
			.018975913784003418,
			.05828427849637195,
			-.0033887952505473164,
			.029794045826968398,
			.021813524780808776
		],
		[
			3.1270671222290165,
			3.6258217685424174,
			.4295649231815905,
			.1901451159514695,
			.009389841269469084,
			.06273954303406219,
			.02143149993427062,
			-.015452012455528666,
			.024146088951796135,
			.03729288705352555
		],
		[
			5,
			-2.576735459889345,
			-3.8217855861694288,
			-3.4503669297959783,
			-.49239314777628956,
			3.0473326174957442,
			-1.5203765620371903,
			.5986210116989726,
			-2.5239991661672043,
			.6198810754547076
		],
		[
			-2.3733790408441924,
			-.9960003784923178,
			-.43072552454164154,
			-.02347437862349918,
			2.6441387091142827,
			-.2718515336401814,
			-.3358899654858977,
			-3.040923813722076,
			-.006794454416100466,
			3.3058442320060086
		],
		[
			3.6380829328807964,
			-2.551719467504775,
			-.9761100550372003,
			.05405142105686996,
			2.274003124553421,
			-3.063466445037379,
			1.4959157522290254,
			1.0942693963698018,
			.16009514989778287,
			-.94048968464722
		]
	]
};
//#endregion
export { ComputationAnimator, MnistInputWidget, POKER_HAND_NAMES, PokerInputWidget, encodeHand, mnistWeights, pokerWeights, sampleDigits };
