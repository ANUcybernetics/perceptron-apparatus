import { inflateSync } from "node:zlib";
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
function mseLoss(pred, target) {
	let sum = 0;
	for (let i = 0; i < pred.rows; i++) for (let j = 0; j < pred.cols; j++) {
		const diff = pred.data[i][j] - target.data[i][j];
		sum += diff * diff;
	}
	return sum / (pred.rows * pred.cols);
}
function mseGrad(pred, target) {
	const scale = 2 / (pred.rows * pred.cols);
	return {
		rows: pred.rows,
		cols: pred.cols,
		data: pred.data.map((row, i) => row.map((v, j) => (v - target.data[i][j]) * scale))
	};
}
function clamp(m, min, max) {
	return {
		rows: m.rows,
		cols: m.cols,
		data: m.data.map((row) => row.map((v) => Math.min(max, Math.max(min, v))))
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
function randomMatrix(rows, cols, scale) {
	return {
		data: Array.from({ length: rows }, () => Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)),
		rows,
		cols
	};
}
//#endregion
//#region src/training/model.ts
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
	forward(input) {
		const hiddenPre = matMul(input, this.weights.B);
		const hidden = relu(hiddenPre);
		return {
			input,
			hiddenPre,
			hidden,
			output: matMul(hidden, this.weights.D)
		};
	}
	backward(cache, target) {
		const dOutput = mseGrad(cache.output, target);
		const dD = matMul(transpose(cache.hidden), dOutput);
		const dHidden = matMul(dOutput, transpose(this.weights.D));
		const dHiddenPre = reluBackward(cache.hiddenPre, dHidden);
		return {
			dB: matMul(transpose(cache.input), dHiddenPre),
			dD
		};
	}
	step(grads, lr, weightClamp) {
		this.t++;
		this.weights.B = clamp(adamUpdate(this.weights.B, grads.dB, this.adamB, lr, this.t), weightClamp[0], weightClamp[1]);
		this.weights.D = clamp(adamUpdate(this.weights.D, grads.dD, this.adamD, lr, this.t), weightClamp[0], weightClamp[1]);
	}
	loss(cache, target) {
		return mseLoss(cache.output, target);
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
	return inflateSync(Buffer.from(await res.arrayBuffer()), { windowBits: 31 });
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
//#region src/training/weights.ts
function extractWeights(weights) {
	return {
		B: weights.B.data.map((row) => [...row]),
		D: weights.D.data.map((row) => [...row])
	};
}
function maxAbs(matrix) {
	let max = 0;
	for (const row of matrix) for (const v of row) {
		const a = Math.abs(v);
		if (a > max) max = a;
	}
	return max;
}
function scaleMatrix(m, factor) {
	return m.map((row) => row.map((v) => v * factor));
}
function scaleWeights(weights, targetMax = 5) {
	const bMax = maxAbs(weights.B);
	const dMax = maxAbs(weights.D);
	if (bMax === 0 || dMax === 0) return weights;
	const bScaleNeeded = targetMax / bMax;
	const dScaleNeeded = targetMax / dMax;
	const beta = Math.sqrt(bScaleNeeded / dScaleNeeded);
	const bScaled = scaleMatrix(weights.B, beta);
	const dScaled = scaleMatrix(weights.D, 1 / beta);
	const bMaxAfter = maxAbs(bScaled);
	const dMaxAfter = maxAbs(dScaled);
	const finalScale = targetMax / Math.max(bMaxAfter, dMaxAfter);
	return {
		B: scaleMatrix(bScaled, finalScale),
		D: scaleMatrix(dScaled, finalScale)
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
	const { epochs = 5, batchSize = 128, learningRate = .005, weightClamp = [-5, 5], onEpochEnd } = opts;
	const data = opts.data ?? await loadMnist();
	const model = new MLP(36, 6, 10);
	for (let epoch = 1; epoch <= epochs; epoch++) {
		const batches = batchIndices(data.trainImages.rows, batchSize);
		let epochLoss = 0;
		let batchCount = 0;
		for (const batch of batches) {
			const xBatch = selectRows(data.trainImages, batch);
			const yBatch = selectRows(data.trainLabels, batch);
			const cache = model.forward(xBatch);
			const loss = model.loss(cache, yBatch);
			const grads = model.backward(cache, yBatch);
			model.step(grads, learningRate, weightClamp);
			epochLoss += loss;
			batchCount++;
		}
		if (onEpochEnd) {
			const acc = accuracy(model, data.testImages, data.testLabels);
			onEpochEnd(epoch, epochLoss / batchCount, acc);
		}
	}
	const testAcc = accuracy(model, data.testImages, data.testLabels);
	return {
		weights: extractWeights(model.weights),
		testAccuracy: testAcc
	};
}
//#endregion
export { MLP, loadFromJson, loadMnist, scaleWeights, trainMnist };
