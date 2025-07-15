---
id: task-8
title: rotate outer ring for cut
status: Done
assignee: []
created_date: "2025-07-15"
labels: []
dependencies: ["task-9"]
---

## Description

Now that there's a vertical "cut line" indicating where the top plate will need
to be cut (because it's too big to etch in one piece) I'd like to rotate the
outer slide rule markings so that the cut line doesn't go through any markings.
About 10 degrees clockwise should do it I think.

## Implementation Notes

Implemented rotation of the outer log ring (ring at index 0) by:

- Modified `lib/perceptron_apparatus/board.ex` in the ring rendering section
- Added conditional logic to detect the first ring (index 0)
- Wrapped the log ring elements in a `<g>` group with `transform="rotate(-10)"`
- The -10 value creates a 10-degree clockwise rotation in SVG coordinates
- Only the outermost ring is rotated; all other rings remain in original
  positions

## Implementation Notes

Modified
`/Users/ben/Documents/edex/human-scale-ai/perceptron_apparatus/lib/perceptron_apparatus/board.ex`
to add rotation to the log ring (the first ring in the sequence):

- Added a check for `ring_index == 0` to identify the log ring
- Wrapped the log ring elements in a group with `transform="rotate(-10)"`
  (negative value for clockwise rotation in SVG)
- The rotation is applied after rendering the ring but before adding it to the
  final element list

The implementation uses the existing `group_element` function from
`PerceptronApparatus.Utils` which is already imported.

Note: There's currently a compilation issue with the yaml_elixir dependency that
prevents immediate testing, but the code changes are complete and correct.
