# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "numpy"]
# ///
"""Check which demonstration tasks fit the apparatus, and under which training
recipe.

Each task is trained at the apparatus's architecture (at most 36 inputs, 6
bias-free ReLU hidden units, at most 10 bias-free linear outputs, prediction by
largest output) and scored on held-out data over several seeds. For context
each task also reports the majority-class share and the same network with 64
hidden units, which shows how much the 6-unit bottleneck costs.

Training recipes compared, none of which changes what the apparatus computes:

- mse: mean squared error on one-hot targets
- ce: softmax cross-entropy
- ce + constant input: cross-entropy, with one spare input slider fixed at 1 so
  the hidden units get a bias; only possible when the task leaves an input free
- ce + nonneg: cross-entropy with non-negative hidden-to-output weights, so
  every output slider only ever accumulates upwards
- ce + nonneg + log noise: the same, with every weight multiplied by a fresh
  random factor on each training step (log standard deviation 0.1), which is how
  a slider on the log weight scale is misset; the training code's recipe for
  that scale
- ce + nonneg + linear noise: instead, every weight gets a fresh random offset
  of the same size on the apparatus (standard deviation 1% of the slot), which
  is how a slider on the linear weight scale is misset; the training code's
  default recipe

For each recipe the best 6-hidden model's weights are fitted to the apparatus
as the weight export does and put through the slider-noise model (see
apparatus_sim.py), on the log weight scale, on the linear -5 to 5 scale the
built apparatus has, and on the most favourable linear scale possible for those
weights.

Tasks:

- mnist: handwritten digits downsampled to 6x6, trained on the 60,000-image
  training set and scored on the 10,000-image test set
- zoo: UCI Zoo, 15 yes/no animal traits plus one-hot leg count (21 inputs) to
  7 animal classes; 101 animals, so scored by repeated 5-fold cross-validation
- letters: next-symbol prediction over a 10-symbol alphabet (the letters
  "etaoinshr" and space) from the 3 previous symbols, one-hot (30 inputs); the
  corpus is two novels reduced to the words spelt with only those letters
- dotmatrix: 5x7 dot-matrix digits (35 inputs) with pixels flipped at random
- language: which of 10 (or 5) languages a word or 6-word phrase is in, from
  its 26 letter proportions with diacritics stripped

Run with `uv run scripts/candidate_tasks.py`. It downloads its data on each
run and takes several minutes.
"""

import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import apparatus_sim as sim
from apparatus_sim import Dataset

SEEDS = 5
MAX_INPUTS = 36
NOISE_TRIALS = 50
NOISE_SIGMAS = [0.01, 0.02, 0.05]
WORDS_URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{0}/{0}_50k.txt"
LANGUAGES = ["en", "fr", "de", "es", "it", "pt", "nl", "sv", "pl", "fi"]
DIGITS = """
01110 00100 01110 11111 00010 11111 00110 11111 01110 01110
10001 01100 10001 00010 00110 10000 01000 00001 10001 10001
10011 00100 00001 00100 01010 11110 10000 00010 10001 10001
10101 00100 00010 00010 10010 00001 11110 00100 01110 01111
11001 00100 00100 00001 11111 00001 10001 01000 10001 00001
10001 00100 01000 10001 00010 10001 10001 01000 10001 00010
01110 01110 11111 01110 00010 01110 01110 01000 01110 01100
"""


@dataclass(frozen=True)
class Recipe:
    name: str
    loss: str
    constant_input: bool = False
    nonnegative_output: bool = False
    weight_noise: float = 0.0
    weight_scale: str = "log"


RECIPES = [
    Recipe("mse", "mse"),
    Recipe("ce", "ce"),
    Recipe("ce + constant input", "ce", constant_input=True),
    Recipe("ce + nonneg", "ce", nonnegative_output=True),
    Recipe("ce + nonneg + log noise", "ce", nonnegative_output=True, weight_noise=0.1),
    Recipe(
        "ce + nonneg + linear noise",
        "ce",
        nonnegative_output=True,
        weight_noise=0.01,
        weight_scale="linear",
    ),
]


def linear_offsets(
    b: np.ndarray, d: np.ndarray, x: np.ndarray, level: float, rng: np.random.Generator
) -> tuple[np.ndarray, np.ndarray]:
    """A random offset for every weight, the same size on the apparatus for all
    of them: `level` is its standard deviation as a fraction of the slot. What
    one unit on the apparatus is in each layer's weights as trained is estimated
    from the batch `x`, as fit_to_apparatus would rescale them."""
    tiny = 1e-6
    pre = x @ b
    scale = np.minimum(
        sim.HIDDEN_MAX / np.maximum(np.abs(pre).max(0), tiny),
        sim.WEIGHT_MAX / np.maximum(np.abs(b).max(0), tiny),
    )
    fitted_d = d / scale[:, None]
    out = np.maximum(pre * scale, 0) @ fitted_d
    out_scale = min(
        sim.OUTPUT_MAX / max(np.abs(out).max(), tiny),
        sim.WEIGHT_MAX / max(np.abs(fitted_d).max(), tiny),
    )
    slot = 2 * sim.WEIGHT_MAX * level
    return (
        rng.normal(0, 1, b.shape) * slot / scale,
        rng.normal(0, 1, d.shape) * slot * scale[:, None] / out_scale,
    )


def train(
    x: np.ndarray,
    y: np.ndarray,
    classes: int,
    hidden: int,
    epochs: int,
    seed: int,
    recipe: Recipe,
) -> tuple[np.ndarray, np.ndarray]:
    """Bias-free ReLU MLP trained with Adam under the given recipe."""
    rng = np.random.default_rng(seed)
    params = [
        rng.normal(0, np.sqrt(2 / x.shape[1]), (x.shape[1], hidden)),
        rng.normal(0, np.sqrt(1 / hidden), (hidden, classes)),
    ]
    if recipe.nonnegative_output:
        params[1] = np.abs(params[1])
    moments = [[np.zeros_like(p), np.zeros_like(p)] for p in params]
    targets = sim.one_hot(y, classes)
    step = 0
    for _ in range(epochs):
        order = rng.permutation(len(x))
        for start in range(0, len(x), 128):
            batch = order[start : start + 128]
            if recipe.weight_noise and recipe.weight_scale == "linear":
                noise = [1.0, 1.0]
                offsets = linear_offsets(
                    params[0], params[1], x[batch], recipe.weight_noise, rng
                )
                b, d = params[0] + offsets[0], params[1] + offsets[1]
            else:
                noise = [
                    np.exp(rng.normal(0, recipe.weight_noise, p.shape)) for p in params
                ]
                b, d = params[0] * noise[0], params[1] * noise[1]
            h = np.maximum(x[batch] @ b, 0)
            out = h @ d
            if recipe.loss == "ce":
                exp = np.exp(out - out.max(1, keepdims=True))
                delta = (exp / exp.sum(1, keepdims=True) - targets[batch]) / len(batch)
            else:
                delta = 2 * (out - targets[batch]) / len(batch)
            grads = [
                (x[batch].T @ ((delta @ d.T) * (h > 0))) * noise[0],
                (h.T @ delta) * noise[1],
            ]
            step += 1
            for p, g, m in zip(params, grads, moments, strict=True):
                m[0] = 0.9 * m[0] + 0.1 * g
                m[1] = 0.999 * m[1] + 0.001 * g**2
                p -= (
                    0.005
                    * (m[0] / (1 - 0.9**step))
                    / (np.sqrt(m[1] / (1 - 0.999**step)) + 1e-8)
                )
            if recipe.nonnegative_output:
                np.maximum(params[1], 0, out=params[1])
    return params[0], params[1]


def noise_report(
    b: np.ndarray, d: np.ndarray, x_fit: np.ndarray, x: np.ndarray, y: np.ndarray
) -> None:
    b, d = sim.fit_to_apparatus(b, d, x_fit)
    print(f"  fitted to the apparatus: accuracy {sim.accuracy(b, d, x, y):.3f}")
    scales = (
        ("log", sim.log_scale),
        ("linear ±5", lambda w, sigma: sim.linear_scale(w, sigma, sim.WEIGHT_MAX)),
        ("linear to fit", sim.linear_scale),
    )
    for name, perturb in scales:
        cells = []
        for sigma in NOISE_SIGMAS:
            accs = [
                sim.accuracy(perturb(b, sigma), perturb(d, sigma), x, y)
                for _ in range(NOISE_TRIALS)
            ]
            cells.append(f"{sigma:.0%}: {np.mean(accs):.3f}")
        print(f"  slider noise, {name:13} scale  " + "  ".join(cells))


def with_constant_input(data: Dataset) -> Dataset:
    x_train, y_train, x_test, y_test = data
    return (
        np.hstack([x_train, np.ones((len(x_train), 1))]),
        y_train,
        np.hstack([x_test, np.ones((len(x_test), 1))]),
        y_test,
    )


def evaluate(
    name: str,
    splits: list[Dataset],
    classes: int,
    epochs: int,
    final: Dataset | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Train on each split under each recipe and report held-out accuracy.

    The noise check uses each recipe's best 6-hidden model on its own test data,
    or, when `final` is given, a model trained and checked on that dataset
    instead. Returns the model trained with the last recipe.
    """
    print(f"\n=== {name} ===", flush=True)
    x_test, y_test = splits[0][2], splits[0][3]
    print(
        f"inputs {splits[0][0].shape[1]}, outputs {classes}, "
        f"train {len(splits[0][0])}, test {len(x_test)}, "
        f"majority class {np.bincount(y_test).max() / len(y_test):.3f}"
    )
    for recipe in RECIPES:
        if recipe.constant_input and splits[0][0].shape[1] >= MAX_INPUTS:
            continue
        print(f" {recipe.name}:")
        recipe_splits = (
            [with_constant_input(s) for s in splits]
            if recipe.constant_input
            else splits
        )
        models = []
        for hidden in (6, 64):
            accs = []
            for seed, (x_train, y_train, x_te, y_te) in enumerate(recipe_splits):
                b, d = train(x_train, y_train, classes, hidden, epochs, seed, recipe)
                accs.append(sim.accuracy(b, d, x_te, y_te))
                if hidden == 6:
                    models.append((accs[-1], b, d, x_train, x_te, y_te))
            print(
                f"  {hidden:2} hidden: accuracy {np.mean(accs):.3f} ± {np.std(accs):.3f}, "
                f"best {np.max(accs):.3f}",
                flush=True,
            )
        if final is not None:
            whole = with_constant_input(final) if recipe.constant_input else final
            fits = [
                train(whole[0], whole[1], classes, 6, epochs, seed, recipe)
                for seed in range(SEEDS)
            ]
            models = [
                (
                    sim.accuracy(b, d, whole[2], whole[3]),
                    b,
                    d,
                    whole[0],
                    whole[2],
                    whole[3],
                )
                for b, d in fits
            ]
        acc, b, d, x_fit, x_noise, y_noise = max(models, key=lambda m: m[0])
        print(
            f"  model used for the noise check: accuracy {acc:.3f} on {len(y_noise)} examples"
        )
        noise_report(b, d, x_fit, x_noise, y_noise)
    return b, d


def zoo_splits() -> tuple[list[Dataset], Dataset]:
    """Repeated 5-fold splits, plus the whole dataset as both train and test."""
    x, y = sim.zoo_data()
    splits = []
    for repeat in range(SEEDS):
        order = np.random.default_rng(repeat).permutation(len(x))
        for fold in range(5):
            test = order[fold::5]
            train_idx = np.setdiff1d(order, test)
            splits.append((x[train_idx], y[train_idx], x[test], y[test]))
    return splits, (x, y, x, y)


def letters_report(data: Dataset, text: str, b: np.ndarray, d: np.ndarray) -> None:
    x_train, y_train, x_test, y_test = data
    print(f"  corpus: {len(text)} symbols, e.g. '{text[:60]}'")

    def keys(x: np.ndarray) -> np.ndarray:
        return x.reshape(-1, 3, 10).argmax(2) @ np.array([100, 10, 1])

    table: dict[int, Counter] = {}
    for key, nxt in zip(keys(x_train), y_train, strict=True):
        table.setdefault(int(key), Counter())[int(nxt)] += 1
    fallback = Counter(y_train.tolist()).most_common(1)[0][0]
    guesses = [
        table[int(k)].most_common(1)[0][0] if int(k) in table else fallback
        for k in keys(x_test)
    ]
    print(
        f"  lookup table of 3-symbol contexts: accuracy {np.mean(guesses == y_test):.3f}"
    )

    rng = np.random.default_rng(0)
    out = [sim.ALPHABET.index(c) for c in "the"]
    for _ in range(120):
        scores = sim.forward(b, d, sim.one_hot(np.array(out[-3:]), 10).reshape(1, 30))[
            0
        ]
        probs = np.exp(scores - scores.max())
        out.append(int(rng.choice(10, p=probs / probs.sum())))
    sample = "".join(sim.ALPHABET[i] for i in out)
    print(
        f"  sampled from the last recipe's model (softmax of its outputs): '{sample}'"
    )


def dotmatrix_data(seed: int) -> Dataset:
    rows = [line.split() for line in DIGITS.strip().splitlines()]
    glyphs = np.array(
        [[int(c) for row in rows for c in row[digit]] for digit in range(10)]
    )
    rng = np.random.default_rng(seed)

    def sample(n: int, flips: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        y = rng.integers(0, 10, n)
        mask = rng.random((n, 35)).argsort(1) < flips[:, None]
        return np.abs(glyphs[y] - mask).astype(float), y

    x_train, y_train = sample(20_000, rng.integers(0, 6, 20_000))
    x_test, y_test = sample(5_000, np.full(5_000, 3))
    return x_train, y_train, x_test, y_test


def strip_accents(word: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", word) if not unicodedata.combining(c)
    )


def letter_proportions(text: str) -> list[float]:
    counts = Counter(text)
    return [3 * counts[chr(97 + i)] / len(text) for i in range(26)]


def language_data(languages: list[str], phrase_words: int, seed: int) -> Dataset:
    """Words are split 90/10 by language; test phrases use only held-out words."""
    rng = np.random.default_rng(seed)
    parts: list[list] = [[], [], [], []]
    for label, language in enumerate(languages):
        vocab: dict[str, int] = {}
        for line in (
            sim.fetch(WORDS_URL.format(language)).decode("utf-8-sig").splitlines()
        ):
            word, count = line.rsplit(" ", 1)
            word = strip_accents(word)
            if word.isascii() and word.isalpha() and word.islower() and len(word) >= 2:
                vocab.setdefault(word, int(count))
            if len(vocab) == 5000:
                break
        words = np.array(list(vocab))
        weights = np.array(list(vocab.values()), dtype=float)
        order = rng.permutation(len(words))
        cut = int(len(words) * 0.9)
        for offset, idx, n in ((0, order[:cut], 6000), (2, order[cut:], 1000)):
            picks = rng.choice(
                idx, (n, phrase_words), p=weights[idx] / weights[idx].sum()
            )
            parts[offset] += [letter_proportions("".join(words[p])) for p in picks]
            parts[offset + 1] += [label] * n
    return tuple(np.array(p) for p in parts)


def main() -> None:
    evaluate("mnist", [sim.mnist_data()] * SEEDS, classes=10, epochs=10)

    splits, whole = zoo_splits()
    evaluate("zoo", splits, classes=7, epochs=2000, final=whole)

    letters, text = sim.letters_data()
    b, d = evaluate("letters", [letters] * SEEDS, classes=10, epochs=10)
    letters_report(letters, text, b, d)

    evaluate(
        "dotmatrix (test: 3 of 35 pixels flipped)",
        [dotmatrix_data(s) for s in range(SEEDS)],
        classes=10,
        epochs=20,
    )

    for languages in (LANGUAGES, LANGUAGES[:5]):
        for phrase_words in (1, 6):
            evaluate(
                f"language ({len(languages)} languages, {phrase_words}-word input)",
                [language_data(languages, phrase_words, s) for s in range(SEEDS)],
                classes=len(languages),
                epochs=20,
            )


if __name__ == "__main__":
    main()
