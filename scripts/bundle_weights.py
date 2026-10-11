# /// script
# requires-python = ">=3.12"
# ///
"""Regenerate js/src/widgets/weights.ts from docs/*-weights.json.

Run with `uv run scripts/bundle_weights.py` after exporting new weights, then
rebuild and commit `js/dist/`.
"""

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
TASKS = ("mnist", "zoo", "letters")
HEADER = """// Generated from docs/*-weights.json by scripts/bundle_weights.py.
// Every set is padded with zeros to the 36-input, 10-output board, and rounded
// to six significant figures.

export interface Weights {
  B: number[][];
  D: number[][];
}
"""


def matrix(rows: list[list[float]]) -> str:
    lines = [
        "    [" + ", ".join("0" if v == 0 else f"{v:.6g}" for v in row) + "],"
        for row in rows
    ]
    return "\n".join(lines)


def main() -> None:
    parts = [HEADER]
    for task in TASKS:
        weights = json.loads((REPO / f"docs/{task}-weights.json").read_text())
        parts.append(
            f"export const {task}Weights: Weights = {{\n"
            f"  B: [\n{matrix(weights['B'])}\n  ],\n"
            f"  D: [\n{matrix(weights['D'])}\n  ],\n}};\n"
        )
    (REPO / "js/src/widgets/weights.ts").write_text("\n".join(parts))


main()
