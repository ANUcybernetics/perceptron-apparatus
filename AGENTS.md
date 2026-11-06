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
- `scripts/`: standalone `uv run` scripts (slider-noise check of the exported
  weights, candidate task and training recipe comparison, and the two that
  regenerate the twin's bundled weights and sample digits)
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
weight noise matched to the weight scale; `MLP.fit_weights_to_apparatus/2`
rescales weights to the slider ranges. See the `train_model/3` and
`fit_weights_to_apparatus/2` docs.

There are two weight scales: `linear` (-5 to 5), which the built apparatus has
and is the default everywhere, and `log` (magnitude 0.02 to 5, sign on the
marker), an option for a new build. Both are defined twice and must stay in
step: `PerceptronApparatus.Utils.weight_rule/1` and `weight_scale_fraction/2`,
and `weightRule()` and `weightScaleFraction()` in `js/src/utils.ts`. The same
constants are in `scripts/apparatus_sim.py`. The explainer video keeps its own
copy of the linear slider position (`radPos` in `video/explainer/explainer.js`).

### Mix tasks

- `mix perceptron`: generate apparatus SVG with default or custom parameters
  (`--weight-scale linear|log`)
- `mix perceptron.generate`: generate using presets (mnist, xor, language)
- `mix perceptron.export_weights --task mnist|zoo|letters`: train a model and
  export its weights, fitted to the apparatus and padded to the 36-6-10 board

### Rendering

All rings implement the `PerceptronApparatus.Renderable` protocol, which
provides `to_svg/2` for generating SVG output. The Board module orchestrates
ring rendering with automatic width calculation and spacing.

### JS/TS package (`js/`)

Source layout is `js/src/` (rings, board, `PerceptronApparatus` class),
`js/src/training/` (zero-dependency MNIST training mirroring the Elixir MLP) and
`js/src/widgets/` (input widgets and `ComputationAnimator`, for external sites
such as Astro). Subpath exports are `perceptron-apparatus/training` and
`perceptron-apparatus/widgets`.

- training tests use `// @vitest-environment node` (they need node:zlib); the
  fixture is `js/test/fixtures/mnist-sample.json`
- `js/src/widgets/weights.ts` is generated from `docs/*-weights.json`; run
  `uv run scripts/bundle_weights.py` whenever those files change
- `js/src/widgets/sample-digits.ts` is generated; run
  `uv run scripts/pick_sample_digits.py` whenever the MNIST weights change, then
  re-check the explainer video, which follows its 7

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
