import "../utils-CtiTBvWz.mjs";
import { gunzipSync } from "node:zlib";
//#region src/training/math.ts
function matrix(data) {
	return {
		data,
		rows: data.length,
		cols: data[0]?.length ?? 0
	};
}
function zeros(rows, cols) {
	return {
		data: Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0)),
		rows,
		cols
	};
}
function matMul(a, b) {
	const result = zeros(a.rows, b.cols);
	for (let i = 0; i < a.rows; i++) for (let k = 0; k < a.cols; k++) {
		const aik = a.data[i][k];
		for (let j = 0; j < b.cols; j++) result.data[i][j] += aik * b.data[k][j];
	}
	return result;
}
function transpose(m) {
	const result = zeros(m.cols, m.rows);
	for (let i = 0; i < m.rows; i++) for (let j = 0; j < m.cols; j++) result.data[j][i] = m.data[i][j];
	return result;
}
function relu(m) {
	return {
		rows: m.rows,
		cols: m.cols,
		data: m.data.map((row) => row.map((v) => Math.max(0, v)))
	};
}
function reluBackward(preActivation, gradOutput) {
	return {
		rows: preActivation.rows,
		cols: preActivation.cols,
		data: preActivation.data.map((row, i) => row.map((v, j) => v > 0 ? gradOutput.data[i][j] : 0))
	};
}
function softmax(row) {
	const max = Math.max(...row);
	const exps = row.map((v) => Math.exp(v - max));
	const sum = exps.reduce((acc, v) => acc + v, 0);
	return exps.map((v) => v / sum);
}
function crossEntropyLoss(logits, target) {
	let sum = 0;
	for (let i = 0; i < logits.rows; i++) {
		const probs = softmax(logits.data[i]);
		for (let j = 0; j < logits.cols; j++) if (target.data[i][j] > 0) sum -= target.data[i][j] * Math.log(probs[j] + 1e-12);
	}
	return sum / logits.rows;
}
function crossEntropyGrad(logits, target) {
	return {
		rows: logits.rows,
		cols: logits.cols,
		data: logits.data.map((row, i) => softmax(row).map((p, j) => (p - target.data[i][j]) / logits.rows))
	};
}
function clampMin(m, min) {
	return {
		rows: m.rows,
		cols: m.cols,
		data: m.data.map((row) => row.map((v) => Math.max(min, v)))
	};
}
function adamInit(rows, cols) {
	return {
		m: zeros(rows, cols),
		v: zeros(rows, cols)
	};
}
function adamUpdate(param, grad, state, lr, t, beta1 = .9, beta2 = .999, eps = 1e-8) {
	const result = zeros(param.rows, param.cols);
	const bc1 = 1 - Math.pow(beta1, t);
	const bc2 = 1 - Math.pow(beta2, t);
	for (let i = 0; i < param.rows; i++) for (let j = 0; j < param.cols; j++) {
		const g = grad.data[i][j];
		state.m.data[i][j] = beta1 * state.m.data[i][j] + (1 - beta1) * g;
		state.v.data[i][j] = beta2 * state.v.data[i][j] + (1 - beta2) * g * g;
		const mHat = state.m.data[i][j] / bc1;
		const vHat = state.v.data[i][j] / bc2;
		result.data[i][j] = param.data[i][j] - lr * mHat / (Math.sqrt(vHat) + eps);
	}
	return result;
}
function gaussian() {
	return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}
function noiseFactors(rows, cols, logStd) {
	return {
		data: Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.exp(logStd * gaussian()))),
		rows,
		cols
	};
}
function multiply(a, b) {
	return {
		rows: a.rows,
		cols: a.cols,
		data: a.data.map((row, i) => row.map((v, j) => v * b.data[i][j]))
	};
}
function randomMatrix(rows, cols, scale) {
	return {
		data: Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)),
		rows,
		cols
	};
}
const FIT_SAMPLE = 1e4;
function extractWeights(weights) {
	return {
		B: weights.B.data.map((row) => [...row]),
		D: weights.D.data.map((row) => [...row])
	};
}
function accumulationPeaks(values, weights) {
	const peaks = Array.from({ length: weights[0].length }, () => 0);
	for (const row of values) for (let j = 0; j < peaks.length; j++) {
		let acc = 0;
		for (let i = 0; i < weights.length; i++) {
			acc += row[i] * weights[i][j];
			if (Math.abs(acc) > peaks[j]) peaks[j] = Math.abs(acc);
		}
	}
	return peaks;
}
function boundRatio(bound, peak) {
	return peak > 0 ? bound / peak : Infinity;
}
function settable(matrix) {
	return matrix.map((row) => row.map((v) => Math.abs(v) < .02 ? 0 : v));
}
function fitWeightsToApparatus(weights, inputs) {
	const x = inputs.slice(0, FIT_SAMPLE);
	const nHidden = weights.B[0].length;
	const hiddenScale = accumulationPeaks(x, weights.B).map((peak, j) => {
		const columnMax = Math.max(...weights.B.map((row) => Math.abs(row[j])));
		const scale = Math.min(boundRatio(5, peak), boundRatio(5, columnMax));
		return Number.isFinite(scale) ? scale : 1;
	});
	const b = weights.B.map((row) => row.map((v, j) => v * hiddenScale[j]));
	const dBalanced = weights.D.map((row, j) => row.map((v) => v / hiddenScale[j]));
	const hidden = x.map((row) => Array.from({ length: nHidden }, (_, j) => Math.max(0, row.reduce((acc, v, i) => acc + v * b[i][j], 0))));
	const outputPeak = Math.max(...accumulationPeaks(hidden, dBalanced));
	const dMax = Math.max(...dBalanced.flat().map(Math.abs));
	const outputScale = Math.min(boundRatio(5, outputPeak), boundRatio(5, dMax));
	const d = dBalanced.map((row) => row.map((v) => v * (Number.isFinite(outputScale) ? outputScale : 1)));
	return {
		B: settable(b),
		D: settable(d)
	};
}
//#endregion
//#region src/training/model.ts
function offsetWeights(weights, input, level) {
	const tiny = 1e-6;
	const { B, D } = weights;
	const hiddenPre = matMul(input, B);
	const hiddenScale = Array.from({ length: B.cols }, (_, j) => {
		const peak = Math.max(tiny, ...hiddenPre.data.map((row) => Math.abs(row[j])));
		const largest = Math.max(tiny, ...B.data.map((row) => Math.abs(row[j])));
		return Math.min(5 / peak, 5 / largest);
	});
	const fittedD = D.data.map((row, j) => row.map((v) => v / hiddenScale[j]));
	let outputPeak = tiny;
	for (const row of hiddenPre.data) for (let k = 0; k < D.cols; k++) {
		let out = 0;
		for (let j = 0; j < B.cols; j++) out += Math.max(0, row[j] * hiddenScale[j]) * fittedD[j][k];
		outputPeak = Math.max(outputPeak, Math.abs(out));
	}
	const largestD = Math.max(tiny, ...fittedD.flat().map(Math.abs));
	const outputScale = Math.min(5 / outputPeak, 5 / largestD);
	const slot = 10 * level;
	return {
		B: {
			...B,
			data: B.data.map((row) => row.map((v, j) => v + gaussian() * slot / hiddenScale[j]))
		},
		D: {
			...D,
			data: D.data.map((row, j) => row.map((v) => v + gaussian() * slot * hiddenScale[j] / outputScale))
		}
	};
}
var MLP = class {
	weights;
	adamB;
	adamD;
	t = 0;
	constructor(inputSize = 36, hiddenSize = 6, outputSize = 10) {
		const bScale = Math.sqrt(2 / inputSize);
		const dScale = Math.sqrt(2 / hiddenSize);
		this.weights = {
			B: randomMatrix(inputSize, hiddenSize, bScale),
			D: randomMatrix(hiddenSize, outputSize, dScale)
		};
		this.adamB = adamInit(inputSize, hiddenSize);
		this.adamD = adamInit(hiddenSize, outputSize);
	}
	forward(input, weightNoise = 0, weightScale = "linear") {
		if (weightNoise > 0 && weightScale === "linear") {
			const weights = offsetWeights(this.weights, input, weightNoise);
			const hiddenPre = matMul(input, weights.B);
			const hidden = relu(hiddenPre);
			return {
				input,
				hiddenPre,
				hidden,
				output: matMul(hidden, weights.D),
				weights
			};
		}
		const noise = weightNoise > 0 ? {
			B: noiseFactors(this.weights.B.rows, this.weights.B.cols, weightNoise),
			D: noiseFactors(this.weights.D.rows, this.weights.D.cols, weightNoise)
		} : void 0;
		const weights = noise ? {
			B: multiply(this.weights.B, noise.B),
			D: multiply(this.weights.D, noise.D)
		} : this.weights;
		const hiddenPre = matMul(input, weights.B);
		const hidden = relu(hiddenPre);
		return {
			input,
			hiddenPre,
			hidden,
			output: matMul(hidden, weights.D),
			weights,
			noise
		};
	}
	backward(cache, target) {
		const dOutput = crossEntropyGrad(cache.output, target);
		const dD = matMul(transpose(cache.hidden), dOutput);
		const dHidden = matMul(dOutput, transpose(cache.weights.D));
		const dHiddenPre = reluBackward(cache.hiddenPre, dHidden);
		const dB = matMul(transpose(cache.input), dHiddenPre);
		return cache.noise ? {
			dB: multiply(dB, cache.noise.B),
			dD: multiply(dD, cache.noise.D)
		} : {
			dB,
			dD
		};
	}
	step(grads, lr, nonnegativeOutput = true) {
		this.t++;
		this.weights.B = adamUpdate(this.weights.B, grads.dB, this.adamB, lr, this.t);
		const d = adamUpdate(this.weights.D, grads.dD, this.adamD, lr, this.t);
		this.weights.D = nonnegativeOutput ? clampMin(d, 0) : d;
	}
	loss(cache, target) {
		return crossEntropyLoss(cache.output, target);
	}
};
//#endregion
//#region src/training/data.ts
const MNIST_BASE = "https://storage.googleapis.com/cvdf-datasets/mnist/";
const SAMPLE_INDICES = [
	0,
	5,
	9,
	14,
	18,
	23
];
async function fetchGz(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	const compressed = Buffer.from(await res.arrayBuffer());
	return gunzipSync(compressed);
}
function parseImages(buf) {
	const count = buf.readUInt32BE(4);
	const rows = buf.readUInt32BE(8);
	const cols = buf.readUInt32BE(12);
	const images = [];
	let offset = 16;
	for (let i = 0; i < count; i++) {
		const pixels = new Uint8Array(buf.buffer, buf.byteOffset + offset, rows * cols);
		offset += rows * cols;
		images.push(downsample(pixels, rows, cols));
	}
	return images;
}
function parseLabels(buf) {
	const count = buf.readUInt32BE(4);
	const labels = [];
	for (let i = 0; i < count; i++) labels.push(buf[8 + i]);
	return labels;
}
function downsample(pixels, rows, cols) {
	const result = [];
	for (const r of SAMPLE_INDICES) for (const c of SAMPLE_INDICES) result.push(pixels[r * cols + c] / 255);
	return result;
}
function oneHot(label, numClasses = 10) {
	const vec = Array.from({ length: numClasses }, () => 0);
	vec[label] = 1;
	return vec;
}
async function loadMnist() {
	const [imagesBuf, labelsBuf] = await Promise.all([fetchGz(`${MNIST_BASE}train-images-idx3-ubyte.gz`), fetchGz(`${MNIST_BASE}train-labels-idx1-ubyte.gz`)]);
	const images = parseImages(imagesBuf);
	const labels = parseLabels(labelsBuf);
	const splitIdx = Math.floor(images.length * .9);
	return {
		trainImages: matrix(images.slice(0, splitIdx)),
		trainLabels: matrix(labels.slice(0, splitIdx).map((l) => oneHot(l))),
		testImages: matrix(images.slice(splitIdx)),
		testLabels: matrix(labels.slice(splitIdx).map((l) => oneHot(l)))
	};
}
function loadFromJson(json) {
	const splitIdx = Math.floor(json.images.length * .9);
	return {
		trainImages: matrix(json.images.slice(0, splitIdx)),
		trainLabels: matrix(json.labels.slice(0, splitIdx).map((l) => oneHot(l))),
		testImages: matrix(json.images.slice(splitIdx)),
		testLabels: matrix(json.labels.slice(splitIdx).map((l) => oneHot(l)))
	};
}
//#endregion
//#region src/training/index.ts
function shuffle(arr) {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}
function batchIndices(total, batchSize) {
	const indices = shuffle(Array.from({ length: total }, (_, i) => i));
	const batches = [];
	for (let i = 0; i < total; i += batchSize) batches.push(indices.slice(i, i + batchSize));
	return batches;
}
function selectRows(m, indices) {
	return matrix(indices.map((i) => m.data[i]));
}
function accuracy(model, images, labels) {
	const cache = model.forward(images);
	let correct = 0;
	for (let i = 0; i < images.rows; i++) {
		let predMax = -Infinity;
		let predIdx = 0;
		let trueIdx = 0;
		for (let j = 0; j < cache.output.cols; j++) {
			if (cache.output.data[i][j] > predMax) {
				predMax = cache.output.data[i][j];
				predIdx = j;
			}
			if (labels.data[i][j] === 1) trueIdx = j;
		}
		if (predIdx === trueIdx) correct++;
	}
	return correct / images.rows;
}
async function trainMnist(opts = {}) {
	const { epochs = 5, batchSize = 128, learningRate = .005, nonnegativeOutput = true, weightScale = "linear", weightNoise = weightScale === "log" ? .1 : .01, onEpochEnd } = opts;
	const data = opts.data ?? await loadMnist();
	const model = new MLP(36, 6, 10);
	for (let epoch = 1; epoch <= epochs; epoch++) {
		const batches = batchIndices(data.trainImages.rows, batchSize);
		let epochLoss = 0;
		let batchCount = 0;
		for (const batch of batches) {
			const xBatch = selectRows(data.trainImages, batch);
			const yBatch = selectRows(data.trainLabels, batch);
			const cache = model.forward(xBatch, weightNoise, weightScale);
			const loss = model.loss(cache, yBatch);
			const grads = model.backward(cache, yBatch);
			model.step(grads, learningRate, nonnegativeOutput);
			epochLoss += loss;
			batchCount++;
		}
		if (onEpochEnd) {
			const acc = accuracy(model, data.testImages, data.testLabels);
			onEpochEnd(epoch, epochLoss / batchCount, acc);
		}
	}
	const weights = fitWeightsToApparatus(extractWeights(model.weights), data.trainImages.data);
	model.weights = {
		B: matrix(weights.B),
		D: matrix(weights.D)
	};
	return {
		weights,
		testAccuracy: accuracy(model, data.testImages, data.testLabels)
	};
}
//#endregion
export { MLP, fitWeightsToApparatus, loadFromJson, loadMnist, trainMnist };
