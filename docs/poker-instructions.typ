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
    margin: (left: 3.2cm, right: 1.6cm, top: 1.6cm, bottom: 1.6cm),
  ),
  doc,
)

#let label(content) = text(font: "Alegreya", content)

#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  {
    v(4cm)
    text[Deal 5 playing cards and encode them in the grid below. For example if
      your first card was a 7 of spades, you'd put a 1 in the ♠ column and a 1
      in the M row.]
    v(1em)

    text(size: 9pt)[
      *Encoding scheme (7 features per card):*
      - Suit: 4 one-hot (♥, ♠, ♦, ♣)
      - Rank: 3 bins
        - Low (A-4): \[1, 0, 0\]
        - Mid (5-9): \[0, 1, 0\]
        - High (10-K): \[0, 0, 1\]
    ]

    v(1em)

    // 5 cards × 7 features grid
    grid(
      columns: (auto,) + (1fr,) * 7,
      gutter: 3pt,
      row-gutter: 3pt,
      // Header row
      [],
      ..("♥", "♠", "♦", "♣", "L", "M", "H").map(label => {
        align(center)[#text(size: 10pt, weight: "bold")[#label]]
      }),
      // Card rows
      ..range(5)
        .map(card => {
          let start = card * 7
          (
            // Row header
            align(center + horizon)[#text(size: 10pt, weight: "bold")[Card #(
                card + 1
              )]],
            // Feature cells
            ..range(7).map(i => {
              rect(
                width: 100%,
                height: 32pt,
                stroke: (thickness: 0.5pt),
              )[
                #align(center + horizon)[#text(size: 9pt, fill: gray)[#label[A#(
                    start + i
                  )]]]
              ]
            }),
          )
        })
        .flatten(),
    )
  },
  [
    == Algorithm

    + for each of the 5 cards in your hand, encode it in the input layer
      (#label[A]):
      - Card 1: sliders A0--A6
      - Card 2: sliders A7--A13
      - Card 3: sliders A14--A20
      - Card 4: sliders A21--A27
      - Card 5: sliders A28--A34

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
      network's prediction:
      - 0: High card
      - 1: One pair
      - 2: Two pairs
      - 3: Three of a kind
      - 4: Straight
      - 5: Flush
      - 6: Full house
      - 7: Four of a kind
      - 8: Straight flush
      - 9: Royal flush

    == Slide rule instructions
    To multiply two values using the slide rule ring: align the first value on
    the outer scale with 1 on the inner scale, then find the second value on the
    inner scale and read the result on the outer scale.
  ],
)
