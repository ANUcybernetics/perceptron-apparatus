# Perceptron Apparatus

A physical computational device that performs Artificial Neural Network
calculations through mechanical manipulation---think "abacus for deep learning".
This project combines digital tools for fabrication, machine learning
infrastructure for weight generation, and educational documentation to create a
tangible interface for understanding AI.

A [Cybernetic Studio](https://github.com/ANUcybernetics/) project by
[Ben Swift](https://benswift.me), with fabrication support from Sam Shellard at
UC's
[Workshop7](https://www.canberra.edu.au/future-students/study-at-uc/study-areas/design/workshop7).

## Project scope

This monorepo has two peer components:

- **Elixir** (root): fabrication SVG generation via Ash resources, ML training
  (Axon/MNIST/poker), and weight export to JSON
- **TypeScript** (`js/`): NPM package providing a digital twin---browser SVG
  generation, computation animation, and interactive input widgets

Shared resources live at the root: `docs/` for Typst templates and ML
documentation, `svg/` for generated output, and `mise.toml` as a unified task
runner.

## Prerequisites

This project uses [mise](https://mise.jdx.dev/) to manage runtimes (Elixir,
Erlang, Node, pnpm). Install mise, then:

```bash
mise install          # install runtimes
mix deps.get          # fetch Elixir dependencies
cd js && pnpm install # install TS dependencies
```

## Development

Unified tasks from the project root:

```bash
mise run test   # run all tests (Elixir + TS)
mise run build  # build all packages
mise run lint   # lint TS package
mise run check  # type-check TS package
```

## Quick start

### Elixir CLI

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

### Elixir programmatic usage

```elixir
# Create a neural network apparatus for a 25-5-10 network
{:ok, apparatus} = PerceptronApparatus.Board.create(1200.0, 25, 5, 10)

# Render to SVG
svg_output = PerceptronApparatus.Board.render(apparatus)
File.write!("apparatus.svg", svg_output)
```

### TypeScript package

The `js/` package is published as `perceptron-apparatus` and provides three
entry points:

```ts
// SVG generation and animation
import { PerceptronApparatus } from "perceptron-apparatus";

// In-browser MNIST training
import { trainMnist } from "perceptron-apparatus/training";

// Interactive widgets (MNIST input grid, poker hand selector, animator)
import { MnistInputWidget, ComputationAnimator } from "perceptron-apparatus/widgets";
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

## Architecture

The physical apparatus consists of concentric rings representing different
layers and operations in a neural network:

- **Log ring**: logarithmic scale ruler for slide rule calculations
- **ReLU ring**: ReLU activation function reference
- **Input azimuthal ring** (A): input sliders (0-1 range)
- **Weight1 radial ring** (B): input-to-hidden weight sliders (-10 to 10 range)
- **Hidden azimuthal ring** (C): hidden layer sliders (0-10 range)
- **Weight2 radial ring** (D): hidden-to-output weight sliders (-10 to 10 range)
- **Output azimuthal ring** (E/G): output sliders (0-1 range)

The apparatus performs matrix multiplication and ReLU activation through manual
manipulation of these rings, making the computation physically tangible.

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

## Documentation

The project includes Typst templates for generating educational materials:

- **Apparatus posters**: display trained weights alongside usage instructions
  (see `docs/mnist-poster.typ` and `docs/poker-poster.typ`)
- **Interactive worksheets**: blank grids for drawing inputs with step-by-step
  algorithm guides (see `docs/grid-and-instructions.typ`)
- **Technical documentation**: detailed explanations of the MNIST and poker
  implementations (see `docs/mnist-mlp.md` and `docs/poker-mlp.md`)

These materials make the apparatus accessible for educational demonstrations and
public engagement.

## Author

(c) 2024 Ben Swift

## Licence

MIT
