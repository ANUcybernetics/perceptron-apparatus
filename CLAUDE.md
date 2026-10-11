## Project overview

The Perceptron Apparatus is a physical computational device that performs neural
network calculations through mechanical manipulation---think "abacus for deep
learning". This monorepo has two peer components:

### Elixir (root)

Ash-based CLI application for fabrication file generation (SVG for laser-cutting
and CNC-routing), ML training (Nx/EXLA; MNIST, zoo and letters tasks), and
weight export. Run via Mix tasks---see README.md for usage.

### TypeScript (`js/`)

NPM package providing a digital twin of the physical apparatus. Generates SVGs
in the browser, provides an animation API for the log ring and sliders, and
includes interactive widgets (MNIST input grid, animal trait selector,
next-letter context picker, computation animator). Uses pnpm, tsdown, vitest,
oxlint, and tsgo. See `js/src/index.ts` for the public API
(`PerceptronApparatus` class).

### Shared resources

- `docs/`: Typst templates for educational posters and worksheets, exported
  weight JSON files
- `scripts/`: standalone `uv run` analysis scripts (slider-noise check of the
  exported weights, candidate task and training recipe comparison)
- `priv/zoo.data`: the vendored UCI Zoo dataset
- `svg/`: generated SVG output
- `video/`: explainer videos built on the digital twin (see "Video style")
- `mise.toml`: unified task runner for both components (`mise run test`,
  `mise run build`)

README.md explains the design (weight scale, training recipe, tasks) and holds
the measured results; `CHANGELOG.md` records design changes.

## Key modules and structure

### Ash resources

- `PerceptronApparatus.Board`: main resource for apparatus configuration,
  contains ring sequence
- `PerceptronApparatus.RuleRing`: logarithmic and ReLU reference rings
- `PerceptronApparatus.RadialRing`: weight rings (B and D)
- `PerceptronApparatus.AzimuthalRing`: input, hidden, and output layer rings (A,
  C, E/G)

### Machine learning modules

- `PerceptronApparatus.MLP`: MNIST data, model creation, training, and weight
  export for any task that fits the board
- `PerceptronApparatus.Zoo`: animal classification data and encoding (21→6→7)
- `PerceptronApparatus.Letters`: next-letter prediction data and encoding
  (30→6→10)

Training uses softmax cross-entropy, non-negative output weights and per-step
weight noise; `MLP.fit_weights_to_apparatus/2` rescales weights to the slider
ranges. See the `train_model/3` and `fit_weights_to_apparatus/2` docs.

The weight scale (log magnitude, 0.02 to 5, sign on the marker) is defined twice
and must stay in step: `PerceptronApparatus.Utils.weight_rule/0` and
`weight_scale_fraction/1`, and `weightRule()` and `weightScaleFraction()` in
`js/src/utils.ts`. The same constants are in `scripts/apparatus_sim.py`.

### Mix tasks

- `mix perceptron`: generate apparatus SVG with default or custom parameters
- `mix perceptron.generate`: generate using presets (mnist, xor, language)
- `mix perceptron.export_weights --task mnist|zoo|letters`: train a model and
  export its weights, fitted to the apparatus and padded to the 36-6-10 board

### Rendering

All rings implement the `PerceptronApparatus.Renderable` protocol, which
provides `to_svg/2` for generating SVG output. The Board module orchestrates
ring rendering with automatic width calculation and spacing.

### JS/TS package (`js/`)

- `js/src/utils.ts`: deg2rad, rule generation, the weight scale
- `js/src/rule-ring.ts`: log and ReLU rule generation + rendering
- `js/src/azimuthal-ring.ts`: arc slider rendering (layers A, C, E)
- `js/src/radial-ring.ts`: radial slider rendering (layers B, D)
- `js/src/board.ts`: ring layout orchestration, full SVG composition
- `js/src/index.ts`: `PerceptronApparatus` class with animation API

### JS/TS training module (`js/src/training/`)

Zero-dependency MNIST training that mirrors the Elixir MLP module. Architecture:
36 → 6 (ReLU, no bias) → 10 (linear, no bias). Implements matmul, ReLU,
cross-entropy loss, Adam optimiser, weight noise and the non-negative output
constraint from scratch.

- `js/src/training/math.ts`: matrix operations, Adam optimiser
- `js/src/training/model.ts`: MLP class with forward/backward/step
- `js/src/training/data.ts`: MNIST loading (fetch + gunzip IDX), downsampling,
  normalisation
- `js/src/training/weights.ts`: weight extraction and `fitWeightsToApparatus`
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
- `js/src/widgets/zoo-input.ts`: `ZooInputWidget` --- trait checkboxes and leg
  count, encodes to 36 values matching `PerceptronApparatus.Zoo`. Also exports
  `encodeAnimal()`, `ZOO_CLASS_NAMES` and `ZOO_EXAMPLES`.
- `js/src/widgets/letters-input.ts`: `LettersInputWidget` --- three-symbol
  context picker, encodes to 36 values matching `PerceptronApparatus.Letters`.
  Also exports `encodeContext()` and `LETTERS_ALPHABET`.
- `js/src/widgets/weights.ts`: bundled pre-trained weights (`mnistWeights`,
  `zooWeights`, `lettersWeights`), generated from `docs/*-weights.json`;
  regenerate it with `uv run scripts/bundle_weights.py` whenever those files
  change
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
GitHub (e.g. `pnpm add github:benswift/perceptron_apparatus?path=js`). The
`?path=` syntax works with pnpm and yarn but not npm. Rebuild with
`cd js && pnpm build` and commit the updated `dist/` whenever the TS source
changes.

## Video style

Make videos with the `ben:styled-video` skill. Style guide: `video/STYLE.md`.

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
