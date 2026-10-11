# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "numpy"]
# ///
"""Compare weight-slider scales by how well MNIST accuracy survives reading error.

The apparatus's weight sliders (rings B and D) are set by hand, so every weight
carries a position error that is roughly a fixed physical distance along the
slot. How much that distance matters depends on the scale engraved beside the
slot. This script takes the exported weights in docs/mnist-weights.json,
perturbs each one as if its slider were set with a Gaussian position error
(sigma, as a fraction of slot length), and reports classification accuracy on
the 10,000-image MNIST test set, downsampled to 6x6 exactly as the training
code does.

Scales compared:

- linear: the whole slot spans -5..5, so a position error is a fixed absolute
  weight error
- log, sign separate: the whole slot spans `floor`..5 in magnitude on a log
  scale, with sign carried by some other marker; a position error is a fixed
  relative weight error
- log, mirrored: sign is in the slot, so each half holds one log scale and the
  same position error is twice as large in log terms
- detents: every weight is rounded (in log space) to the nearest of a small set
  of levels, with no position error

On any log scale, magnitudes below `floor` are treated as exactly zero.

Only the weight sliders are noisy. Reading errors on the activation sliders and
the log ring are not modelled.

Run from anywhere with `uv run scripts/slider_scale_sim.py`. It downloads the
MNIST test set (about 1.6 MB) on each run.
"""

import gzip
import json
from collections.abc import Callable
from pathlib import Path

import httpx
import numpy as np

REPO = Path(__file__).resolve().parent.parent
MNIST_BASE = "https://storage.googleapis.com/cvdf-datasets/mnist/"
WMAX = 5.0
SAMPLE_INDICES = [0, 5, 9, 14, 18, 23]
COARSE_LEVELS = np.array([0.1, 0.2, 0.5, 1, 2, 5])
FINE_LEVELS = np.array([0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 1, 1.5, 2, 3, 5])
SIGMAS = [0.005, 0.01, 0.02, 0.05]
TRIALS = 200

rng = np.random.default_rng(0)


def fetch_idx(name: str, header_bytes: int) -> np.ndarray:
    response = httpx.get(MNIST_BASE + name, follow_redirects=True)
    response.raise_for_status()
    return np.frombuffer(
        gzip.decompress(response.content), np.uint8, offset=header_bytes
    )


def load_test_set() -> tuple[np.ndarray, np.ndarray]:
    images = fetch_idx("t10k-images-idx3-ubyte.gz", 16).reshape(-1, 28, 28)
    labels = fetch_idx("t10k-labels-idx1-ubyte.gz", 8)
    downsampled = images[:, SAMPLE_INDICES][:, :, SAMPLE_INDICES].reshape(-1, 36) / 255
    return downsampled, labels


def accuracy(b: np.ndarray, d: np.ndarray, x: np.ndarray, y: np.ndarray) -> float:
    return float((np.argmax(np.maximum(x @ b, 0) @ d, axis=1) == y).mean())


def linear(w: np.ndarray, sigma: float) -> np.ndarray:
    return np.clip(w + rng.normal(0, sigma * 2 * WMAX, w.shape), -WMAX, WMAX)


def log(w: np.ndarray, sigma: float, floor: float, mirrored: bool) -> np.ndarray:
    decades = np.log10(WMAX / floor)
    # fraction of the slot available for magnitude
    span = 0.5 if mirrored else 1.0
    magnitude = np.abs(w)
    position = np.log10(np.maximum(magnitude, floor) / floor) / decades
    position = np.clip(position + rng.normal(0, sigma / span, w.shape), 0, 1)
    read = floor * 10 ** (position * decades)
    return np.where(magnitude < floor, 0.0, np.sign(w) * read)


def detent(w: np.ndarray, levels: np.ndarray) -> np.ndarray:
    magnitude = np.abs(w)
    log_distance = np.abs(
        np.log(np.maximum(magnitude, 1e-12))[..., None] - np.log(levels)
    )
    nearest = levels[np.argmin(log_distance, axis=-1)]
    return np.where(magnitude < levels[0] / 2, 0.0, np.sign(w) * nearest)


def main() -> None:
    x, y = load_test_set()
    weights = json.loads((REPO / "docs/mnist-weights.json").read_text())
    b, d = np.array(weights["B"]), np.array(weights["D"])

    print(f"exact weights: {accuracy(b, d, x, y):.3f}  (n={len(y)})")
    for name, m in (("B", b), ("D", d)):
        a = np.abs(m).ravel()
        print(
            f"  |{name}|: <0.05 {np.mean(a < 0.05):.0%}, <0.5 {np.mean(a < 0.5):.0%}, <1 {np.mean(a < 1):.0%}"
        )

    print("\nno position error:")
    for levels in (COARSE_LEVELS, FINE_LEVELS):
        acc = accuracy(detent(b, levels), detent(d, levels), x, y)
        print(f"  detents {levels.tolist()}: {acc:.3f}")
    for floor in (0.01, 0.05):
        acc = accuracy(
            np.where(np.abs(b) < floor, 0, b), np.where(np.abs(d) < floor, 0, d), x, y
        )
        print(f"  floor {floor} only: {acc:.3f}")

    schemes: dict[str, Callable[[np.ndarray, float], np.ndarray]] = {
        "linear ±5": linear,
        "log, sign separate, floor 0.01": lambda m, s: log(m, s, 0.01, False),
        "log, sign separate, floor 0.05": lambda m, s: log(m, s, 0.05, False),
        "log, mirrored, floor 0.01": lambda m, s: log(m, s, 0.01, True),
        "log, mirrored, floor 0.05": lambda m, s: log(m, s, 0.05, True),
    }
    print(
        f"\nmean accuracy ± sd over {TRIALS} trials, by sigma (fraction of slot length):"
    )
    print(f"{'scheme':34}" + "".join(f"{s:>14.1%}" for s in SIGMAS))
    for name, perturb in schemes.items():
        cells = []
        for sigma in SIGMAS:
            accs = [
                accuracy(perturb(b, sigma), perturb(d, sigma), x, y)
                for _ in range(TRIALS)
            ]
            cells.append(f"{np.mean(accs):.3f}±{np.std(accs):.3f}")
        print(f"{name:34}" + "".join(f"{c:>14}" for c in cells))


main()
