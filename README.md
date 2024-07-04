# Perceptron Apparatus

Elixir lib for configuring and generating an (svg) design file for a perceptron
apparatus---suitable for CNC routing/laser cutting.

See
[project page](https://anu365.sharepoint.com/sites/CyberneticsHub/SitePages/CyberneticStudio-Human-Scale.aspx)
for description.

## Installation

This package is not (currently) on hex. You can clone the repo and import it via
a [`:path`](https://hexdocs.pm/mix/Mix.Tasks.Deps.html).

## Nomenclature

A **board** contains a number of **rings**, each of which represents a layer in
the (MLP) neural network.

## TODO

- migrate to a Module-based design
- add shared tick lines to radial slider rings
- update all sliders based on notebook design
- when rendering an apparatus, make sure the sum of the radial diameters of all
  rings don't exceed the overall radius
- in the SVG, add classes for the different fabrication layers and cut types
  (top board, bottom board, v-cut, etc.)
- design a prototype "board fragment"

## Author

(c) 2024 Ben Swift

## Licence

MIT
