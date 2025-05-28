#!/usr/bin/env elixir

# Demonstration of the new PerceptronApparatus.Board.create interface
# This script shows how to create a neural network apparatus board
# with the new simplified interface.

# Start the application
Mix.install([
  {:perceptron_apparatus, path: "."}
])

alias PerceptronApparatus.Board

IO.puts("=== PerceptronApparatus Neural Network Board Demo ===\n")

# Create a neural network board with the new interface
# Parameters: size, n_input, n_hidden, n_output
IO.puts("Creating a neural network board with:")
IO.puts("- Board size: 1200")
IO.puts("- Input neurons: 25")
IO.puts("- Hidden neurons: 5")
IO.puts("- Output neurons: 10\n")

{:ok, board} = Board.create(1200.0, 25, 5, 10)

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

# Show a smaller example
IO.puts("\n=== Smaller Network Example ===")
IO.puts("Creating a minimal 2-1-1 network...")

{:ok, small_board} = Board.create(600.0, 2, 1, 1)
small_svg = Board.render(small_board)

small_output_file = "svg/small_neural_network_apparatus.svg"
File.write!(small_output_file, small_svg)

IO.puts("Small network board created and saved to: #{small_output_file}")

# Using the bang version (code interface)
IO.puts("\n=== Using Code Interface (Bang Version) ===")
code_board = Board.create!(800.0, 4, 3, 2)
IO.puts("Board created with code interface: #{code_board.n_input}-#{code_board.n_hidden}-#{code_board.n_output} network")

IO.puts("\n✅ Demo completed successfully!")
IO.puts("The new Board.create/4 interface automatically creates the complete ring sequence:")
IO.puts("1. Log ring")
IO.puts("2. ReLU ring")
IO.puts("3. Input azimuthal ring (n_input sliders)")
IO.puts("4. Weight1 radial ring (n_hidden groups × n_input sliders)")
IO.puts("5. Hidden azimuthal ring (n_hidden sliders)")
IO.puts("6. Weight2 radial ring (n_output groups × n_hidden sliders)")
IO.puts("7. Output azimuthal ring (n_output sliders)")
