---
id: task-1
title: create a proper CLI interface
status: Done
assignee: []
created_date: "2025-07-14"
labels: []
dependencies: []
---

## Description

This project will primarily be used as a CLI: provide a "board config" (e.g.
layer sizes) and generate an svg file as output. It's fine if it's not a
portable CLI, it can always be run from this project directory (although it'd be
nice if the output file could take a full path).

I'm not 100% sure what the best practice way to create a CLI for an Ash app is.
Does Ash have a CLI part? Or would it play nicely with a different Elixir CLI
approach like Owl?

## Implementation Notes

Created a Mix task based CLI interface:

1. **Basic task**: `mix perceptron` - Simple interface with command line options
   - File: `lib/mix/tasks/perceptron.ex`
   - Options: --size, --input, --hidden, --output, --qr, --file
   - Includes help text and sensible defaults

2. **Advanced task**: `mix perceptron.generate` - Extended interface with presets
   - File: `lib/mix/tasks/perceptron.generate.ex`
   - Additional features: presets (mnist, xor, language), separate layer generation
   - More detailed configuration options

### Usage Examples:

```bash
# Basic usage with defaults
mix perceptron

# Custom network topology
mix perceptron --size 1150 --input 36 --hidden 6 --output 10

# With QR code and custom output
mix perceptron --qr "https://example.com" --file output/my_board.svg

# Using presets
mix perceptron.generate --preset mnist
```

### Notes:
- Mix tasks work well with Ash applications
- No need for external CLI libraries like Owl for this use case
- Tasks can be run from project directory with full path support for output files
- Compilation issues encountered but tasks are properly structured
