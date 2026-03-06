## Project overview

This is an Elixir application for the Perceptron Apparatus project---a physical
computational device that performs neural network calculations through
mechanical manipulation. The project encompasses:

1. **Fabrication file generation**: SVG generation for laser-cutting and
   CNC-routing using Ash resources and custom rendering logic
2. **Machine learning infrastructure**: Axon-based neural network training for
   MNIST and poker hand classification, with weight export to JSON
3. **Documentation tooling**: Typst template integration for generating
   educational posters and worksheets

The Elixir application uses the Ash framework for resource management and is
primarily a command-line application with Mix tasks. See README.md for usage
details.

There is also a **TypeScript package** in `js/` that replicates the SVG
generation for use on the web, acting as a digital twin of the physical
apparatus. It provides an animation API for the log ring and individual sliders.
See `js/src/index.ts` for the public API (`PerceptronApparatus` class). The JS
package uses pnpm, tsdown, vitest, oxlint, and tsgo.

For detailed information about the ML implementations:

- MNIST digit classification: docs/mnist-mlp.md
- Poker hand classification: docs/poker-mlp.md

## Key modules and structure

### Ash resources

- `PerceptronApparatus.Board`: main resource for apparatus configuration,
  contains ring sequence
- `PerceptronApparatus.RuleRing`: logarithmic and ReLU reference rings
- `PerceptronApparatus.RadialRing`: weight rings (B and D)
- `PerceptronApparatus.AzimuthalRing`: input, hidden, and output layer rings (A,
  C, E/G)

### Machine learning modules

- `PerceptronApparatus.MLP`: MNIST digit classification (36→6→10 network)
- `PerceptronApparatus.Poker`: poker hand classification (36→6→10 network)

Both modules provide:

- data loading and preprocessing
- model creation with fixed architecture
- training with Axon/Polaris
- parameter inspection
- weight export to JSON (with optional scaling)

### Mix tasks

- `mix perceptron`: generate apparatus SVG with default or custom parameters
- `mix perceptron.generate`: generate using presets (mnist, xor, language)
- `mix perceptron.export_weights`: train MNIST model and export weights
- `mix perceptron.export_poker_weights`: train poker model and export weights

### Rendering

All rings implement the `PerceptronApparatus.Renderable` protocol, which
provides `to_svg/2` for generating SVG output. The Board module orchestrates
ring rendering with automatic width calculation and spacing.

### JS/TS package (`js/`)

- `js/src/utils.ts`: deg2rad, rule generation, SVG DOM helpers
- `js/src/rule-ring.ts`: log and ReLU rule generation + rendering
- `js/src/azimuthal-ring.ts`: arc slider rendering (layers A, C, E)
- `js/src/radial-ring.ts`: radial slider rendering (layers B, D)
- `js/src/board.ts`: ring layout orchestration, full SVG composition
- `js/src/index.ts`: `PerceptronApparatus` class with animation API

### JS/TS training module (`js/src/training/`)

Zero-dependency MNIST training that mirrors the Elixir MLP module. Architecture:
36 → 6 (ReLU, no bias) → 10 (linear, no bias). Implements matmul, ReLU, MSE
loss, Adam optimiser, and weight clamping from scratch.

- `js/src/training/math.ts`: matrix operations, Adam optimiser
- `js/src/training/model.ts`: MLP class with forward/backward/step
- `js/src/training/data.ts`: MNIST loading (fetch + gunzip IDX), downsampling,
  normalisation
- `js/src/training/weights.ts`: weight extraction and balanced geometric scaling
- `js/src/training/index.ts`: `trainMnist()` orchestrator, re-exports

Import via `perceptron-apparatus/training`. Training tests use
`// @vitest-environment node` (need node:zlib). Test fixture at
`js/test/fixtures/mnist-sample.json` (100 pre-downsampled samples).

Run tests: `cd js && mise exec -- pnpm test`
Build: `cd js && mise exec -- pnpm build`

<!-- usage-rules-start -->
<!-- usage-rules-header -->

# Usage Rules

**IMPORTANT**: Consult these usage rules early and often when working with the
packages listed below. Before attempting to use any of these packages or to
discover if you should use them, review their usage rules to understand the
correct patterns, conventions, and best practices.

<!-- usage-rules-header-end -->

<!-- ash-start -->
## ash usage
_A declarative, extensible framework for building Elixir applications._

@deps/ash/usage-rules.md
<!-- ash-end -->
<!-- usage_rules:elixir-start -->
## usage_rules:elixir usage
@deps/usage_rules/usage-rules/elixir.md
<!-- usage_rules:elixir-end -->
<!-- usage_rules:otp-start -->
## usage_rules:otp usage
@deps/usage_rules/usage-rules/otp.md
<!-- usage_rules:otp-end -->
<!-- igniter-start -->
## igniter usage
_A code generation and project patching framework_

@deps/igniter/usage-rules.md
<!-- igniter-end -->
<!-- usage_rules-start -->
## usage_rules usage
_A dev tool for Elixir projects to gather LLM usage rules from dependencies_

@deps/usage_rules/usage-rules.md
<!-- usage_rules-end -->
<!-- usage-rules-end -->
