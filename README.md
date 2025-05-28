# Perceptron Apparatus

Elixir lib for configuring and generating an (svg) design file for a perceptron
apparatus---suitable for CNC routing/laser cutting.

See
[project page](https://anu365.sharepoint.com/sites/CyberneticsHub/SitePages/CyberneticStudio-Human-Scale.aspx)
for description.

## Installation

This package is not (currently) on hex. You can clone the repo and import it via
a [`:path`](https://hexdocs.pm/mix/Mix.Tasks.Deps.html).

You'll also need to download and install the
[Relief SingleLine](https://github.com/isdat-type/Relief-SingleLine/tree/main/fonts/open_otf-svg)
font.

## Nomenclature

A **board** contains a number of **rings**, each of which represents a layer in
the (MLP) neural network.

SVG classes represent different cut types:

top plate class selectors

- `top full` full-depth cuts
- `top slider` full-depth routed channels for sliders
- `top etch` light v-cut etches
- `top etch.heavy` heavier v-cut etches
- `top hole` full-depth holes (for screws)

bottom plate class selectors

- `bottom slider` partial-depth routed channels (for captive slider/ring
  bottoms)
- `bottom rotating` partial-depth routed void for bottom rotating ring
- `bottom hole` full-depth holes (for screws)

## TODO

- add `Utils.write_files` which writes out all the necessary svgs (baseboard +
  topboard, plus individual files for each cut type)
- design a 400x400 prototype (same radius, inc markings, arc + couple of
  sliders)
- check no quirks in the final svg output which will trip up the CNC machine
  (e.g. empty text nodes)
- replace the "interp and concat strings" approach with proper HEEX templates
- add drill holes, etc
- add Axon support

  - see what the param ranges are (inc. negative?)
  - training model based on inputs
  - auto-generating the SVG based on the model (i.e. `%Axon{}` ->
    `%PerceptronApparatus.Board{}`)
  - examples (5x5 MNIST digits, maybe something with language?)

  ## questions for Sam

  - "relief" cuts, or other visual emphasis tricks
  - class-based approach for different cut types?
  - baseboard cuts (and captive slider designs)
  - can Cole & I come help?
  - prototype next steps
  - handles & other holes
  - any other design optimisations?

## Author

(c) 2024 Ben Swift

## Licence

MIT
