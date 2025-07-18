# Perceptron Apparatus

Elixir lib for creating the laser-cutting & cnc-routing files for a fully-analog
calculation apparatus (think "abacus for deep learning").

A [Cybernetic Studio](https://github.com/ANUcybernetics/) project by
[Ben Swift](https://benswift.me), with fabrication by Sam Shellard at UC's
[Workshop7](https://www.canberra.edu.au/future-students/study-at-uc/study-areas/design/workshop7).

## Installation

This package is not (currently) on hex. You can clone the repo and import it via
a [`:path`](https://hexdocs.pm/mix/Mix.Tasks.Deps.html).

## Quick Start

### CLI Usage

The easiest way to generate apparatus SVG files is using the Mix tasks:

```bash
# Generate with default parameters (1200mm, 36-6-10 network)
mix perceptron

# Custom configuration
mix perceptron --size 1150 --input 36 --hidden 6 --output 10

# Save to specific location
mix perceptron --file /path/to/output.svg

# Include QR code
mix perceptron --qr "https://example.com"

# Use presets (mnist, xor, language)
mix perceptron.generate --preset mnist

# Show help
mix perceptron --help
```

### Programmatic Usage

You can also use the library programmatically:

```elixir
# Create a neural network apparatus for a 25-5-10 network
# Parameters: size, n_input, n_hidden, n_output
{:ok, apparatus} = PerceptronApparatus.Board.create(1200.0, 25, 5, 10)

# Render to SVG
svg_output = PerceptronApparatus.Board.render(apparatus)
File.write!("apparatus.svg", svg_output)
```

This automatically creates the complete ring sequence:

1. **Log ring** - logarithmic scale ruler
2. **ReLU ring** - ReLU activation function ruler
3. **Input azimuthal ring** - input sliders (0-1 range)
4. **Weight1 radial ring** - input-to-hidden weight sliders (-10 to 10 range)
5. **Hidden azimuthal ring** - hidden layer sliders (0-10 range)
6. **Weight2 radial ring** - hidden-to-output weight sliders (-10 to 10 range)
7. **Output azimuthal ring** - output sliders (0-1 range)

The ring dimensions automatically match the neural network topology:

- Input ring has `n_input` sliders
- Weight1 ring has `n_hidden` groups × `n_input` sliders per group
- Hidden ring has `n_hidden` sliders
- Weight2 ring has `n_output` groups × `n_hidden` sliders per group
- Output ring has `n_output` sliders

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

## Author

(c) 2024 Ben Swift

## Licence

MIT
