"""Shared pieces for the analysis scripts: the apparatus's forward pass, its
weight scale, the slider-noise model, and the task datasets.

Not a script; imported by slider_scale_sim.py and candidate_tasks.py.
"""

import gzip
from pathlib import Path

import httpx
import numpy as np

REPO = Path(__file__).resolve().parent.parent
MNIST_BASE = "https://storage.googleapis.com/cvdf-datasets/mnist/"
SAMPLE_INDICES = [0, 5, 9, 14, 18, 23]
BOOK_URLS = [
    "https://www.gutenberg.org/files/11/11-0.txt",
    "https://www.gutenberg.org/files/1342/1342-0.txt",
]
ALPHABET = "etaoinshr "

# the weight scale and slider ranges, as in lib/perceptron_apparatus/utils.ex
# and PerceptronApparatus.MLP.fit_weights_to_apparatus/2
WEIGHT_MIN = 0.02
WEIGHT_MAX = 5.0
WEIGHT_ZERO_GAP = 0.12
HIDDEN_MAX = 5.0
OUTPUT_MAX = 5.0

Dataset = tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]

rng = np.random.default_rng(0)


def fetch(url: str) -> bytes:
    response = httpx.get(url, follow_redirects=True, timeout=60)
    response.raise_for_status()
    return response.content


def one_hot(labels: np.ndarray, classes: int) -> np.ndarray:
    return np.eye(classes)[labels]


def forward(b: np.ndarray, d: np.ndarray, x: np.ndarray) -> np.ndarray:
    return np.maximum(x @ b, 0) @ d


def accuracy(b: np.ndarray, d: np.ndarray, x: np.ndarray, y: np.ndarray) -> float:
    return float((np.argmax(forward(b, d, x), axis=1) == y).mean())


def accumulation_peaks(values: np.ndarray, weights: np.ndarray) -> np.ndarray:
    """Largest magnitude each accumulator reaches while its products are added
    one at a time, in slider order, over all the rows."""
    running = np.cumsum(values[:, :, None] * weights[None, :, :], axis=1)
    return np.abs(running).max(axis=(0, 1))


def fit_to_apparatus(
    b: np.ndarray, d: np.ndarray, x: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Port of PerceptronApparatus.MLP.fit_weights_to_apparatus/2: rescale so every
    hidden and output slider stays in range over `x`, then zero unsettable weights."""
    x = x[:10_000]
    with np.errstate(divide="ignore"):
        scale = np.minimum(
            HIDDEN_MAX / accumulation_peaks(x, b), WEIGHT_MAX / np.abs(b).max(0)
        )
    scale = np.where(np.isfinite(scale), scale, 1.0)
    b, d = b * scale, d / scale[:, None]
    hidden = np.maximum(x @ b, 0)
    with np.errstate(divide="ignore"):
        out_scale = min(
            OUTPUT_MAX / accumulation_peaks(hidden, d).max(),
            WEIGHT_MAX / np.abs(d).max(),
        )
    d = d * (out_scale if np.isfinite(out_scale) else 1.0)
    return np.where(np.abs(b) < WEIGHT_MIN, 0, b), np.where(
        np.abs(d) < WEIGHT_MIN, 0, d
    )


def linear_scale(w: np.ndarray, sigma: float, top: float | None = None) -> np.ndarray:
    """A slider set on a linear scale spanning plus and minus `top`, with position
    error `sigma`. By default `top` is the layer's largest weight, the best case
    for a linear scale."""
    top = np.abs(w).max() if top is None else top
    return np.clip(w + rng.normal(0, sigma * 2 * top, w.shape), -top, top)


def log_scale(w: np.ndarray, sigma: float) -> np.ndarray:
    """A slider set on the log weight scale, with position error `sigma`:
    a zero park position, then WEIGHT_MIN to WEIGHT_MAX on a log scale, with sign
    carried by the marker and so never misread."""
    magnitude = np.minimum(np.abs(w), WEIGHT_MAX)
    decades = np.log(WEIGHT_MAX / WEIGHT_MIN)
    fraction = np.where(
        magnitude < WEIGHT_MIN,
        0.0,
        WEIGHT_ZERO_GAP
        + (1 - WEIGHT_ZERO_GAP)
        * np.log(np.maximum(magnitude, WEIGHT_MIN) / WEIGHT_MIN)
        / decades,
    )
    fraction = np.clip(fraction + rng.normal(0, sigma, w.shape), 0, 1)
    read = WEIGHT_MIN * np.exp(
        np.maximum(fraction - WEIGHT_ZERO_GAP, 0) / (1 - WEIGHT_ZERO_GAP) * decades
    )
    # a slider nearer the zero mark than the first tick reads as zero
    return np.where(fraction < WEIGHT_ZERO_GAP / 2, 0.0, np.sign(w) * read)


def fetch_idx(name: str, header_bytes: int) -> np.ndarray:
    return np.frombuffer(
        gzip.decompress(fetch(MNIST_BASE + name)), np.uint8, offset=header_bytes
    )


def mnist_data() -> Dataset:
    """The 60,000-image training set and 10,000-image test set, downsampled to 6x6
    as the training code does."""

    def images(name: str) -> np.ndarray:
        full = fetch_idx(name, 16).reshape(-1, 28, 28)
        return full[:, SAMPLE_INDICES][:, :, SAMPLE_INDICES].reshape(-1, 36) / 255

    return (
        images("train-images-idx3-ubyte.gz"),
        fetch_idx("train-labels-idx1-ubyte.gz", 8).astype(int),
        images("t10k-images-idx3-ubyte.gz"),
        fetch_idx("t10k-labels-idx1-ubyte.gz", 8).astype(int),
    )


def zoo_data() -> tuple[np.ndarray, np.ndarray]:
    """All 101 animals: 15 yes/no traits then a one-hot leg count, and the class."""
    rows = [line.split(",") for line in (REPO / "priv/zoo.data").read_text().split()]
    traits = np.array([[int(v) for v in row[1:17]] for row in rows])
    legs = traits[:, 12]
    x = np.hstack(
        [
            np.delete(traits, 12, axis=1),
            np.array([[float(v == n) for n in (0, 2, 4, 5, 6, 8)] for v in legs]),
        ]
    ).astype(float)
    return x, np.array([int(row[17]) - 1 for row in rows])


def letters_data() -> tuple[Dataset, str]:
    """Next-symbol examples from two novels reduced to the words spelt with the
    alphabet; the last tenth of the text is the test set. Also returns the text."""
    keep = set(ALPHABET.strip())
    words = [
        w
        for url in BOOK_URLS
        for w in "".join(
            c if c.isalpha() else " "
            for c in fetch(url)
            .decode("utf-8-sig")
            .lower()
            .replace("'", "")
            .replace("’", "")
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
