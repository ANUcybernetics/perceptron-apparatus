defmodule Mix.Tasks.Perceptron.ExportWeights do
  @moduledoc """
  Train a model and export weights to JSON.

  ## Usage

      mix perceptron.export_weights [options]

  ## Options

    * `--epochs` - Number of training epochs (default: 5)
    * `--batch-size` - Batch size for training (default: 128)
    * `--learning-rate` - Learning rate for training (default: 0.005)
    * `--output` - Output file path (default: weights.json)
    * `--scale` - Scale weights to use full apparatus range (default: true)
    * `--target-max` - Target maximum value when scaling (default: 5.0)
    * `--help` - Show this help message

  ## Examples

      # Train and export with defaults
      mix perceptron.export_weights

      # Custom training parameters
      mix perceptron.export_weights --epochs 10 --batch-size 256

      # Save to specific file without scaling
      mix perceptron.export_weights --output weights.json --no-scale

      # Custom scaling range
      mix perceptron.export_weights --scale --target-max 10.0
  """

  @shortdoc "Train a model and export weights to JSON"

  use Mix.Task

  alias PerceptronApparatus.MLP

  @switches [
    epochs: :integer,
    batch_size: :integer,
    learning_rate: :float,
    output: :string,
    scale: :boolean,
    target_max: :float,
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
    output: "weights.json",
    scale: true,
    target_max: 5.0
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

    Mix.shell().info("Training MNIST model and exporting weights...\n")

    Mix.shell().info("Step 1: Loading MNIST data")
    {train_data, _test_data} = MLP.load_mnist_data()

    Mix.shell().info("Step 2: Creating model")
    model = MLP.create_model()

    Mix.shell().info("Step 3: Training model (#{epochs} epochs)")
    trained_params = MLP.train_model(model, train_data,
      epochs: epochs,
      batch_size: batch_size,
      learning_rate: learning_rate
    )

    Mix.shell().info("\nStep 4: Exporting weights to JSON#{if scale_to_range, do: " (with scaling)", else: ""}")

    write_opts = if scale_to_range do
      [scale_to_range: true, target_max: target_max]
    else
      []
    end

    MLP.write_weights_to_json(trained_params, output_file, write_opts)

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
