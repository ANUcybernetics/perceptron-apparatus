// Copyright (c) 2025 Ben Swift
// Licensed under CC BY-NC-SA 4.0

// Import base template for colors and styling
#import "@local/anu-typst-template:0.2.0": *

#show: doc => anu(
  title: "Perceptron Apparatus",
  paper: "a3",
  footer_text: text(
    font: "Neon Tubes 2",
    fill: anu-colors.socy-yellow,
    "CC BY-NC-SA 4.0",
  ),
  config: (
    theme: "dark",
    logos: ("studio",),
    hide: ("page-numbers", "title-block"),
  ),
  page-settings: (
    flipped: true,
  ),
  doc,
)

// #place(bottom + right, dx: -1cm)[
//   #text(font: "Neon Tubes 2", fill: anu-colors.socy-yellow-print, size: 24pt)[
//     Cybernetic\
//     Studio
//   ]
// ]

// Load weights
#let weights = json("poker-weights.json")
#let model_name = [Poker]

// Helper function to format weight values
#let fmt(x) = {
  let val = calc.round(x, digits: 1)
  let formatted = if calc.abs(val - calc.round(val)) < 0.01 {
    str(int(val)) + ".0"
  } else {
    str(val)
  }
  if val == 0 {
    text(fill: gray.darken(20%), formatted)
  } else {
    formatted
  }
}

// Content: 2-column layout
#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  [
    #v(3cm) // Add vertical space to push title down
    #text(size: 3em, fill: anu-colors.gold)[*Perceptron Apparatus*]

    #text(size: 1em)[
      Is it an abacus? Is it an ouija board? No, it's a perceptron apparatus---a
      physical device capable of performing the Artificial Neural Network
      calculations that underpin all of modern AI.
    ]

    #v(0.5cm)

    #align(center)[
      #image("apparatus1.svg", width: 100%)
    ]
  ],
  [
    // #if "test_accuracy" in weights [
    //   Test accuracy: #calc.round(weights.test_accuracy * 100, digits: 1)%
    //   (#calc.round(weights.test_accuracy / 0.1, digits: 1) times better than
    //   chance)

    //   #v(0.5cm)
    // ]

    #let label(txt) = text(font: "Alegreya", txt)

    // Total gutter: 4em (1em + 3em = 25% + 75%)
    // Columns need to fit: 100% - 4em
    #let col-width = (100% - 4em) / 3

    #grid(
      columns: (col-width, col-width, col-width),
      column-gutter: (1.5em, 4em),
      rows: (auto, auto),
      row-gutter: 0.5cm,
      // Heading row
      grid.cell(colspan: 2)[
        == #model_name weights (#label("B"))
        _Input → Hidden ($36 times 6$)_
      ],
      [
        == #model_name weights (#label("D"))
        _Hidden → Output ($6 times 10$)_
      ],
      // Table content row
      // B table first half: rows 0-17
      [
        #set text(size: 7pt)
        #table(
          columns: 7,
          align: (col, row) => if col == 0 { right } else { right },
          [],
          [*#label[B0]*],
          [*#label[B1]*],
          [*#label[B2]*],
          [*#label[B3]*],
          [*#label[B4]*],
          [*#label[B5]*],
          ..weights
            .B
            .slice(0, 18)
            .enumerate()
            .map(((i, row)) => (
              [*#label(str(i))*],
              ..row.map(fmt),
            ))
            .flatten(),
        )
      ],
      // B table second half: rows 18-35
      [
        #set text(size: 7pt)
        #table(
          columns: 7,
          align: (col, row) => if col == 0 { right } else { right },
          [],
          [*#label[B0]*],
          [*#label[B1]*],
          [*#label[B2]*],
          [*#label[B3]*],
          [*#label[B4]*],
          [*#label[B5]*],
          ..weights
            .B
            .slice(18)
            .enumerate()
            .map(((i, row)) => (
              [*#label(str(i + 18))*],
              ..row.map(fmt),
            ))
            .flatten(),
        )
      ],
      // D table in third column
      [
        #set text(size: 7pt)
        // First 5 columns (D0-D4)
        #table(
          columns: 6,
          align: (col, row) => if col == 0 { right } else { right },
          [],
          [*#label[D0]*],
          [*#label[D1]*],
          [*#label[D2]*],
          [*#label[D3]*],
          [*#label[D4]*],
          ..weights
            .D
            .enumerate()
            .map(((i, row)) => (
              [*#label(str(i))*],
              ..row.slice(0, 5).map(fmt),
            ))
            .flatten(),
        )

        #v(0.5cm)

        // Second 5 columns (D5-D9)
        #table(
          columns: 6,
          align: (col, row) => if col == 0 { right } else { right },
          [],
          [*#label[D5]*],
          [*#label[D6]*],
          [*#label[D7]*],
          [*#label[D8]*],
          [*#label[D9]*],
          ..weights
            .D
            .enumerate()
            .map(((i, row)) => (
              [*#label(str(i))*],
              ..row.slice(5).map(fmt),
            ))
            .flatten(),
        )
      ],
    )

    #set text(size: 10pt)

    == Algorithm

    + set each input slider #label[A0]--#label[A35] to the desired value
      according to the task for which the model has been trained

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
