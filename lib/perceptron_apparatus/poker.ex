defmodule PerceptronApparatus.Poker do
  @moduledoc """
  Multi-Layer Perceptron utilities using Axon for creating, training, and analyzing
  a specific 36x6x10 neural network architecture on Poker Hand data.

  This module provides functionality to:
  - Download and preprocess UCI Poker Hand dataset
  - Encode 5-card poker hands into 36-dimensional feature vectors
  - Create a fixed architecture MLP: 36 inputs -> 6 hidden neurons (ReLU) -> 10 outputs
  - Train the model on poker hand classification
  - Track and analyze parameter ranges after training
  - Export trained weights to JSON format for use in other tools (e.g. Typst)

  ## Dataset

  The UCI Poker Hand dataset contains:
  - Training set: 25,010 instances
  - Test set: 1,000,000 instances (we use a subset for efficiency)
  - 10 classes representing poker hand rankings (0-9)
  - Each instance: 5 cards with suit (1-4) and rank (1-13)

  ## Encoding

  Each poker hand is encoded as 36 features:
  - 5 cards × 7 features per card = 35 dimensions
  - Card features: 4 suit indicators (one-hot) + 3 rank indicators (binned)
  - Plus 1 padding dimension to reach 36 total

  ## Example Usage

      # Run complete analysis workflow
      result = PerceptronApparatus.Poker.analyze_poker_mlp(epochs: 8)

      # Or run individual steps
      {train_data, test_data} = PerceptronApparatus.Poker.load_poker_data()
      model = PerceptronApparatus.Poker.create_model()
      trained_params = PerceptronApparatus.Poker.train_model(model, train_data, epochs: 5)
      PerceptronApparatus.Poker.inspect_parameters(trained_params)

      # Export weights to JSON
      PerceptronApparatus.Poker.write_weights_to_json(trained_params, "poker-weights.json")
  """

  alias Axon.Loop

  @doc """
  Downloads the UCI Poker Hand dataset.
  Returns the training and test data as lists of tuples {features, label}.
  """
  def download_poker_data do
    base_url = "https://archive.ics.uci.edu/ml/machine-learning-databases/poker"
    train_url = "#{base_url}/poker-hand-training-true.data"
    test_url = "#{base_url}/poker-hand-testing.data"

    train_file = Path.join(System.tmp_dir!(), "poker-hand-training.data")
    test_file = Path.join(System.tmp_dir!(), "poker-hand-testing.data")

    # Download if not already cached
    unless File.exists?(train_file) do
      IO.puts("Downloading poker training data...")
      {:ok, _} = :httpc.request(:get, {String.to_charlist(train_url), []}, [], body_format: :binary)
      |> case do
        {:ok, {{_, 200, _}, _headers, body}} ->
          File.write!(train_file, body)
          {:ok, train_file}
        error ->
          {:error, "Failed to download training data: #{inspect(error)}"}
      end
    end

    unless File.exists?(test_file) do
      IO.puts("Downloading poker test data...")
      {:ok, _} = :httpc.request(:get, {String.to_charlist(test_url), []}, [], body_format: :binary)
      |> case do
        {:ok, {{_, 200, _}, _headers, body}} ->
          File.write!(test_file, body)
          {:ok, test_file}
        error ->
          {:error, "Failed to download test data: #{inspect(error)}"}
      end
    end

    {train_file, test_file}
  end

  @doc """
  Parses a poker hand data file.
  Each line: S1,C1,S2,C2,S3,C3,S4,C4,S5,C5,CLASS
  Returns list of {features, label} tuples.
  """
  def parse_poker_file(filepath) do
    File.stream!(filepath)
    |> Stream.map(&String.trim/1)
    |> Stream.reject(&(&1 == ""))
    |> Stream.map(fn line ->
      values =
        line
        |> String.split(",")
        |> Enum.map(&String.to_integer/1)

      # Extract 10 features (5 cards × 2 attributes) and class
      [s1, c1, s2, c2, s3, c3, s4, c4, s5, c5, class] = values

      features = [s1, c1, s2, c2, s3, c3, s4, c4, s5, c5]
      {features, class}
    end)
    |> Enum.to_list()
  end

  @doc """
  Encodes a poker hand into a 36-dimensional feature vector.

  Encoding scheme per card (7 features × 5 cards = 35, pad to 36):
  - Suit: 4 one-hot indicators (diamonds=1, hearts=2, spades=3, clubs=4)
  - Rank: 3 binned indicators (low=2-5, mid=6-9, high=10-A where Ace is treated as 14)

  ## Example

      encode_poker_hand([1, 10, 2, 5, 3, 1, 4, 13, 1, 7])
      # Returns 36-element list
  """
  def encode_poker_hand(features) do
    # features = [s1, c1, s2, c2, s3, c3, s4, c4, s5, c5]
    features
    |> Enum.chunk_every(2)
    |> Enum.flat_map(fn [suit, rank] ->
      encode_card(suit, rank)
    end)
    |> then(fn encoded -> encoded ++ [0.0] end)  # Pad to 36
  end

  @doc """
  Encodes a single card into a 7-dimensional vector.

  ## Parameters

    * `suit` - Suit value (1=Hearts, 2=Spades, 3=Diamonds, 4=Clubs)
    * `rank` - Rank value (1-13 from dataset, where 1=Ace, 11=Jack, 12=Queen, 13=King)

  ## Returns

  7-element list: [suit_1, suit_2, suit_3, suit_4, rank_low, rank_mid, rank_high]

  Rank encoding (after remapping Ace from 1 to 14):
  - Low (2-5): [1, 0, 0]
  - Mid (6-9): [0, 1, 0]
  - High (10-14): [0, 0, 1]
  """
  def encode_card(suit, rank) do
    # Remap Ace from 1 to 14 to make it the highest rank
    rank = if rank == 1, do: 14, else: rank

    # One-hot encode suit (4 dimensions)
    suit_encoding = for s <- 1..4, do: if(s == suit, do: 1.0, else: 0.0)

    # Bin rank into 3 categories (3 dimensions)
    rank_encoding = cond do
      rank >= 2 and rank <= 5 -> [1.0, 0.0, 0.0]   # Low (2-5)
      rank >= 6 and rank <= 9 -> [0.0, 1.0, 0.0]   # Mid (6-9)
      rank >= 10 -> [0.0, 0.0, 1.0]                # High (10-A)
    end

    suit_encoding ++ rank_encoding
  end

  @doc """
  Loads and preprocesses poker hand data.
  Returns {train_data, test_data} as tuples of {features_tensor, labels_tensor}.

  Uses full training set (25,010 samples) and a subset of test set (10,000 samples).
  """
  def load_poker_data do
    {train_file, test_file} = download_poker_data()

    IO.puts("Parsing poker hand data...")
    train_parsed = parse_poker_file(train_file)
    test_parsed = parse_poker_file(test_file)

    # Use full training set, subset of test set for efficiency
    test_subset = Enum.take(test_parsed, 10_000)

    # Encode features
    train_features =
      train_parsed
      |> Enum.map(fn {features, _class} -> encode_poker_hand(features) end)
      |> Nx.tensor(type: :f32)

    train_labels =
      train_parsed
      |> Enum.map(fn {_features, class} -> class end)
      |> Nx.tensor(type: :s64)

    test_features =
      test_subset
      |> Enum.map(fn {features, _class} -> encode_poker_hand(features) end)
      |> Nx.tensor(type: :f32)

    test_labels =
      test_subset
      |> Enum.map(fn {_features, class} -> class end)
      |> Nx.tensor(type: :s64)

    # Convert labels to one-hot encoding (10 classes)
    train_labels_one_hot =
      Nx.equal(
        Nx.new_axis(train_labels, -1),
        Nx.tensor(Enum.to_list(0..9))
      )
      |> Nx.as_type(:f32)

    test_labels_one_hot =
      Nx.equal(
        Nx.new_axis(test_labels, -1),
        Nx.tensor(Enum.to_list(0..9))
      )
      |> Nx.as_type(:f32)

    {{train_features, train_labels_one_hot}, {test_features, test_labels_one_hot}}
  end

  @doc """
  Creates a 36x6x10 MLP model with ReLU activation for poker hand classification.
  """
  def create_model do
    Axon.input("input", shape: {nil, 36})
    |> Axon.dense(6,
      activation: :relu,
      use_bias: false,
      name: "hidden",
      kernel_initializer: :glorot_uniform
    )
    |> Axon.dense(10, use_bias: false, name: "output", kernel_initializer: :glorot_uniform)
  end

  @doc """
  Creates a model with non-negative output layer weights.
  """
  def create_nonnegative_output_model do
    # Use same initializer from MLP module
    nonnegative_init = PerceptronApparatus.MLP.nonnegative_output_initializer()

    Axon.input("input", shape: {nil, 36})
    |> Axon.dense(6,
      activation: :relu,
      use_bias: false,
      name: "hidden",
      kernel_initializer: :glorot_uniform
    )
    |> Axon.dense(10,
      use_bias: false,
      name: "output",
      kernel_initializer: nonnegative_init
    )
  end

  @doc """
  Trains the model on poker hand data with minimal logging.

  ## Options

    * `:epochs` - Number of training epochs (default: 10)
    * `:batch_size` - Batch size for training (default: 128)
    * `:learning_rate` - Learning rate for optimizer (default: 0.005)
    * `:nonnegative_output` - If true, constrains output layer weights to be non-negative (default: false)
  """
  def train_model(model, train_data, opts \\ []) do
    epochs = Keyword.get(opts, :epochs, 10)
    batch_size = Keyword.get(opts, :batch_size, 128)
    learning_rate = Keyword.get(opts, :learning_rate, 0.005)
    nonnegative_output = Keyword.get(opts, :nonnegative_output, false)

    {train_features, train_labels} = train_data

    # Create batched data stream
    batched_data =
      train_features
      |> Nx.to_batched(batch_size)
      |> Stream.zip(Nx.to_batched(train_labels, batch_size))

    # Create training loop with MSE loss
    loop =
      model
      |> Loop.trainer(
        :mean_squared_error,
        Polaris.Optimizers.adam(learning_rate: learning_rate)
      )
      |> Loop.metric(:accuracy)

    # Add weight projection if needed
    loop =
      if nonnegative_output do
        Loop.handle_event(loop, :iteration_completed, &project_output_weights_nonnegative/1)
      else
        loop
      end

    Loop.run(loop, batched_data, %{}, epochs: epochs)
  end

  # Project output layer weights to be non-negative after each update
  defp project_output_weights_nonnegative(state) do
    model_state = state.step_state.model_state
    params = model_state.data

    updated_params =
      update_in(params, ["output", "kernel"], fn weights ->
        Nx.max(weights, 0)
      end)

    updated_model_state = %{model_state | data: updated_params}
    updated_step_state = %{state.step_state | model_state: updated_model_state}
    {:continue, %{state | step_state: updated_step_state}}
  end

  @doc """
  Inspects and prints the ranges of all trained parameters.
  """
  def inspect_parameters(model_state) do
    PerceptronApparatus.MLP.inspect_parameters(model_state)
  end

  @doc """
  Extracts weight matrices from trained model parameters.
  Returns a map with keys "B" (input->hidden weights) and "D" (hidden->output weights).
  """
  def extract_weights(model_state) do
    PerceptronApparatus.MLP.extract_weights(model_state)
  end

  @doc """
  Writes trained weights to a JSON file.

  ## Options

    * `:test_accuracy` - Test accuracy to include in JSON
    * `:scale_to_range` - If true, scales weights so max abs value in each layer is 5.0 (default: false)
    * `:target_max` - Target maximum absolute value when scaling (default: 5.0)

  ## Example

      trained_params = PerceptronApparatus.Poker.train_model(model, train_data, epochs: 5)
      PerceptronApparatus.Poker.write_weights_to_json(trained_params, "poker-weights.json")
  """
  def write_weights_to_json(model_state, filename, opts \\ []) do
    PerceptronApparatus.MLP.write_weights_to_json(model_state, filename, opts)
  end

  @doc """
  Complete workflow: loads poker data, creates 36x6x10 model, trains it, and analyzes parameters.
  """
  def analyze_poker_mlp(opts \\ []) do
    IO.puts("Loading and preprocessing poker hand data...")
    {train_data, test_data} = load_poker_data()

    IO.puts("Creating 36x6x10 MLP model for poker hand classification")
    model = create_model()

    IO.puts("Training model on poker hand data...")
    default_opts = [epochs: 8, batch_size: 128, learning_rate: 0.005]
    merged_opts = Keyword.merge(default_opts, opts)
    trained_params = train_model(model, train_data, merged_opts)

    inspect_parameters(trained_params)

    # Calculate test accuracy
    {test_features, test_labels} = test_data
    {_init_fn, predict_fn} = Axon.build(model)
    predictions = predict_fn.(trained_params, %{"input" => test_features})

    predicted_classes = Nx.argmax(predictions, axis: 1)
    actual_classes = Nx.argmax(test_labels, axis: 1)
    accuracy = Nx.mean(Nx.equal(predicted_classes, actual_classes)) |> Nx.to_number()

    IO.puts("\nTest accuracy: #{Float.round(accuracy * 100, 2)}%")

    %{
      model: model,
      params: trained_params,
      predictions: predictions,
      test_accuracy: accuracy
    }
  end
end
