#!/usr/bin/env elixir

# Demonstration of the new PerceptronApparatus.Board.create interface
# This script shows how to create a neural network apparatus board
# with the new simplified interface.

# Start the application
Mix.install([
  :lazy_html,
  {:perceptron_apparatus, path: "."}
])

alias PerceptronApparatus.Board

IO.puts("=== PerceptronApparatus Neural Network Board Demo ===\n")

# Create a neural network board with the new interface
# Parameters: size, n_input, n_hidden, n_output
IO.puts("Creating a neural network board with:")
IO.puts("- Board size: 1200")
IO.puts("- Input neurons: 36")
IO.puts("- Hidden neurons: 6")
IO.puts("- Output neurons: 10\n")

{:ok, board} = Board.create(1190.0, 36, 6, 10)

IO.puts("Board created successfully!")
IO.puts("- Board ID: #{board.id}")
IO.puts("- Size: #{board.size}")
IO.puts("- Input dimensions: #{board.n_input}")
IO.puts("- Hidden dimensions: #{board.n_hidden}")
IO.puts("- Output dimensions: #{board.n_output}")
IO.puts("- Number of rings created: #{length(board.rings)}\n")

# Show the ring sequence
IO.puts("Ring sequence (from outside to inside):")
board.rings
|> Enum.with_index(1)
|> Enum.each(fn {ring, index} ->
  case ring.__struct__ do
    PerceptronApparatus.RuleRing ->
      rule_type = if index == 1, do: "Log rule", else: "ReLU rule"
      IO.puts("  #{index}. RuleRing (#{rule_type}) - width: #{ring.width}")

    PerceptronApparatus.AzimuthalRing ->
      sliders = ring.shape.sliders
      IO.puts("  #{index}. AzimuthalRing - #{sliders} sliders, width: #{ring.width}")

    PerceptronApparatus.RadialRing ->
      groups = ring.shape.groups
      spg = ring.shape.sliders_per_group
      IO.puts("  #{index}. RadialRing - #{groups} groups × #{spg} sliders, width: #{ring.width}")
  end
end)

IO.puts("\nGenerating SVG output...")

# Render the board
svg_output = Board.render(board, [:full, :etch])

# Save to file
output_file = "svg/neural_network_apparatus.svg"
File.write!(output_file, svg_output)

IO.puts("SVG saved to: #{output_file}")
IO.puts("SVG size: #{String.length(svg_output)} characters")
