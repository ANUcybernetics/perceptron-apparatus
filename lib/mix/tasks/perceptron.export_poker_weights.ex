defmodule Mix.Tasks.Perceptron.ExportPokerWeights do
  @moduledoc """
  Train a poker hand classification model and export weights to JSON.

  ## Usage

      mix perceptron.export_poker_weights [options]

  ## Options

    * `--epochs` - Number of training epochs (default: 5)
    * `--batch-size` - Batch size for training (default: 128)
    * `--learning-rate` - Learning rate for training (default: 0.005)
    * `--output` - Output file path (default: poker_weights.json)
    * `--scale` - Scale weights to use full apparatus range (default: true)
    * `--target-max` - Target maximum value when scaling (default: 5.0)
    * `--nonnegative-output` - Constrain output layer weights to be non-negative (default: false)
    * `--help` - Show this help message

  ## Examples

      # Train and export with defaults
      mix perceptron.export_poker_weights

      # Custom training parameters
      mix perceptron.export_poker_weights --epochs 10 --batch-size 256

      # Save to specific file without scaling
      mix perceptron.export_poker_weights --output poker_weights.json --no-scale

      # Custom scaling range
      mix perceptron.export_poker_weights --scale --target-max 10.0

      # Use non-negative output weights for iterative apparatus
      mix perceptron.export_poker_weights --nonnegative-output
  """

  @shortdoc "Train a poker hand model and export weights to JSON"

  use Mix.Task

  alias PerceptronApparatus.Poker

  @switches [
    epochs: :integer,
    batch_size: :integer,
    learning_rate: :float,
    output: :string,
    scale: :boolean,
    target_max: :float,
    nonnegative_output: :boolean,
    help: :boolean
  ]

  @aliases [
    e: :epochs,
    b: :batch_size,
    l: :learning_rate,
    o: :output
  ]

  @defaults [
    epochs: 5,
    batch_size: 128,
    learning_rate: 0.005,
    output: "poker-weights.json",
    scale: true,
    target_max: 5.0,
    nonnegative_output: false
  ]

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    {opts, _, _} = OptionParser.parse(args, switches: @switches, aliases: @aliases)

    if opts[:help] do
      Mix.shell().info(@moduledoc)
      System.halt(0)
    end

    config = Keyword.merge(@defaults, opts)

    epochs = config[:epochs]
    batch_size = config[:batch_size]
    learning_rate = config[:learning_rate]
    output_file = config[:output]
    scale_to_range = config[:scale]
    target_max = config[:target_max]
    nonnegative_output = config[:nonnegative_output]

    Mix.shell().info("Training poker hand classification model and exporting weights...\n")

    Mix.shell().info("Step 1: Loading poker hand data")
    {train_data, _test_data} = Poker.load_poker_data()

    Mix.shell().info("Step 2: Creating model#{if nonnegative_output, do: " (with non-negative output constraint)", else: ""}")
    model = if nonnegative_output do
      Poker.create_nonnegative_output_model()
    else
      Poker.create_model()
    end

    Mix.shell().info("Step 3: Training model (#{epochs} epochs)#{if nonnegative_output, do: " with output weight constraint", else: ""}")
    trained_params = Poker.train_model(model, train_data,
      epochs: epochs,
      batch_size: batch_size,
      learning_rate: learning_rate,
      nonnegative_output: nonnegative_output
    )

    Mix.shell().info("\nStep 4: Exporting weights to JSON#{if scale_to_range, do: " (with scaling)", else: ""}")

    write_opts = if scale_to_range do
      [scale_to_range: true, target_max: target_max]
    else
      []
    end

    Poker.write_weights_to_json(trained_params, output_file, write_opts)

    Mix.shell().info("\nDone! Weights exported to #{output_file}")
    Mix.shell().info("\nYou can now use these weights in Typst:")
    Mix.shell().info("""

      #let weights = json("#{output_file}")

      // Display the B matrix (input->hidden) as a table
      #table(
        columns: 6,
        ..weights.B.flatten()
      )

      // Access individual weights
      #weights.B.at(0).at(0)  // First weight in B matrix
      #weights.D.at(0).at(0)  // First weight in D matrix
    """)
  end
end
