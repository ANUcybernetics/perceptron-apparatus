defmodule Mix.Tasks.Perceptron.ExportWeights do
  @moduledoc """
  Train a model for one of the apparatus's tasks and export its weights to JSON.

  ## Usage

      mix perceptron.export_weights [options]

  ## Tasks

    * `mnist` - handwritten digits, downsampled to 6x6 (36 inputs, 10 outputs)
    * `zoo` - animal classification from yes/no traits (21 inputs, 7 outputs)
    * `letters` - next-letter prediction over a 10-symbol alphabet (30 inputs, 10 outputs)

  ## Options

    * `--task` - Which task to train (default: mnist)
    * `--epochs` - Number of training epochs (default depends on the task)
    * `--batch-size` - Batch size for training (default depends on the task)
    * `--learning-rate` - Learning rate for training (default: 0.005)
    * `--restarts` - Train this many times and keep the run with the best training
      accuracy (default depends on the task)
    * `--loss` - `cross_entropy` or `mean_squared_error` (default: cross_entropy)
    * `--no-nonnegative-output` - Allow negative output layer weights
    * `--no-fit` - Export the weights as trained, without rescaling them for the apparatus
    * `--output` - Output file path (default: <task>-weights.json)
    * `--help` - Show this help message

  By default the weights are rescaled so the hidden and output sliders stay within
  their ranges (see `PerceptronApparatus.MLP.fit_weights_to_apparatus/2`) and padded
  with zeros to the 36-input, 10-output board. The exported "test_accuracy" is the
  accuracy of the weights as written.

  ## Examples

      # Train and export MNIST weights with defaults
      mix perceptron.export_weights

      # Train the animal classifier
      mix perceptron.export_weights --task zoo --output docs/zoo-weights.json

      # Custom training parameters
      mix perceptron.export_weights --task letters --epochs 20 --batch-size 256
  """

  @shortdoc "Train a model and export weights to JSON"

  use Mix.Task

  alias PerceptronApparatus.{Letters, MLP, Zoo}

  @switches [
    task: :string,
    epochs: :integer,
    batch_size: :integer,
    learning_rate: :float,
    restarts: :integer,
    loss: :string,
    nonnegative_output: :boolean,
    fit: :boolean,
    output: :string,
    help: :boolean
  ]

  @aliases [
    t: :task,
    e: :epochs,
    b: :batch_size,
    l: :learning_rate,
    o: :output
  ]

  @defaults [
    task: "mnist",
    learning_rate: 0.005,
    loss: "cross_entropy",
    nonnegative_output: true,
    fit: true
  ]

  @board {36, 10}

  @tasks %{
    "mnist" => %{
      load: &MLP.load_mnist_data/0,
      n_input: 36,
      n_output: 10,
      epochs: 10,
      batch_size: 128,
      restarts: 1
    },
    "zoo" => %{
      load: &Zoo.load_data/0,
      n_input: Zoo.n_input(),
      n_output: Zoo.n_output(),
      epochs: 20,
      batch_size: 16,
      passes_per_epoch: 20,
      restarts: 5
    },
    "letters" => %{
      load: &Letters.load_data/0,
      n_input: Letters.n_input(),
      n_output: Letters.n_output(),
      epochs: 10,
      batch_size: 128,
      restarts: 1
    }
  }

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    {opts, _, _} = OptionParser.parse(args, switches: @switches, aliases: @aliases)

    if opts[:help] do
      Mix.shell().info(@moduledoc)
      System.halt(0)
    end

    config = Keyword.merge(@defaults, opts)
    task_name = config[:task]

    task =
      Map.get(@tasks, task_name) ||
        Mix.raise(
          "Unknown task #{inspect(task_name)}, expected one of: #{Enum.join(Map.keys(@tasks), ", ")}"
        )

    loss =
      case config[:loss] do
        "cross_entropy" -> :cross_entropy
        "mean_squared_error" -> :mean_squared_error
        other -> Mix.raise("Unknown loss #{inspect(other)}")
      end

    epochs = config[:epochs] || task.epochs
    restarts = config[:restarts] || task.restarts
    output_file = config[:output] || "#{task_name}-weights.json"

    Mix.shell().info("Loading #{task_name} data")
    {train_data, test_data} = task.load.()
    {train_inputs, _train_labels} = train_data

    Mix.shell().info("Training #{task.n_input}-6-#{task.n_output} model (#{epochs} epochs)")
    model = MLP.create_model(task.n_input, task.n_output)
    epoch_data = repeat_shuffled(train_data, Map.get(task, :passes_per_epoch, 1))

    trained_params =
      1..restarts
      |> Enum.map(fn _run ->
        MLP.train_model(model, epoch_data,
          epochs: epochs,
          batch_size: config[:batch_size] || task.batch_size,
          learning_rate: config[:learning_rate],
          loss: loss,
          nonnegative_output: config[:nonnegative_output]
        )
      end)
      |> Enum.max_by(&MLP.accuracy(MLP.extract_weights(&1), train_data))

    write_opts = [test_data: test_data, pad_to: @board]
    write_opts = if config[:fit], do: [{:fit_to, train_inputs} | write_opts], else: write_opts

    Mix.shell().info("\nExporting weights")
    MLP.write_weights_to_json(trained_params, output_file, write_opts)

    test_accuracy = output_file |> File.read!() |> Jason.decode!() |> Map.fetch!("test_accuracy")

    Mix.shell().info(
      "Test accuracy of the exported weights: #{Float.round(test_accuracy * 100, 1)}%"
    )
  end

  # A small dataset makes for an epoch of only a few steps, and a long run of
  # short epochs exhausts EXLA's processes. Several shuffled passes per epoch
  # give the same training in fewer, longer epochs.
  defp repeat_shuffled(data, 1), do: data

  defp repeat_shuffled({inputs, labels}, passes) do
    n = Nx.axis_size(inputs, 0)
    order = Nx.tensor(for _pass <- 1..passes, index <- Enum.shuffle(0..(n - 1)), do: index)

    {Nx.take(inputs, order), Nx.take(labels, order)}
  end
end
