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
      left: 3.2cm,
      right: 1.6cm,
      top: 2.4cm,
      bottom: 2.4cm,
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

#place(top + right, dx: -1cm)[
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
      column-gutter: (1em, 3em),
      rows: (auto, auto),
      row-gutter: 0.5cm,
      // Heading row
      grid.cell(colspan: 2)[
        == Weight Matrix B: Input → Hidden Layer ($36 times 6$)
      ],
      [
        == Weight Matrix D: Hidden Layer → Output ($6 times 10$)
      ],
      // Table content row
      // B table first half: rows 0-17
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
            [*#label(str(i))*],
            ..row.map(fmt),
          ))
          .flatten(),
      ),
      // B table second half: rows 18-35
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
            [*#label(str(i + 18))*],
            ..row.map(fmt),
          ))
          .flatten(),
      ),
      // D table in third column
      [
        // First 5 columns (D0-D4)
        #table(
          columns: 6,
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
  ],
)
