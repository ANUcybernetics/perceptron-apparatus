---
id: task-8
title: create json file of weights
status: To Do
assignee: []
created_date: "2025-10-07 05:03"
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
