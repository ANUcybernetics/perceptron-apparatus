# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "numpy"]
# ///
"""Check whether candidate demonstration tasks fit the apparatus.

Each task is trained at the apparatus's architecture (at most 36 inputs, 6
bias-free ReLU hidden units, at most 10 bias-free linear outputs, MSE loss on
one-hot targets, Adam) and scored on held-out data over several seeds. For
context each task also reports the majority-class share and the same network
with 64 hidden units, which shows how much the 6-unit bottleneck costs.

The first seed's weights are then scaled so each layer peaks at 5, as the weight
export does, and put through the slider-noise model from slider_scale_sim.py
(see its docstring) on a linear scale and on a full-slot log scale with sign
carried separately.

Tasks:

- zoo: UCI Zoo, 15 yes/no animal traits plus one-hot leg count (21 inputs) to
  7 animal classes; 101 animals, so scored by repeated 5-fold cross-validation
- letters: next-symbol prediction over a 10-symbol alphabet (the letters
  "etaoinshr" and space) from the 3 previous symbols, one-hot (30 inputs); the
  corpus is two novels reduced to the words spelt with only those letters
- dotmatrix: 5x7 dot-matrix digits (35 inputs) with pixels flipped at random
- language: which of 10 (or 5) languages a word or 6-word phrase is in, from
  its 26 letter proportions with diacritics stripped

Run with `uv run scripts/candidate_tasks.py`. It downloads its data on each run.
"""

import sys
import unicodedata
from collections import Counter
from pathlib import Path

import httpx
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import slider_scale_sim as sim

SEEDS = 5
NOISE_TRIALS = 50
NOISE_SIGMAS = [0.01, 0.02, 0.05]
LOG_FLOOR = 0.02
ZOO_URL = "https://archive.ics.uci.edu/ml/machine-learning-databases/zoo/zoo.data"
BOOK_URLS = [
    "https://www.gutenberg.org/files/11/11-0.txt",
    "https://www.gutenberg.org/files/1342/1342-0.txt",
]
WORDS_URL = "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{0}/{0}_50k.txt"
ALPHABET = "etaoinshr "
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

Dataset = tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]


def fetch(url: str) -> str:
    response = httpx.get(url, follow_redirects=True, timeout=60)
    response.raise_for_status()
    return response.content.decode("utf-8-sig")


def one_hot(labels: np.ndarray, classes: int) -> np.ndarray:
    return np.eye(classes)[labels]


def train(
    x: np.ndarray, y: np.ndarray, classes: int, hidden: int, epochs: int, seed: int
) -> tuple[np.ndarray, np.ndarray]:
    """Bias-free ReLU MLP trained with MSE on one-hot targets and Adam."""
    rng = np.random.default_rng(seed)
    params = [
        rng.normal(0, np.sqrt(2 / x.shape[1]), (x.shape[1], hidden)),
        rng.normal(0, np.sqrt(1 / hidden), (hidden, classes)),
    ]
    moments = [[np.zeros_like(p), np.zeros_like(p)] for p in params]
    targets = one_hot(y, classes)
    step = 0
    for _ in range(epochs):
        order = rng.permutation(len(x))
        for start in range(0, len(x), 128):
            batch = order[start : start + 128]
            h = np.maximum(x[batch] @ params[0], 0)
            delta = 2 * (h @ params[1] - targets[batch]) / len(batch)
            grads = [x[batch].T @ ((delta @ params[1].T) * (h > 0)), h.T @ delta]
            step += 1
            for p, g, m in zip(params, grads, moments, strict=True):
                m[0] = 0.9 * m[0] + 0.1 * g
                m[1] = 0.999 * m[1] + 0.001 * g**2
                p -= (
                    0.005
                    * (m[0] / (1 - 0.9**step))
                    / (np.sqrt(m[1] / (1 - 0.999**step)) + 1e-8)
                )
    return params[0], params[1]


def scale_to_apparatus(b: np.ndarray, d: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    return b * sim.WMAX / np.abs(b).max(), d * sim.WMAX / np.abs(d).max()


def noise_report(b: np.ndarray, d: np.ndarray, x: np.ndarray, y: np.ndarray) -> None:
    b, d = scale_to_apparatus(b, d)
    small = np.mean(np.abs(np.concatenate([b.ravel(), d.ravel()])) < 0.5)
    print(f"  scaled weights below 0.5 in magnitude: {small:.0%}")
    schemes = {
        "linear": sim.linear,
        "log": lambda m, s: sim.log(m, s, LOG_FLOOR, False),
    }
    for name, perturb in schemes.items():
        cells = []
        for sigma in NOISE_SIGMAS:
            accs = [
                sim.accuracy(perturb(b, sigma), perturb(d, sigma), x, y)
                for _ in range(NOISE_TRIALS)
            ]
            cells.append(f"{sigma:.0%}: {np.mean(accs):.3f}")
        print(f"  slider noise, {name:6} scale  " + "  ".join(cells))


def evaluate(
    name: str,
    splits: list[Dataset],
    classes: int,
    epochs: int,
    final: Dataset | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """Train on each split and report held-out accuracy at 6 and 64 hidden units.

    The noise check uses the best 6-hidden model on its own test data, or, when
    `final` is given, a model trained and checked on that dataset instead.
    Returns the weights used for the noise check.
    """
    print(f"\n=== {name} ===")
    x_test, y_test = splits[0][2], splits[0][3]
    print(
        f"inputs {splits[0][0].shape[1]}, outputs {classes}, "
        f"train {len(splits[0][0])}, test {len(x_test)}, "
        f"majority class {np.bincount(y_test).max() / len(y_test):.3f}"
    )
    models = []
    for hidden in (6, 64):
        accs = []
        for seed, (x_train, y_train, x_te, y_te) in enumerate(splits):
            b, d = train(x_train, y_train, classes, hidden, epochs, seed)
            accs.append(sim.accuracy(b, d, x_te, y_te))
            if hidden == 6:
                models.append((accs[-1], b, d, x_te, y_te))
        print(
            f"  {hidden:2} hidden: accuracy {np.mean(accs):.3f} ± {np.std(accs):.3f}, "
            f"best {np.max(accs):.3f}"
        )
    if final is not None:
        fits = [
            train(final[0], final[1], classes, 6, epochs, seed) for seed in range(SEEDS)
        ]
        models = [
            (sim.accuracy(b, d, final[2], final[3]), b, d, final[2], final[3])
            for b, d in fits
        ]
    acc, b, d, x_noise, y_noise = max(models, key=lambda m: m[0])
    print(
        f"  model used for the noise check: accuracy {acc:.3f} on {len(y_noise)} examples"
    )
    noise_report(b, d, x_noise, y_noise)
    return b, d


def zoo_splits() -> tuple[list[Dataset], Dataset]:
    """Repeated 5-fold splits, plus the whole dataset as both train and test."""
    rows = [line.split(",") for line in fetch(ZOO_URL).split()]
    traits = np.array([[int(v) for v in row[1:17]] for row in rows])
    legs = traits[:, 12]
    leg_values = sorted(set(legs.tolist()))
    x = np.hstack(
        [
            np.delete(traits, 12, axis=1),
            np.array([[float(v == n) for n in leg_values] for v in legs]),
        ]
    ).astype(float)
    y = np.array([int(row[17]) - 1 for row in rows])
    splits = []
    for repeat in range(SEEDS):
        order = np.random.default_rng(repeat).permutation(len(x))
        for fold in range(5):
            test = order[fold::5]
            train_idx = np.setdiff1d(order, test)
            splits.append((x[train_idx], y[train_idx], x[test], y[test]))
    return splits, (x, y, x, y)


def letters_data() -> tuple[Dataset, str]:
    keep = set(ALPHABET.strip())
    words = [
        w
        for url in BOOK_URLS
        for w in "".join(
            c if c.isalpha() else " "
            for c in fetch(url).lower().replace("'", "").replace("’", "")
        ).split()
        if set(w) <= keep
        and (len(w) > 1 or w in "ai")
        and not (len(w) > 1 and set(w) == {"i"})
    ]
    text = " ".join(words)
    codes = np.array([ALPHABET.index(c) for c in text])
    x = np.hstack([one_hot(codes[i : len(codes) - 3 + i], 10) for i in range(3)])
    y = codes[3:]
    cut = int(len(y) * 0.9)
    return (x[:cut], y[:cut], x[cut:], y[cut:]), text


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
    out = [ALPHABET.index(c) for c in "the"]
    for _ in range(120):
        probs = np.maximum(
            sim.forward(b, d, one_hot(np.array(out[-3:]), 10).reshape(1, 30))[0], 0
        )
        probs = probs if probs.sum() > 0 else np.ones(10)
        out.append(int(rng.choice(10, p=probs / probs.sum())))
    print(f"  sampled from the 6-hidden model: '{''.join(ALPHABET[i] for i in out)}'")


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
        for line in fetch(WORDS_URL.format(language)).splitlines():
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
    splits, whole = zoo_splits()
    evaluate("zoo", splits, classes=7, epochs=2000, final=whole)

    letters, text = letters_data()
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
