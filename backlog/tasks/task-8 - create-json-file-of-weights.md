---
id: task-8
title: create json file of weights
status: Done
assignee: []
created_date: '2025-10-07 05:03'
updated_date: '2026-10-12 02:44'
labels: []
dependencies: []
---

As well as being able to train a model (for a given model size/shape) I'd like
to be able to write all the weights to a json file. I think that the top level
keys should be "B" and "D" (because that's how the two weight matrices are named
on the board) and within each of those there should be list of lists of weights.

However, ultimately the goal is to format these weights into a 2D table (in
typst, via its ability to read a json file), so I'd like to consider different
options for the best data structure to use (perhaps a flat one is better).

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Closed by audit 2026-10-12: mix perceptron.export_weights writes docs/{mnist,zoo,letters}-weights.json, which docs/mnist-poster.typ reads into the B and D tables.
<!-- SECTION:NOTES:END -->
