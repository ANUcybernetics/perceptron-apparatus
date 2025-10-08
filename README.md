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

### Training and exporting weights

Once you've built the physical apparatus, you need to train a neural network
model and export the weights to set on the radial rings B (input→hidden) and D
(hidden→output).

#### MNIST (handwritten digits)

```bash
# Train an MNIST model (36x6x10 network) and export weights to JSON
mix perceptron.export_weights

# Custom training parameters
mix perceptron.export_weights --epochs 10 --batch-size 256

# Save to specific file with scaling to apparatus range (±5.0)
mix perceptron.export_weights --output mnist-weights.json --scale --target-max 5.0
```

The MNIST implementation:

- resizes 28×28 MNIST digit images to 6×6 (36 input features)
- trains a 36→6→10 MLP (36 inputs, 6 hidden neurons with ReLU, 10 outputs)
- exports weights to JSON format compatible with Typst and the physical
  apparatus

For detailed documentation, see [docs/mnist-mlp.md](docs/mnist-mlp.md).

#### Poker hands

```bash
# Train a poker hand classification model and export weights
mix perceptron.export_poker_weights

# Custom training parameters
mix perceptron.export_poker_weights --epochs 10 --batch-size 256

# Save to specific file with scaling
mix perceptron.export_poker_weights --output poker-weights.json --scale --target-max 5.0
```

The poker hand implementation:

- encodes 5-card poker hands into 36 features (suit + rank bins per card)
- classifies hands into 10 categories (high card, pair, two pair, etc. up to
  royal flush)
- trains on the UCI Poker Hand dataset (25,010 training samples)
- exports weights to JSON format

For detailed documentation, see [docs/poker-mlp.md](docs/poker-mlp.md).

### Programmatic usage

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
