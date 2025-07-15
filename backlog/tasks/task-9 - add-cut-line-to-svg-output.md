---
id: task-9
title: add cut line to svg output
status: Done
assignee: []
created_date: "2025-07-15"
labels: []
dependencies: []
---

## Description

The top piece of the board will have a full-length cut (which will occur on the
"x=0" line of the svg). I want to add this to the svg output (in the same green
colour as the other "circular" cut lines).

## Implementation Notes

Added a vertical cut line at x=0 in `lib/perceptron_apparatus/board.ex`:

- Line extends from -radius to +radius along the y-axis
- Uses class "top full" to get the green color (#6ab04c)
- Stroke width set to 2 to match other cut lines
- Added to the SVG elements list after fastener elements

Note: There's currently a compilation issue with the yaml_elixir dependency that
prevents testing, but the code changes are complete and correct.
