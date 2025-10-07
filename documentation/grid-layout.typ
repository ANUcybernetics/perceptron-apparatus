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
    margin: (left: 3.2cm, right: 1.5cm, top: 1.5cm, bottom: 1.5cm),
  ),
  doc,
)

#grid(
  columns: (auto, 1fr),
  gutter: 2cm,
  {
    v(5cm)
    grid(
      columns: 6,
      rows: 6,
      gutter: 0pt,
      ..range(36).map(_ => rect(
        width: 50pt,
        height: 50pt,
        stroke: (paint: gray.lighten(40%), thickness: 0.5pt),
      ))
    )
  },
  lorem(150),
)
