//#region src/utils.ts
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
const WEIGHT_MIN = .02;
const WEIGHT_ZERO_GAP = .12;
const WEIGHT_LABELLED = [
	.02,
	.05,
	.1,
	.2,
	.5,
	1,
	2,
	5
];
function weightRule(scale = "linear") {
	if (scale === "linear") return newRule(-5, 5, 1, 5);
	const ticks = [{
		label: "0",
		value: 0
	}];
	for (const decade of [
		.01,
		.1,
		1
	]) for (let digit = 1; digit <= 9; digit++) {
		const value = Math.round(digit * decade * 100) / 100;
		if (value < .02 || value > 5) continue;
		ticks.push({
			label: WEIGHT_LABELLED.includes(value) ? formatNumber(value) : null,
			value
		});
	}
	return ticks;
}
function weightScaleFraction(value, scale = "linear") {
	if (scale === "linear") return (Math.min(Math.max(value, -5), 5) + 5) / 10;
	const magnitude = Math.min(Math.abs(value), 5);
	if (magnitude < .02) return 0;
	const logFraction = Math.log(magnitude / WEIGHT_MIN) / Math.log(5 / WEIGHT_MIN);
	return WEIGHT_ZERO_GAP + (1 - WEIGHT_ZERO_GAP) * logFraction;
}
function formatNumber(n) {
	const s = Number(n.toPrecision(10)).toString();
	if (s === "-0") return "0";
	return s;
}
//#endregion
export { weightRule as a, newRule as i, deg2rad as n, weightScaleFraction as o, formatNumber as r, WEIGHT_MIN as t };
