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

- add layer/param index labels to each slider
- change the way the radius is handled so that the "size" parameter is a bit
  more meaningful
- add `Utils.write_files` which writes out all the necessary svgs (baseboard + topboard, plus individual files for each cut type)
- design a 400x400 prototype (same radius, inc markings, arc + couple of sliders)
- check no quirks in the final svg output which will trip up the CNC machine (e.g. empty text nodes)
- replace the "interp and concat strings" approach with proper HEEX templates
- in the SVG, add classes for the different fabrication layers and cut types
  (top board, bottom board, v-cut, etc.)
- for the `range`s, it doesn't actually have to be a `Range.t`---it could be any
  enumerable (not sure if this needs to be changed; at least to keep the
  dialyzer happy?)
- add drill holes, etc
- add Axon support
  - training model based on inputs
  - auto-generating the SVG based on the model (i.e. `%Axon{}` -> `%PerceptronApparatus{}`)
  - examples (5x5 MNIST digits, maybe something with language?)

## Author

(c) 2024 Ben Swift

## Licence

MIT
