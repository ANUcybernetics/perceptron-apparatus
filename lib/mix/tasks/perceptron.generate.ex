defmodule Mix.Tasks.Perceptron.Generate do
  @moduledoc """
  Generate SVG files for perceptron apparatus boards with detailed configuration.

  ## Usage

      mix perceptron.generate [options]

  ## Options

    * `--size` - Board size in mm (default: 1200.0)
    * `--input` - Number of input neurons (default: 36)
    * `--hidden` - Number of hidden neurons (default: 6)
    * `--output` - Number of output neurons (default: 10)
    * `--qr` - QR code data (optional)
    * `--file` - Output file path (default: svg/board.svg)
    * `--preset` - Use a preset configuration (mnist, xor, language)
    * `--separate-layers` - Generate separate files for each layer type
    * `--help` - Show this help message

  ## Presets

    * `mnist` - 784-128-10 network for MNIST digits
    * `xor` - 2-2-1 network for XOR problem
    * `language` - 50-20-10 network for language tasks

  ## Examples

      # Use MNIST preset
      mix perceptron.generate --preset mnist

      # Custom configuration with separate layer files
      mix perceptron.generate --size 800 --input 20 --hidden 10 --output 5 --separate-layers

      # Generate with QR code
      mix perceptron.generate --qr "https://example.com" --file output/my_board.svg
  """

  @shortdoc "Generate SVG files with detailed configuration options"

  use Mix.Task

  @switches [
    size: :float,
    input: :integer,
    hidden: :integer,
    output: :integer,
    qr: :string,
    file: :string,
    preset: :string,
    separate_layers: :boolean,
    help: :boolean
  ]

  @aliases [
    s: :size,
    i: :input,
    h: :hidden,
    o: :output,
    q: :qr,
    f: :file,
    p: :preset
  ]

  @defaults [
    size: 1200.0,
    input: 36,
    hidden: 6,
    output: 10,
    file: "svg/board.svg",
    separate_layers: false
  ]

  @presets %{
    "mnist" => %{size: 1500.0, input: 784, hidden: 128, output: 10},
    "xor" => %{size: 600.0, input: 2, hidden: 2, output: 1},
    "language" => %{size: 1200.0, input: 50, hidden: 20, output: 10}
  }

  @impl Mix.Task
  def run(args) do
    # Start the application
    Mix.Task.run("app.start")

    # Parse arguments
    {opts, _, _} = OptionParser.parse(args, switches: @switches, aliases: @aliases)

    if opts[:help] do
      Mix.shell().info(@moduledoc)
      System.halt(0)
    end

    # Handle presets
    config = 
      case opts[:preset] do
        nil -> 
          Keyword.merge(@defaults, opts)
        preset_name ->
          case Map.get(@presets, preset_name) do
            nil ->
              Mix.shell().error("Unknown preset: #{preset_name}")
              Mix.shell().error("Available presets: #{Map.keys(@presets) |> Enum.join(", ")}")
              System.halt(1)
            preset_config ->
              @defaults
              |> Keyword.merge(Enum.map(preset_config, fn {k, v} -> {k, v} end))
              |> Keyword.merge(opts)
          end
      end

    # Extract parameters
    size = config[:size]
    n_input = config[:input]
    n_hidden = config[:hidden]
    n_output = config[:output]
    qr_data = config[:qr]
    filename = config[:file]
    separate_layers = config[:separate_layers]

    # Ensure output directory exists
    output_dir = Path.dirname(filename)
    File.mkdir_p!(output_dir)

    Mix.shell().info("Creating perceptron apparatus board...")
    if opts[:preset], do: Mix.shell().info("Using preset: #{opts[:preset]}")
    Mix.shell().info("Parameters:")
    Mix.shell().info("  Size: #{size}mm")
    Mix.shell().info("  Network: #{n_input}-#{n_hidden}-#{n_output}")
    if qr_data, do: Mix.shell().info("  QR data: #{qr_data}")
    Mix.shell().info("  Output: #{filename}")
    if separate_layers, do: Mix.shell().info("  Generating separate layer files")
    Mix.shell().info("")

    # Create the board using domain code interface
    case PerceptronApparatus.create_board(size, n_input, n_hidden, n_output, qr_data) do
      {:ok, board} ->
        Mix.shell().info("Board created successfully (ID: #{board.id})")

        # Generate SVG
        if separate_layers do
          generate_separate_layers(board, filename)
        else
          generate_single_svg(board, filename)
        end

      {:error, error} ->
        Mix.shell().error("Failed to create board:")
        Mix.shell().error(inspect(error, pretty: true))
        System.halt(1)
    end
  end

  defp generate_single_svg(board, filename) do
    case PerceptronApparatus.write_svg(board, filename) do
      {:ok, result} ->
        Mix.shell().info("")
        Mix.shell().info(String.duplicate("=", 60))
        Mix.shell().info("SUCCESS! SVG file generated at: #{result.filename}")
        Mix.shell().info(String.duplicate("=", 60))

      {:error, error} ->
        Mix.shell().error("Failed to generate SVG file:")
        Mix.shell().error(inspect(error, pretty: true))
        System.halt(1)
    end
  end

  defp generate_separate_layers(board, base_filename) do
    # This would need to be implemented based on how the SVG generation works
    # For now, just generate the main file
    Mix.shell().info("Note: Separate layer generation not yet implemented")
    generate_single_svg(board, base_filename)
  end
end