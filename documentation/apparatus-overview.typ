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
    width: 420mm,  // A3 landscape width
    height: 297mm,  // A3 landscape height
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
    dy: -0.5cm,
    text(
      font: "Neon Tubes 2",
      size: 9pt,
      fill: anu-colors.socy-yellow,
    )[CC BY-NC 4.0],
  ),
)

// Content goes here
