defmodule Mix.Tasks.Perceptron do
  @moduledoc """
  Generate SVG files for perceptron apparatus boards.

  ## Usage

      mix perceptron [options]

  ## Options

    * `--size` - Board size in mm (default: 1200.0)
    * `--input` - Number of input neurons (default: 36)
    * `--hidden` - Number of hidden neurons (default: 6)
    * `--output` - Number of output neurons (default: 10)
    * `--qr` - QR code data (optional)
    * `--file` - Output file path (default: svg/board.svg)
    * `--print` - Generate print-ready SVG (white on black)
    * `--help` - Show this help message

  ## Examples

      # Create a board with default parameters
      mix perceptron

      # Create a 1150mm board with 36-6-10 network
      mix perceptron --size 1150 --input 36 --hidden 6 --output 10

      # Save to a specific file
      mix perceptron --file /path/to/output.svg

      # Include QR code data
      mix perceptron --qr "https://example.com"

      # Generate print-ready version
      mix perceptron --print
  """

  @shortdoc "Generate SVG files for perceptron apparatus boards"

  use Mix.Task

  @switches [
    size: :float,
    input: :integer,
    hidden: :integer,
    output: :integer,
    qr: :string,
    file: :string,
    print: :boolean,
    help: :boolean
  ]

  @aliases [
    s: :size,
    i: :input,
    h: :hidden,
    o: :output,
    q: :qr,
    f: :file
  ]

  @defaults [
    size: 1200.0,
    input: 36,
    hidden: 6,
    output: 10,
    file: "svg/board.svg"
  ]

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

    # Merge with defaults
    config = Keyword.merge(@defaults, opts)

    # Extract parameters
    size = config[:size]
    n_input = config[:input]
    n_hidden = config[:hidden]
    n_output = config[:output]
    qr_data = config[:qr]
    filename = config[:file]
    print_mode = config[:print] || false

    # Ensure output directory exists
    output_dir = Path.dirname(filename)
    File.mkdir_p!(output_dir)

    # Calculate operation counts
    ops = count_operations(n_input, n_hidden, n_output)

    Mix.shell().info("Creating perceptron apparatus board...")
    Mix.shell().info("Parameters:")
    Mix.shell().info("  Size: #{size}mm")
    Mix.shell().info("  Network: #{n_input}-#{n_hidden}-#{n_output}")
    Mix.shell().info("  Operations per inference: #{ops.total} (#{ops.mac} MAC + #{ops.relu} ReLU)")
    Mix.shell().info("  Estimated time per inference: #{format_time(ops.time_seconds)}")
    if qr_data, do: Mix.shell().info("  QR data: #{qr_data}")
    if print_mode, do: Mix.shell().info("  Print mode: enabled")
    Mix.shell().info("  Output file: #{filename}")
    Mix.shell().info("")

    # Create the board using domain code interface
    case PerceptronApparatus.create_board(size, n_input, n_hidden, n_output, qr_data) do
      {:ok, board} ->
        Mix.shell().info("Board created successfully (ID: #{board.id})")

        # Generate SVG using domain code interface
        case PerceptronApparatus.write_svg(board, filename, print_mode) do
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

      {:error, error} ->
        Mix.shell().error("Failed to create board:")
        Mix.shell().error(inspect(error, pretty: true))
        System.halt(1)
    end
  end

  defp count_operations(n_input, n_hidden, n_output) do
    layer1_muls = n_input * n_hidden
    layer1_adds = n_input * n_hidden
    layer1_relu = n_hidden * 2

    layer2_muls = n_hidden * n_output
    layer2_adds = n_hidden * n_output

    mac_ops = layer1_muls + layer1_adds + layer2_muls + layer2_adds
    relu_ops = layer1_relu
    total_ops = mac_ops + relu_ops

    time_seconds = total_ops / 0.1

    %{mac: mac_ops, relu: relu_ops, total: total_ops, time_seconds: time_seconds}
  end

  defp format_time(seconds) when seconds < 60 do
    "#{Float.round(seconds, 1)}s"
  end

  defp format_time(seconds) when seconds < 3600 do
    minutes = div(trunc(seconds), 60)
    remaining_seconds = rem(trunc(seconds), 60)
    "#{minutes}m #{remaining_seconds}s"
  end

  defp format_time(seconds) do
    hours = div(trunc(seconds), 3600)
    remaining_seconds = rem(trunc(seconds), 3600)
    minutes = div(remaining_seconds, 60)
    remaining_seconds = rem(remaining_seconds, 60)
    "#{hours}h #{minutes}m #{remaining_seconds}s"
  end
end