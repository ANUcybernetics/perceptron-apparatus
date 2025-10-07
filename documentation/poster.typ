// Copyright (c) 2025 Ben Swift
// Licensed under CC BY-NC-SA 4.0

// Import base template for colors and styling
#import "@local/anu-typst-template:0.2.0": *
#import "@local/anu-typst-template:0.2.0": anu-colors

#show: doc => anu(
  title: "",
  config: (
    theme: "dark",
    logos: ("studio",),
    hide: ("page-numbers", "title-block"),
  ),
  page-settings: (
    width: 420mm, // A3 landscape width
    height: 297mm, // A3 landscape height
    margin: (
      left: 3cm,
      right: 3cm,
      top: 3cm,
      bottom: 3cm,
    ),
  ),
  doc,
)

// Add CC BY-NC 4.0 watermark
#set page(
  footer: place(
    bottom + left,
    dy: -1.5cm,
    text(
      font: "Neon Tubes 2",
      size: 9pt,
      fill: anu-colors.socy-yellow-print,
    )[CC BY-NC-SA 4.0],
  ),
)

#place(top + right)[
  #text(font: "Neon Tubes 2", fill: anu-colors.socy-yellow-print, size: 24pt)[
    Cybernetic\
    Studio
  ]
]

// Load weights
#let weights = json("weights.json")

// Helper function to format weight values
#let fmt(x) = {
  let val = calc.round(x, digits: 1)
  if val >= 0 {
    " " + str(val)
  } else {
    str(val)
  }
}

// Content: 2-column layout
#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  [
    #align(center)[
      #image("apparatus1.svg", width: 100%)
    ]
  ],
  [
    #set text(size: 7pt)
    #v(1cm)

    = Weight matrices

    #if "test_accuracy" in weights [
      Test accuracy: #calc.round(weights.test_accuracy * 100, digits: 1)%
      (#calc.round(weights.test_accuracy / 0.1, digits: 1) times better than
      chance)

      #v(0.5cm)
    ]

    == B: Input → Hidden (36×6)

    #let label(txt) = text(font: "Alegreya", txt)

    #grid(
      columns: (1fr, 1fr),
      gutter: 1em,
      // First half: rows 0-17
      table(
        columns: 7,
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
            [*#i*],
            ..row.map(fmt),
          ))
          .flatten(),
      ),
      // Second half: rows 18-35
      table(
        columns: 7,
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
            [*#(i + 18)*],
            ..row.map(fmt),
          ))
          .flatten(),
      ),
    )

    #v(1cm)

    == D: Hidden → Output (6×10)

    #table(
      columns: 11,
      [],
      [*#label[D0]*],
      [*#label[D1]*],
      [*#label[D2]*],
      [*#label[D3]*],
      [*#label[D4]*],
      [*#label[D5]*],
      [*#label[D6]*],
      [*#label[D7]*],
      [*#label[D8]*],
      [*#label[D9]*],
      ..weights
        .D
        .enumerate()
        .map(((i, row)) => (
          [*#i*],
          ..row.map(fmt),
        ))
        .flatten(),
    )
  ],
)
