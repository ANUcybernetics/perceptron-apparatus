// Copyright (c) 2025 Ben Swift
// Licensed under CC BY-NC-SA 4.0
#import "@local/anu-typst-template:0.2.0": anu, anu-colors

#show: doc => anu(
  title: "",
  config: (
    theme: "light",
    logos: ("studio", "socy"),
    hide: ("page-numbers", "title-block"),
  ),
  footer_text: text(
    font: "Neon Tubes 2",
    "CC BY-NC-SA 4.0",
  ),
  page-settings: (
    flipped: true,
    margin: (left: 3.2cm, right: 1.6cm, top: 1.6cm, bottom: 1.6cm),
  ),
  doc,
)

#let label(content) = text(font: "Alegreya", content)

#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  {
    v(3.6cm)
    text[Deal 5 playing cards and fill out the whole grid below. For example, if
      *Card 1* is a 7♥ then the first row will be 1-0-0-0-0-1-0; 1s for the *♥*
      and *6-9* columns, 0s for all other columns.
    ]
    v(1em)

    // 5 cards × 7 features grid
    grid(
      columns: (auto,) + (1fr,) * 7,
      gutter: 3pt,
      row-gutter: 3pt,
      // Header row
      [],
      ..("♥", "♠", "♦", "♣", "2-5", "6-9", "10-A").map(label => {
        align(center)[#text(size: 12pt, weight: "bold")[#label]]
      }),
      // Card rows
      ..range(5)
        .map(card => {
          let start = card * 7
          (
            // Row header
            align(center + horizon)[#text(size: 12pt, weight: "bold")[Card #(
                card + 1
              )]],
            // Feature cells
            ..range(7).map(i => {
              rect(
                width: 100%,
                height: 40pt,
                stroke: (thickness: 0.5pt),
              )[
                #align(top + left)[#pad(left: 2pt, top: 2pt)[#text(
                  size: 9pt,
                  fill: gray,
                )[#label[A#(
                    start + i
                  )]]]]
              ]
            }),
          )
        })
        .flatten(),
    )

    v(1em)

    text[
      === Slide rule instructions

      To multiply two values using the slide rule ring: align the first value on
      the outer scale with 1 on the inner scale, then find the second value on
      the inner scale and read the result on the outer scale.
    ]
  },
  [
    #v(3cm)

    == Algorithm

    + set the input layer sliders (#label[A0]-#label[A34]) as per your grid
      (left)

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
      - repeat the same process as in step 2, but using the hidden layer
        (#label[C]) as inputs, the weight layer (#label[D]) as weights, and the
        output layer (#label[E]) as the result

    + the slider in the output layer (#label[E]) with the highest value is the
      network's prediction according to the following table:

      #grid(
        columns: (1fr, 1fr),
        gutter: 1em,
        [#label[E0]: high card], [#label[E1]: pair],
        [#label[E2]: two pair], [#label[E3]: three of a kind],
        [#label[E4]: straight], [#label[E5]: flush],
        [#label[E6]: full house], [#label[E7]: four of a kind],
        [#label[E8]: straight flush], [#label[E9]: royal flush],
      )
  ],
)
