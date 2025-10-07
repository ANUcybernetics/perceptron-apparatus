// Copyright (c) 2025 Ben Swift
// Licensed under CC BY-NC-SA 4.0
#import "@local/anu-typst-template:0.2.0": anu, anu-colors

#show: doc => anu(
  title: "",
  config: (
    theme: "light",
    logos: ("studio",),
    hide: ("page-numbers", "title-block"),
  ),
  page-settings: (
    flipped: true,
    margin: (left: 3.2cm, right: 1.5cm, top: 1.5cm, bottom: 1.5cm),
  ),
  doc,
)

#grid(
  columns: (auto, 1fr),
  gutter: 2cm,
  {
    v(5cm)
    grid(
      columns: 6,
      rows: 6,
      gutter: 0pt,
      ..range(36).map(i => rect(
        width: 50pt,
        height: 50pt,
        stroke: (paint: gray.lighten(40%), thickness: 0.5pt),
      )[
        #set text(size: 7pt, fill: gray.lighten(60%))
        #align(top + left)[#pad(2pt)[A#i]]
      ])
    )
  },
  [
    == Algorithm

    + draw your input image on the 6×6 grid, where each cell A0--A35 represents how much "ink" is in that cell (0 = white, 1 = black)

    + for each slider in ring A (input ring), set the value based on the corresponding cell in the input image grid

    + for each slider in ring A:
      - read slider value
      - read value of same-numbered slider in ring *B0*
      - multiply the two values (using slide rule ring) and _adjust_ the value of slider *C0* by the result

    + repeat step 2 for each bank of sliders in ring B (*B1*, *B2*, etc.) until all of the sliders in ring C have been fully adjusted
      - once that's done, if any slider in ring C has a negative value, set it to 0

    + repeat the process of steps 2 and 3, but starting with ring C (instead of ring A)

    + once all the sliders in ring E have been fully adjusted, the slider in ring E with the highest value is the output value

    === Notes

    This procedure assumes that the weights (rings B and D) are pre-populated with the correct values.

    To _adjust_ by a value means to add or subtract the value from the current value of the slider. To _set_ the value means the slider should show that value (regardless of the previous value).
  ],
)
