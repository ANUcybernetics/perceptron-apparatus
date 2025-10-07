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
  #text(font: "Neon Tubes 2", fill: anu-colors.socy-yellow-print, size: 40pt)[
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

    #table(
      columns: 6,
      [*B0*], [*B1*], [*B2*], [*B3*], [*B4*], [*B5*],
      ..weights.B.flatten().map(fmt),
    )

    #v(1cm)

    == D: Hidden → Output (6×10)

    #table(
      columns: 10,
      [*D0*],
      [*D1*],
      [*D2*],
      [*D3*],
      [*D4*],
      [*D5*],
      [*D6*],
      [*D7*],
      [*D8*],
      [*D9*],
      ..weights.D.flatten().map(fmt),
    )
  ],
)
