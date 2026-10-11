# /// script
# requires-python = ">=3.12"
# dependencies = ["httpx", "numpy"]
# ///
"""Check the exported weights against the apparatus: do the sliders stay in
range, and how well does accuracy survive the error in setting a weight slider?

For each of docs/mnist-weights.json, docs/zoo-weights.json and
docs/letters-weights.json this reports:

- accuracy with the weights exactly as exported: on the 10,000-image MNIST test
  set, on all 101 zoo animals (most of which the model was trained on), and on
  the held-out last tenth of the letters text
- the largest value any hidden or output slider reaches while accumulating,
  which should be about the end of its scale (5)
- accuracy when every weight slider is set with a Gaussian position error
  (sigma, as a fraction of slot length), on three scales:
  - log: the scale the apparatus has, a zero park position then 0.02 to 5 on a
    log scale, with sign on the slider marker
  - linear ±5: the linear scale the apparatus used to have
  - linear to fit: a linear scale spanning plus and minus the layer's largest
    weight, which would have to be engraved to suit one particular set of
    weights and is the most favourable linear scale possible for them

Only the weight sliders are noisy. Reading errors on the input, hidden and
output sliders and on the log ring are not modelled.

The comparison that led to the log scale was run on the earlier linear-scale
weights; that version of this script is at the `linear-weight-scale` tag.

Run from anywhere with `uv run scripts/slider_scale_sim.py`. It downloads the
MNIST and letters data on each run.
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import apparatus_sim as sim

SIGMAS = [0.005, 0.01, 0.02, 0.05]
TRIALS = 200


def check(task: str, x: np.ndarray, y: np.ndarray) -> None:
    weights = json.loads((sim.REPO / f"docs/{task}-weights.json").read_text())
    # exported weights are padded to the 36-input, 10-output board
    b = np.array(weights["B"])[: x.shape[1]]
    d = np.array(weights["D"])[:, : y.max() + 1]

    print(f"\n=== {task} ===")
    print(f"majority class share: {np.bincount(y).max() / len(y):.3f}")
    print(f"exact weights: accuracy {sim.accuracy(b, d, x, y):.3f}  (n={len(y)})")
    hidden_peak = sim.accumulation_peaks(x[:10_000], b).max()
    output_peak = sim.accumulation_peaks(np.maximum(x[:10_000] @ b, 0), d).max()
    print(
        f"largest hidden slider value {hidden_peak:.2f}, largest output {output_peak:.2f}"
    )
    for name, m in (("B", b), ("D", d)):
        a = np.abs(m).ravel()
        print(
            f"  |{name}|: largest {a.max():.2f}, zero {np.mean(a == 0):.0%}, "
            f"below 0.1 {np.mean(a < 0.1):.0%}, negative {np.mean(m < 0):.0%}"
        )

    print(
        f"mean accuracy ± sd over {TRIALS} trials, by sigma (fraction of slot length):"
    )
    print(f"{'scale':14}" + "".join(f"{s:>14.1%}" for s in SIGMAS))
    scales = (
        ("log", sim.log_scale),
        ("linear ±5", lambda w, sigma: sim.linear_scale(w, sigma, sim.WEIGHT_MAX)),
        ("linear to fit", sim.linear_scale),
    )
    for name, perturb in scales:
        cells = []
        for sigma in SIGMAS:
            accs = [
                sim.accuracy(perturb(b, sigma), perturb(d, sigma), x, y)
                for _ in range(TRIALS)
            ]
            cells.append(f"{np.mean(accs):.3f}±{np.std(accs):.3f}")
        print(f"{name:14}" + "".join(f"{c:>14}" for c in cells))


def main() -> None:
    _, _, x, y = sim.mnist_data()
    check("mnist", x, y)
    check("zoo", *sim.zoo_data())
    (_, _, x, y), _ = sim.letters_data()
    check("letters", x, y)


if __name__ == "__main__":
    main()
