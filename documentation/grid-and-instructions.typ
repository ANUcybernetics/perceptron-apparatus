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
    margin: (left: 3.2cm, right: 2cm, top: 2cm, bottom: 2cm),
  ),
  doc,
)

#let label(content) = text(font: "Alegreya", content)

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
        stroke: (thickness: 0.5pt),
      )[
        #set text(size: 8pt, fill: gray)
        #align(top + left)[#pad(2pt)[#label[A#i]]]
      ])
    )
  },
  [
    == Algorithm

    + draw your input image on the 6×6 grid (whatever you like!)

    + for each cell #label[A0]--#label[A35] set the corresponding slider in ring
      #label[A] (input ring) based on how much "ink" is in that cell (white = 0,
      black = 1)

    + for each slider in ring #label[A]:
      - read slider value
      - read value of same-numbered slider in ring #label[B0]
      - multiply the two values (using slide rule ring) and _adjust_ the value
        of slider #label[C0] by the result

    + repeat step 3 for each bank of sliders in ring #label[B] (#label[B1],
      #label[B2], etc.) until all of the sliders in ring #label[C] have been
      fully adjusted
      - once that's done, if any slider in ring #label[C] has a negative value,
        set it to 0

    + repeat the process of steps 3 and 4, but starting with ring #label[C]
      (instead of ring #label[A])

    + once all the sliders in ring #label[E] have been fully adjusted, the
      slider in ring #label[E] with the highest value is the output value

    === Notes

    This procedure assumes that the weights (rings #label[B] and #label[D]) are
    pre-populated with the correct values.

    To _adjust_ by a value means to add or subtract the value from the current
    value of the slider. To _set_ the value means the slider should show that
    value (regardless of the previous value).
  ],
)
