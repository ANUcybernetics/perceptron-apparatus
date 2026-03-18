## Project overview

The Perceptron Apparatus is a physical computational device that performs neural
network calculations through mechanical manipulation---think "abacus for deep
learning". This monorepo has two peer components:

### Elixir (root)

Ash-based CLI application for fabrication file generation (SVG for laser-cutting
and CNC-routing), ML training (Axon/MNIST/poker), and weight export. Run via Mix
tasks---see README.md for usage.

### TypeScript (`js/`)

NPM package providing a digital twin of the physical apparatus. Generates SVGs
in the browser, provides an animation API for the log ring and sliders, and
includes interactive widgets (MNIST input grid, poker hand selector,
computation animator). Uses pnpm, tsdown, vitest, oxlint, and tsgo. See
`js/src/index.ts` for the public API (`PerceptronApparatus` class).

### Shared resources

- `docs/`: Typst templates for educational posters and worksheets, ML
  documentation, exported weight JSON files
- `svg/`: generated SVG output
- `mise.toml`: unified task runner for both components (`mise run test`,
  `mise run build`)

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

### JS/TS interactive widgets (`js/src/widgets/`)

Interactive input widgets and computation animator for the digital twin. Import
via `perceptron-apparatus/widgets`. Designed as library components for use in
external sites (e.g. Astro).

- `js/src/widgets/animator.ts`: `ComputationAnimator` --- step-by-step or fast
  forward pass animation through the apparatus SVG. Step mode animates every
  individual multiply-accumulate with log ring rotation; speed controlled via
  `stepDuration`. Supports `AbortSignal` for cancellation.
- `js/src/widgets/mnist-input.ts`: `MnistInputWidget` --- drawable 6x6 grid,
  click/drag to paint, returns 36 normalised values
- `js/src/widgets/poker-input.ts`: `PokerInputWidget` --- 5-card selector with
  suit/rank dropdowns, encodes to 36 values matching the poker MLP encoding
  scheme. Also exports `encodeHand()` and `POKER_HAND_NAMES`.
- `js/src/widgets/weights.ts`: bundled pre-trained weights (`mnistWeights`,
  `pokerWeights`) from `docs/*.json`
- `js/src/widgets/index.ts`: re-exports all widgets and weights

### Development

Use mise tasks from the project root to run both components:

- `mise run test` --- run all tests (Elixir + TS)
- `mise run build` --- build all packages
- `mise run lint` --- lint TS package
- `mise run check` --- type-check TS package

Or run each side individually:

- Elixir: `mix test`, `mix compile`
- TS: `cd js && pnpm test`, `cd js && pnpm build`

`js/dist/` is committed to git so the package can be installed directly from
GitHub (e.g. `pnpm add github:benswift/perceptron_apparatus?path=js`). Rebuild
with `cd js && pnpm build` and commit the updated `dist/` whenever the TS
source changes.

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
