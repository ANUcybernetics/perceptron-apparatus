---
id: task-10
title: extend bottom slot for pill-shaped slider
status: Done
assignee: []
created_date: "2025-07-15"
labels: []
dependencies: []
---

## Description

Currently, the bottom slider channels are (for both azimuthal and radial rings)
are drawn with the same round-end-cap line, but just a different thickness (and
even that's done in CSS).

I need to extend the bottom slider channel (the wider one) so that it extends an
extra 8 units at either end, to accomodate a pill-shaped captive slider bottom.

## Implementation Notes

Extended bottom slider channels by 8 units at each end:

### Azimuthal Rings (`lib/perceptron_apparatus/azimuthal_ring.ex`):

- Calculated angular extension based on radius:
  `angular_extension_rad = 8 / radius`
- Converted radians to degrees:
  `angular_extension_deg = angular_extension_rad * 180 / π`
- Created extended coordinates for the arc endpoints by adjusting angles
- Modified the bottom slider SVG path to use extended start/end points
- Top slider remains unchanged with original dimensions

### Radial Rings (`lib/perceptron_apparatus/rings/radial_ring.ex`):

- Added 8-unit extension to both ends of the straight line
- Modified bottom slider path translation to extend outward by 8 units
- Extended line length by 16 units total (8 at each end)
- Top slider remains unchanged with original dimensions

The CSS styling (`.bottom.slider` with `stroke-width: 8` and rounded end caps)
creates the pill-shaped channel effect for accommodating captive slider bottoms.
