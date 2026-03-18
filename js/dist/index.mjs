//#region src/utils.ts
const SVG_NS = "http://www.w3.org/2000/svg";
const RAD_IN_DEG = 180 / Math.PI;
function deg2rad(degrees) {
	return degrees / RAD_IN_DEG;
}
function newRule(start, stop, step, majorStep) {
	const ticks = [];
	for (let val = start; val <= stop + step / 1e3; val += step) {
		const rounded = Math.round(val * 1e3) / 1e3;
		const label = Math.abs(rounded % majorStep) < step / 2 || Math.abs(rounded % majorStep - majorStep) < step / 2 ? formatNumber(rounded) : null;
		ticks.push({
			label,
			value: rounded
		});
	}
	return ticks;
}
function formatNumber(n) {
	const s = Number(n.toPrecision(10)).toString();
	if (s === "-0") return "0";
	return s;
}
function svgElement(tag, attributes = {}, parent) {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
	if (parent) parent.appendChild(el);
	return el;
}
function svgText(content, attributes = {}, parent) {
	const el = svgElement("text", attributes, parent);
	el.textContent = content;
	return el;
}
//#endregion
//#region src/rule-ring.ts
function logRule() {
	const ticks = [];
	for (let i = 10; i <= 99; i++) {
		const val = i / 10;
		const theta = (Math.log(val) - Math.log(1)) / (Math.log(10) - Math.log(1)) * 360;
		const label = formatNumber(val);
		if (val < 2) ticks.push({
			outerLabel: label,
			theta,
			innerLabel: label
		});
		else if (val <= 5 && i % 2 === 0) ticks.push({
			outerLabel: label,
			theta,
			innerLabel: label
		});
		else if (val > 5 && i % 5 === 0) ticks.push({
			outerLabel: label,
			theta,
			innerLabel: label
		});
		else ticks.push({
			outerLabel: null,
			theta,
			innerLabel: null
		});
	}
	return ticks;
}
function reluRule(maxValue, deltaValue) {
	const outerPositive = [];
	for (let val = 0; val <= maxValue + deltaValue / 1e3; val += deltaValue) {
		const rounded = Math.round(val * 1e3) / 1e3;
		outerPositive.push({
			val: rounded,
			theta: rounded * (180 / maxValue)
		});
	}
	return [...outerPositive.slice(1, -1).map(({ val, theta }) => ({
		val: -val,
		theta: -theta
	})).reverse(), ...outerPositive].map(({ val, theta }) => {
		if (Number.isInteger(val)) return {
			outerLabel: formatNumber(val),
			theta,
			innerLabel: formatNumber(Math.max(val, 0))
		};
		return {
			outerLabel: null,
			theta,
			innerLabel: null
		};
	});
}
function renderRuleRing(rule, ctx, parent) {
	const radius = ctx.radius - ctx.ringWidth / 2;
	const tickLength = 10;
	const g = svgElement("g", {}, parent);
	for (const { outerLabel, theta, innerLabel } of rule) {
		const lineClass = outerLabel != null || innerLabel != null ? "top etch heavy" : "top etch";
		const tickG = svgElement("g", { transform: `rotate(${-theta})` }, g);
		svgElement("line", {
			class: lineClass,
			x1: "0",
			y1: String(radius - tickLength),
			x2: "0",
			y2: String(radius + tickLength)
		}, tickG);
		svgText(outerLabel ?? "", {
			class: "top etch",
			x: "0",
			y: String(radius + 2 * tickLength),
			"text-anchor": "middle",
			"dominant-baseline": "auto"
		}, tickG);
		svgText(innerLabel ?? "", {
			class: "top etch",
			x: "0",
			y: String(radius - 1.3 * tickLength),
			"text-anchor": "middle",
			"dominant-baseline": "auto"
		}, tickG);
	}
	svgElement("circle", {
		class: "top full",
		cx: "0",
		cy: "0",
		r: String(radius)
	}, g);
	return g;
}
//#endregion
//#region src/azimuthal-ring.ts
function layerLetter$1(layerIndex) {
	return String.fromCharCode(64 + layerIndex);
}
function renderSlider$1(radius, thetaSweep, rule, layerIndex, sliderNumber, parent) {
	const tickLength = 14;
	const rangeMin = rule[0].value;
	const dynamicRange = rule[rule.length - 1].value - rangeMin;
	const thetaOffset = thetaSweep * sliderNumber;
	const azPadding = 700 / radius + thetaSweep / 36;
	const g = svgElement("g", {
		transform: `rotate(${-thetaOffset})`,
		"data-slider": `${layerLetter$1(layerIndex)}${sliderNumber}`,
		"data-slider-type": "azimuthal"
	}, parent);
	const firstLabel = rule[0].label;
	svgText(firstLabel ?? "", {
		transform: `rotate(${-(.7 * azPadding)})`,
		class: "top etch",
		x: "0",
		y: String(radius),
		"text-anchor": "end",
		"dominant-baseline": "middle"
	}, g);
	for (const { label, value } of rule) {
		const theta = azPadding + (thetaSweep - 2 * azPadding) * (value - rangeMin) / dynamicRange;
		const lineClass = label ? "top etch heavy" : "top etch";
		svgElement("line", {
			transform: `rotate(${-theta})`,
			class: lineClass,
			x1: "0",
			x2: "0",
			y1: String(radius - tickLength / 2),
			y2: String(radius + tickLength / 2)
		}, g);
	}
	const lastLabel = rule[rule.length - 1].label;
	svgText(lastLabel ?? "", {
		transform: `rotate(${-(thetaSweep - .7 * azPadding)})`,
		class: "top etch",
		x: "0",
		y: String(radius),
		"text-anchor": "start",
		"dominant-baseline": "middle"
	}, g);
	svgText(`${layerLetter$1(layerIndex)}${sliderNumber}`, {
		transform: `rotate(${-.5 * thetaSweep})`,
		class: "top etch indices",
		x: "0",
		y: String(radius - tickLength),
		"text-anchor": "middle",
		"dominant-baseline": "middle"
	}, g);
	const x1 = radius * Math.sin(deg2rad(azPadding));
	const y1 = radius * Math.cos(deg2rad(azPadding));
	const x2 = radius * Math.sin(deg2rad(thetaSweep - azPadding));
	const y2 = radius * Math.cos(deg2rad(thetaSweep - azPadding));
	svgElement("path", {
		class: "top slider",
		"stroke-linecap": "round",
		d: `M ${x1} ${y1} A ${radius} ${radius} 0 0 0 ${x2} ${y2}`
	}, g);
	return g;
}
function renderAzimuthalRing(sliderCount, rule, ctx, parent) {
	const thetaSweep = 360 / sliderCount;
	const g = svgElement("g", { "data-ring-type": "azimuthal" }, parent);
	for (let i = 0; i < sliderCount; i++) renderSlider$1(ctx.radius, thetaSweep, rule, ctx.layerIndex, i, g);
	return g;
}
//#endregion
//#region src/radial-ring.ts
function layerLetter(layerIndex) {
	return String.fromCharCode(64 + layerIndex);
}
function renderSlider(radius, width, theta, layerIndex, groupIndex, sliderIndex, parent) {
	const g = svgElement("g", {
		"data-slider": `${layerLetter(layerIndex)}${groupIndex}-${sliderIndex}`,
		"data-slider-type": "radial"
	}, parent);
	svgElement("path", {
		class: "top slider",
		transform: `rotate(${-theta}) translate(0 ${radius})`,
		"stroke-linecap": "round",
		d: `M 0 0 v ${-width}`
	}, g);
	svgText(String(sliderIndex), {
		transform: `rotate(${-theta})`,
		class: "top etch indices small",
		x: "0",
		y: String(radius + 8),
		"text-anchor": "middle",
		"dominant-baseline": "middle"
	}, g);
	return g;
}
function renderGroup(radius, width, slidersPerGroup, thetaSweep, groupIndex, layerIndex, parent) {
	const thetaOffset = thetaSweep * groupIndex;
	for (let i = 1; i <= slidersPerGroup; i++) renderSlider(radius, width, thetaOffset + i * (thetaSweep / (slidersPerGroup + 1)), layerIndex, groupIndex, i - 1, parent);
	svgText(`${layerLetter(layerIndex)}${groupIndex}`, {
		transform: `rotate(${-(thetaOffset + .5 * thetaSweep)})`,
		class: "top etch indices",
		x: "0",
		y: String(radius - width - 10),
		"text-anchor": "middle",
		"dominant-baseline": "middle"
	}, parent);
}
function renderGuides(radius, width, groups, rule, parent) {
	const rangeMin = rule[0].value;
	const dynamicRange = rule[rule.length - 1].value - rangeMin;
	const thetaSweep = 360 / groups;
	const radii = rule.map(({ label, value }) => ({
		label,
		r: radius - width * (value - rangeMin) / dynamicRange
	}));
	for (const { label, r } of radii) {
		const azPadding = r > .1 ? 700 / r : 0;
		const arcComponents = [];
		for (let i = 0; i < groups; i++) {
			const x1 = r * Math.sin(deg2rad(i * thetaSweep + azPadding));
			const y1 = r * Math.cos(deg2rad(i * thetaSweep + azPadding));
			const x2 = r * Math.sin(deg2rad((i + 1) * thetaSweep - azPadding));
			const y2 = r * Math.cos(deg2rad((i + 1) * thetaSweep - azPadding));
			arcComponents.push(`M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`);
		}
		svgElement("path", {
			class: label ? "top etch heavy" : "top etch",
			d: arcComponents.join(" ")
		}, parent);
	}
	const labelledRadii = radii.filter(({ label }) => label != null);
	for (let i = 0; i < groups; i++) {
		const labelG = svgElement("g", {
			class: "top etch",
			transform: `rotate(${-(360 * i / groups)})`
		}, parent);
		for (const { label, r } of labelledRadii) svgText(label, {
			class: "top etch",
			x: "0",
			y: String(r + 1),
			"text-anchor": "middle",
			"dominant-baseline": "middle"
		}, labelG);
	}
}
function renderRadialRing(groups, slidersPerGroup, rule, ctx, parent) {
	const radius = ctx.radius - 5;
	const width = ctx.ringWidth - 10;
	const thetaSweep = 360 / groups;
	const g = svgElement("g", { "data-ring-type": "radial" }, parent);
	renderGuides(radius, width, groups, rule, g);
	for (let i = 0; i < groups; i++) renderGroup(radius, width, slidersPerGroup, thetaSweep, i, ctx.layerIndex, g);
	return g;
}
//#endregion
//#region src/board.ts
function createRingSequence(nInput, nHidden, nOutput) {
	return [
		{
			type: "rule",
			fixedWidth: 30,
			rule: logRule()
		},
		{
			type: "azimuthal",
			fixedWidth: 10,
			sliders: nInput,
			rule: newRule(0, 1, .1, .5)
		},
		{
			type: "radial",
			fixedWidth: 25,
			groups: nHidden,
			slidersPerGroup: nInput,
			rule: newRule(-5, 5, 1, 5)
		},
		{
			type: "azimuthal",
			fixedWidth: 10,
			sliders: nHidden,
			rule: newRule(-5, 5, 1, 5)
		},
		{
			type: "radial",
			fixedWidth: 25,
			groups: nOutput,
			slidersPerGroup: nHidden,
			rule: newRule(-5, 5, 1, 5)
		},
		{
			type: "azimuthal",
			fixedWidth: 10,
			sliders: nOutput,
			rule: newRule(0, 5, 1, 5)
		}
	];
}
function calculateRingWidths(rings, radius, radialPadding, centerSpace) {
	const radialRings = rings.filter((r) => r.type === "radial");
	const fixedWidthsTotal = rings.filter((r) => r.type !== "radial").reduce((s, r) => s + r.fixedWidth, 0);
	const paddingTotal = radialPadding * (rings.length - 1);
	const availableForRadial = Math.max(radius - centerSpace - fixedWidthsTotal - paddingTotal, 0);
	const radialWidth = radialRings.length > 0 ? availableForRadial / radialRings.length : 0;
	return rings.map((ring) => ring.type === "radial" ? radialWidth : ring.fixedWidth);
}
function renderBoard(config, parent) {
	const size = config.size ?? 1200;
	const radius = size / 2;
	const radialPadding = 30;
	const centerSpace = 150;
	const svgPadding = 10;
	const svg = svgElement("svg", {
		viewBox: `${-(size / 2 + svgPadding)} ${-(size / 2 + svgPadding)} ${size + 2 * svgPadding} ${size + 2 * svgPadding}`,
		stroke: "black",
		fill: "transparent",
		"stroke-width": "1",
		xmlns: "http://www.w3.org/2000/svg"
	});
	const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
	style.textContent = buildStyles();
	svg.appendChild(style);
	svgElement("circle", {
		class: "full",
		cx: "0",
		cy: "0",
		r: String(radius),
		"stroke-width": "2"
	}, svg);
	const rings = createRingSequence(config.nInput, config.nHidden, config.nOutput);
	const widths = calculateRingWidths(rings, radius, radialPadding, centerSpace);
	let currentRadius = radius - radialPadding;
	let layerIndex = 1;
	rings.forEach((ring, ringIndex) => {
		const ringWidth = widths[ringIndex];
		if (ring.type === "rule") {
			const logG = svgElement("g", {
				"data-ring": "log",
				transform: "rotate(4.2)"
			}, svg);
			renderRuleRing(ring.rule, {
				radius: currentRadius,
				ringWidth
			}, logG);
		} else if (ring.type === "azimuthal") {
			renderAzimuthalRing(ring.sliders, ring.rule, {
				radius: currentRadius,
				layerIndex,
				ringWidth
			}, svg);
			layerIndex++;
		} else if (ring.type === "radial") {
			renderRadialRing(ring.groups, ring.slidersPerGroup, ring.rule, {
				radius: currentRadius,
				layerIndex,
				ringWidth
			}, svg);
			layerIndex++;
		}
		currentRadius -= ringWidth + radialPadding;
	});
	renderCenterLogo(centerSpace, svg);
	parent.appendChild(svg);
	return svg;
}
function renderCenterLogo(centerSpace, parent) {
	const padding = centerSpace * .05;
	const boxSize = centerSpace * .4 + padding * 2;
	const boxOffset = -boxSize / 2;
	const r = boxSize * .1;
	const x1 = boxOffset;
	const y1 = boxOffset;
	const x2 = boxOffset + boxSize;
	const y2 = boxOffset + boxSize;
	svgElement("path", {
		class: "full",
		d: [
			`M ${x1 + r},${y1}`,
			`L ${x2 - r},${y1}`,
			`Q ${x2},${y1} ${x2},${y1 + r}`,
			`L ${x2},${y2}`,
			`L ${x1 + r},${y2}`,
			`Q ${x1},${y2} ${x1},${y2 - r}`,
			`L ${x1},${y1 + r}`,
			`Q ${x1},${y1} ${x1 + r},${y1}`,
			"Z"
		].join(" "),
		fill: "transparent",
		"stroke-width": "2"
	}, parent);
	const textSize = boxSize * .13;
	const lineHeight = textSize * 1.2;
	const textXCenter = boxOffset + boxSize * .5;
	const textXRight = textXCenter + 10 * textSize * .3;
	const textYFirst = boxOffset + boxSize * .5 - lineHeight / 2;
	const textYSecond = textYFirst + lineHeight;
	const el1 = svgElement("text", {
		class: "logo",
		x: String(textXCenter),
		y: String(textYFirst),
		style: `font-family: sans-serif; font-size: ${textSize}px; fill: black; stroke: none;`,
		"text-anchor": "middle",
		"dominant-baseline": "middle"
	}, parent);
	el1.textContent = "Cybernetic";
	const el2 = svgElement("text", {
		class: "logo",
		x: String(textXRight),
		y: String(textYSecond),
		style: `font-family: sans-serif; font-size: ${textSize}px; fill: black; stroke: none;`,
		"text-anchor": "end",
		"dominant-baseline": "middle"
	}, parent);
	el2.textContent = "Studio";
}
function buildStyles() {
	return `
text {
  font-family: sans-serif;
  font-size: 12px;
}
.full {
  stroke-width: 1;
  stroke: #6ab04c;
}
.slider {
  stroke: #f0932b;
}
.top.slider {
  stroke-width: 3;
}
.etch {
  stroke-width: 0.5;
  stroke: black;
}
.etch.heavy {
  stroke-width: 1.5;
}
text {
  fill: black;
  stroke: none;
  font-weight: 500;
}
text.indices {
  font-size: 12px;
  font-weight: 300;
}
text.indices.small {
  font-size: 8px;
}
text.logo {
  fill: black;
  stroke: none;
}
[data-ring], [data-slider] {
  transition: transform var(--pa-duration, 0ms) ease-in-out;
}
`;
}
//#endregion
//#region src/index.ts
var PerceptronApparatus = class {
	svg;
	config;
	constructor(container, config) {
		this.config = {
			size: 1200,
			...config
		};
		this.svg = renderBoard(this.config, container);
	}
	setLogRingRotation(degrees, opts = {}) {
		const el = this.svg.querySelector("[data-ring='log']");
		if (!el) return Promise.resolve();
		return applyTransform(el, `rotate(${degrees})`, opts);
	}
	setSlider(id, value, opts = {}) {
		const el = this.svg.querySelector(`[data-slider='${id}']`);
		if (!el) return Promise.resolve();
		const sliderType = el.getAttribute("data-slider-type");
		if (sliderType === "azimuthal") return this.setAzimuthalSlider(el, id, value, opts);
		else if (sliderType === "radial") return this.setRadialSlider(el, id, value, opts);
		return Promise.resolve();
	}
	setSliders(values, opts = {}) {
		const promises = Object.entries(values).map(([id, value]) => this.setSlider(id, value, opts));
		return Promise.all(promises).then(() => {});
	}
	setAzimuthalSlider(el, id, value, opts) {
		const { layerIndex, sliderNumber } = parseAzimuthalId(id);
		const ringDef = this.findAzimuthalRing(layerIndex);
		if (!ringDef) return Promise.resolve();
		const { sliderCount, rangeMin, rangeMax } = ringDef;
		const thetaSweep = 360 / sliderCount;
		const azPadding = 700 / this.getRadiusForLayer(layerIndex) + thetaSweep / 36;
		const dynamicRange = rangeMax - rangeMin;
		const clampedValue = Math.max(rangeMin, Math.min(rangeMax, value));
		return applyTransform(el, `rotate(${-(thetaSweep * sliderNumber + (azPadding + (thetaSweep - 2 * azPadding) * (clampedValue - rangeMin) / dynamicRange - (azPadding + (thetaSweep - 2 * azPadding) * .5)))})`, opts);
	}
	setRadialSlider(el, id, value, opts) {
		const { layerIndex, groupIndex, sliderIndex } = parseRadialId(id);
		const ringDef = this.findRadialRing(layerIndex);
		if (!ringDef) return Promise.resolve();
		const { rangeMin, rangeMax, ringWidth } = ringDef;
		const radius = this.getRadiusForLayer(layerIndex) - 5;
		const width = ringWidth - 10;
		const dynamicRange = rangeMax - rangeMin;
		const clampedValue = Math.max(rangeMin, Math.min(rangeMax, value));
		const thetaSweep = 360 / ringDef.groups;
		const theta = thetaSweep * groupIndex + (sliderIndex + 1) * (thetaSweep / (ringDef.slidersPerGroup + 1));
		const midRadius = radius - width / 2;
		const radialOffset = radius - width * (clampedValue - rangeMin) / dynamicRange - midRadius;
		const offsetX = radialOffset * Math.sin(deg2rad(theta));
		const offsetY = radialOffset * Math.cos(deg2rad(theta));
		return applyTransform(el, `translate(${-offsetX}, ${-offsetY})`, opts);
	}
	findAzimuthalRing(layerIndex) {
		return {
			1: {
				sliderCount: this.config.nInput,
				rangeMin: 0,
				rangeMax: 1
			},
			3: {
				sliderCount: this.config.nHidden,
				rangeMin: -5,
				rangeMax: 5
			},
			5: {
				sliderCount: this.config.nOutput,
				rangeMin: 0,
				rangeMax: 5
			}
		}[layerIndex] ?? null;
	}
	findRadialRing(layerIndex) {
		const radius = this.config.size / 2;
		const radialPadding = 30;
		const centerSpace = 150;
		const ringCount = 6;
		const fixedWidths = 60;
		const paddingTotal = radialPadding * (ringCount - 1);
		const radialWidth = Math.max((radius - centerSpace - fixedWidths - paddingTotal) / 2, 0);
		return {
			2: {
				groups: this.config.nHidden,
				slidersPerGroup: this.config.nInput,
				rangeMin: -5,
				rangeMax: 5,
				ringWidth: radialWidth
			},
			4: {
				groups: this.config.nOutput,
				slidersPerGroup: this.config.nHidden,
				rangeMin: -5,
				rangeMax: 5,
				ringWidth: radialWidth
			}
		}[layerIndex] ?? null;
	}
	getRadiusForLayer(layerIndex) {
		const radius = this.config.size / 2;
		const radialPadding = 30;
		const centerSpace = 150;
		const ringCount = 6;
		const fixedWidths = 60;
		const paddingTotal = radialPadding * (ringCount - 1);
		const radialWidth = Math.max((radius - centerSpace - fixedWidths - paddingTotal) / 2, 0);
		const widths = [
			30,
			10,
			radialWidth,
			10,
			radialWidth,
			10
		];
		let r = radius - radialPadding;
		let idx = 1;
		for (const w of widths) {
			if (idx === layerIndex) return r;
			if (w !== 30) idx++;
			r -= w + radialPadding;
		}
		return r;
	}
};
function parseAzimuthalId(id) {
	return {
		layerIndex: id.charAt(0).charCodeAt(0) - 64,
		sliderNumber: parseInt(id.substring(1), 10)
	};
}
function parseRadialId(id) {
	const layerIndex = id.charAt(0).charCodeAt(0) - 64;
	const [groupStr, sliderStr] = id.substring(1).split("-");
	return {
		layerIndex,
		groupIndex: parseInt(groupStr, 10),
		sliderIndex: parseInt(sliderStr, 10)
	};
}
function applyTransform(el, transform, opts) {
	const duration = opts.duration ?? 0;
	if (duration <= 0) {
		el.style.setProperty("--pa-duration", "0ms");
		el.setAttribute("transform", transform);
		return Promise.resolve();
	}
	return new Promise((resolve) => {
		el.style.setProperty("--pa-duration", `${duration}ms`);
		const onEnd = () => {
			el.removeEventListener("transitionend", onEnd);
			resolve();
		};
		el.addEventListener("transitionend", onEnd);
		requestAnimationFrame(() => {
			el.setAttribute("transform", transform);
		});
		setTimeout(resolve, duration + 50);
	});
}
//#endregion
export { PerceptronApparatus, logRule, reluRule, renderBoard };
