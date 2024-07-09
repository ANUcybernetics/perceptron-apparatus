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

SVG classes represent different cut types:

top plate

- `full` full-depth cuts
- `slider` full-depth routed channels for sliders
- `etch` light v-cut etches
- `etch.heavy` heavier v-cut etches
- `hole` full-depth holes (for screws)

bottom plate

- `partial` partial-depth routed channels (for captive slider/ring bottoms)
- `hole` full-depth holes (for screws)

## TODO

- add layer/param index labels to each slider
- add `Utils.write_files` which writes out all the necessary svgs (baseboard + topboard, plus individual files for each cut type)
- design a 400x400 prototype (same radius, inc markings, arc + couple of sliders)
- check no quirks in the final svg output which will trip up the CNC machine (e.g. empty text nodes)
- replace the "interp and concat strings" approach with proper HEEX templates
- add drill holes, etc
- add Axon support
  - see what the param ranges are (inc. negative?)
  - training model based on inputs
  - auto-generating the SVG based on the model (i.e. `%Axon{}` -> `%PerceptronApparatus{}`)
  - examples (5x5 MNIST digits, maybe something with language?)

  ## fabrication questions

  - what's the minimum width for the sliders?

## Author

(c) 2024 Ben Swift

## Licence

MIT
