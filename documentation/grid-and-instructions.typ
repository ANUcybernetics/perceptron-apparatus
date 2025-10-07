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
    v(4cm)
    text[Draw your input image on this grid---can be whatever you like!]
    v(1em)
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

    + for each cell #label[A0]--#label[A35] set the corresponding slider in the
      input layer (#label[A]) to match how much "ink" is in that cell (white =
      0, black = 1)

    + calculate the hidden layer (#label[C]) values:
      - for each slider in the input layer (#label[A]) and each weight bank
        #label[B0]--#label[B5]:
        - read the input value from the input layer (#label[A])
        - read the corresponding weight from the current bank in the weight
          layer (#label[B])
        - multiply these values using the slide rule ring (see below)
        - add the result to the corresponding slider in the hidden layer
          (#label[C])
      - once all weights have been processed, set any negative values in the
        hidden layer (#label[C]) to 0

    + calculate the output layer (#label[E]) values:
      - repeat the same process, but using the hidden layer (#label[C]) as
        inputs, the weight layer (#label[D]) as weights, and the output layer
        (#label[E]) as the destination
      - once all weights have been processed, set any negative values in the
        output layer (#label[E]) to 0

    + the slider in the output layer (#label[E]) with the highest value is the
      network's prediction

    == Slide rule instructions
    To multiply two values using the slide rule ring: align the first value on
    the outer scale with 1 on the inner scale, then find the second value on the
    inner scale and read the result on the outer scale.
  ],
)
