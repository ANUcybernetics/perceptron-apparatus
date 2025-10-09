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
    text[Deal 5 playing cards and encode them on this grid using the encoding scheme below.]
    v(1em)

    text(size: 10pt)[
      *Encoding scheme (7 features per card):*
      - Suit: 4 one-hot indicators (Hearts, Spades, Diamonds, Clubs)
      - Rank bins: 3 indicators
        - Low (A-4): \[1, 0, 0\]
        - Mid (5-9): \[0, 1, 0\]
        - High (10-K): \[0, 0, 1\]
    ]

    v(1em)
    layout(size => {
      let cell-size = size.width / 6
      grid(
        columns: 6,
        rows: 6,
        gutter: 0pt,
        ..range(36).map(i => {
          let card-num = calc.quo(i, 7) + 1
          let feature = calc.rem(i, 7)
          let feature-label = if feature == 0 {"♥"}
            else if feature == 1 {"♠"}
            else if feature == 2 {"♦"}
            else if feature == 3 {"♣"}
            else if feature == 4 {"L"}
            else if feature == 5 {"M"}
            else {"H"}

          rect(
            width: cell-size,
            height: cell-size,
            stroke: (thickness: 0.5pt),
          )[
            #set text(size: 8pt, fill: gray)
            #align(top + left)[#pad(2pt)[#label[A#i]]]
            #if i < 35 [
              #align(bottom + right)[#pad(2pt)[#text(size: 6pt)[C#card-num#feature-label]]]
            ]
          ]
        })
      )
    })
  },
  [
    == Algorithm

    + for each of the 5 cards in your hand, encode it in the input layer (#label[A]):
      - Card 1: sliders A0--A6
      - Card 2: sliders A7--A13
      - Card 3: sliders A14--A20
      - Card 4: sliders A21--A27
      - Card 5: sliders A28--A34
      - Slider A35: set to 0 (padding)

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
