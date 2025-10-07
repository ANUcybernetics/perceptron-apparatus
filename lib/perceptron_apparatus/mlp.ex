defmodule PerceptronApparatus.MLP do
  @moduledoc """
  Multi-Layer Perceptron utilities using Axon for creating, training, and analyzing
  a specific 36x6x10 neural network architecture on MNIST data.

  This module provides functionality to:
  - Load and preprocess MNIST data (resizing 28x28 images to 6x6, then flattening to 36 features)
  - Create a fixed architecture MLP: 36 inputs -> 6 hidden neurons (ReLU) -> 10 outputs (softmax)
  - Train the model on real MNIST data with 90/10 train/test split
  - Track and analyze parameter ranges after training
  - Track and analyze activation ranges during inference
  - Export trained weights to JSON format for use in other tools (e.g. Typst)
  - Suppress noisy training logs for cleaner output

  ## Example Usage

      # Run complete analysis workflow
      result = PerceptronApparatus.MLP.analyze_mnist_mlp(epochs: 8, batch_size: 128)

      # Or run individual steps
      {train_data, test_data} = PerceptronApparatus.MLP.load_mnist_data()
      model = PerceptronApparatus.MLP.create_model()
      trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 5)
      PerceptronApparatus.MLP.inspect_parameters(trained_params)

      # Export weights to JSON
      PerceptronApparatus.MLP.write_weights_to_json(trained_params, "weights.json")
  """

  alias Axon.Loop

  @doc """
  Custom initializer that creates weights in a tight, consistent range.
  All weights will be uniformly distributed in [-bound, +bound].
  This ensures close grouping of parameters (same order of magnitude).
  """
  def bounded_uniform_initializer(opts \\ []) do
    bound = Keyword.get(opts, :bound, 0.1)
    
    fn shape, type, _key ->
      # Create deterministic uniform values in [-bound, +bound]
      total_elements = Tuple.product(shape)
      
      uniform_values = 
        0..(total_elements - 1)
        |> Enum.map(fn i -> 
          # Create a pseudo-random but deterministic pattern
          base = rem(i * 23 + 47, 1000) / 1000.0  # Values between 0 and 1
          (base - 0.5) * 2 * bound  # Scale to [-bound, +bound]
        end)
        |> Nx.tensor(type: type)
        |> Nx.reshape(shape)
      
      uniform_values
    end
  end

  @doc """
  Custom initializer for hidden layer weights to achieve [0,1.5] activation range.
  Designed for 36 inputs (MNIST 6x6 flattened) to keep ReLU outputs in [0,1.5].
  """
  def hidden_bounded_initializer(opts \\ []) do
    # With 36 inputs each in [0,1], we want max sum ~1.5 after ReLU
    # So individual weights should be around ±(1.5/36) = ±0.042
    bound = Keyword.get(opts, :bound, 0.045)
    bounded_uniform_initializer(bound: bound)
  end

  @doc """
  Custom initializer for output layer weights to achieve [-1.5,1.5] activation range.
  Designed for 6 hidden units each in [0,1.5] to keep outputs in [-1.5,1.5].
  """
  def output_bounded_initializer(opts \\ []) do
    # With 6 hidden units each in [0,1.5], we want sums in [-1.5,1.5]
    # So individual weights should be around ±(1.5/6) = ±0.25
    bound = Keyword.get(opts, :bound, 0.255)
    bounded_uniform_initializer(bound: bound)
  end

  @doc """
  Creates a 36x6x10 MLP model with ReLU activation for MNIST classification.
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
  Creates a model with bounded activation ranges using custom initializers.
  Hidden layer activations: [0,1], Output layer activations: [-1,1].
  All parameters are closely grouped in similar ranges.
  """
  def create_bounded_model do
    Axon.input("input", shape: {nil, 36})
    |> Axon.dense(6,
      activation: :relu,
      use_bias: false,
      name: "hidden",
      kernel_initializer: hidden_bounded_initializer()
    )
    |> Axon.dense(10, 
      use_bias: false, 
      name: "output", 
      kernel_initializer: output_bounded_initializer()
    )
  end

  @doc """
  Creates a model with hooks attached for activation tracking during inference.
  """
  def create_model_with_hooks do
    input = Axon.input("input", shape: {nil, 36})

    # Attach hook to capture input values
    input_with_hook = Axon.attach_hook(input, &capture_activation(&1, "input"), on: :forward)

    # Hidden layer with hook
    hidden =
      Axon.dense(input_with_hook, 6,
        activation: :relu,
        use_bias: false,
        name: "hidden",
        kernel_initializer: :glorot_uniform
      )

    hidden_with_hook = Axon.attach_hook(hidden, &capture_activation(&1, "hidden"), on: :forward)

    # Output layer with hook
    output =
      Axon.dense(hidden_with_hook, 10,
        use_bias: false,
        name: "output",
        kernel_initializer: :glorot_uniform
      )

    Axon.attach_hook(output, &capture_activation(&1, "output"), on: :forward)
  end

  @doc """
  Creates a bounded model with hooks for activation tracking.
  """
  def create_bounded_model_with_hooks do
    input = Axon.input("input", shape: {nil, 36})

    # Attach hook to capture input values
    input_with_hook = Axon.attach_hook(input, &capture_activation(&1, "input"), on: :forward)

    # Hidden layer with bounded weights and hook
    hidden =
      Axon.dense(input_with_hook, 6,
        activation: :relu,
        use_bias: false,
        name: "hidden",
        kernel_initializer: hidden_bounded_initializer()
      )

    hidden_with_hook = Axon.attach_hook(hidden, &capture_activation(&1, "hidden"), on: :forward)

    # Output layer with bounded weights and hook
    output =
      Axon.dense(hidden_with_hook, 10,
        use_bias: false,
        name: "output",
        kernel_initializer: output_bounded_initializer()
      )

    Axon.attach_hook(output, &capture_activation(&1, "output"), on: :forward)
  end

  @doc """
  Loads and preprocesses MNIST data, resizing images to 6x6 pixels.
  Returns {train_data, test_data} with 90/10 split.
  """
  def load_mnist_data do
    # Load MNIST data
    {{train_images_binary, train_images_type, train_images_shape},
     {train_labels_binary, train_labels_type, train_labels_shape}} = Scidata.MNIST.download()

    # Convert to tensors
    train_images =
      train_images_binary
      |> Nx.from_binary(train_images_type)
      |> Nx.reshape(train_images_shape)
      |> Nx.as_type(:f32)

    train_labels =
      train_labels_binary
      |> Nx.from_binary(train_labels_type)
      |> Nx.reshape(train_labels_shape)
      |> Nx.as_type(:s64)

    # Remove the extra dimension and resize images from 28x28 to 6x6, then flatten to 36
    train_images =
      train_images
      # Remove the singleton dimension to get {60000, 28, 28}
      |> Nx.squeeze(axes: [1])
      |> resize_images_to_6x6()
      |> Nx.reshape({:auto, 36})

    # Normalize pixel values to [0, 1]
    train_images = Nx.divide(train_images, 255.0)

    # Convert labels to one-hot encoding
    train_labels_one_hot =
      Nx.equal(
        Nx.new_axis(train_labels, -1),
        Nx.tensor(Enum.to_list(0..9))
      )
      |> Nx.as_type(:f32)

    # Split into train (90%) and test (10%)
    total_samples = Nx.axis_size(train_images, 0)
    train_size = trunc(total_samples * 0.9)

    train_data = {
      Nx.slice_along_axis(train_images, 0, train_size, axis: 0),
      Nx.slice_along_axis(train_labels_one_hot, 0, train_size, axis: 0)
    }

    test_data = {
      Nx.slice_along_axis(train_images, train_size, total_samples - train_size, axis: 0),
      Nx.slice_along_axis(train_labels_one_hot, train_size, total_samples - train_size, axis: 0)
    }

    {train_data, test_data}
  end

  # Resize images from 28x28 to 6x6 using simple downsampling.
  defp resize_images_to_6x6(images) do
    # Simple downsampling: take every ~4.67th pixel (28/6 ≈ 4.67)
    # We'll use indices [0, 5, 9, 14, 18, 23] for both dimensions
    indices = Nx.tensor([0, 5, 9, 14, 18, 23])

    images
    |> Nx.take(indices, axis: 1)
    |> Nx.take(indices, axis: 2)
  end

  @doc """
  Trains the model on MNIST data with minimal logging.
  """
  def train_model(model, train_data, opts \\ []) do
    # Reduced default epochs
    epochs = Keyword.get(opts, :epochs, 10)
    # Larger batch size for faster training
    batch_size = Keyword.get(opts, :batch_size, 128)
    learning_rate = Keyword.get(opts, :learning_rate, 0.005)

    {train_images, train_labels} = train_data

    # Create batched data stream
    batched_data =
      train_images
      |> Nx.to_batched(batch_size)
      |> Stream.zip(Nx.to_batched(train_labels, batch_size))

    # Create training loop with MSE loss to avoid numerical issues
    model
    |> Loop.trainer(
      :mean_squared_error,
      Polaris.Optimizers.adam(learning_rate: learning_rate)
    )
    |> Loop.metric(:accuracy)
    |> Loop.run(batched_data, %{}, epochs: epochs)
  end

  @doc """
  Inspects and prints the ranges of all trained parameters.
  """
  def inspect_parameters(model_state) do
    IO.puts("\n=== TRAINED PARAMETER RANGES ===")

    params = model_state.data

    Enum.each(params, fn {layer_name, layer_params} ->
      IO.puts("\nLayer: #{layer_name}")

      Enum.each(layer_params, fn {param_name, param_tensor} ->
        min_val = Nx.reduce_min(param_tensor) |> Nx.to_number()
        max_val = Nx.reduce_max(param_tensor) |> Nx.to_number()
        mean_val = Nx.mean(param_tensor) |> Nx.to_number()

        IO.puts(
          "  #{param_name}: min=#{Float.round(min_val, 4)}, max=#{Float.round(max_val, 4)}, mean=#{Float.round(mean_val, 4)}"
        )

        # For weight parameters, also show the specific min/max weight values
        if param_name == "kernel" do
          # Find indices of min and max values
          min_indices = Nx.argmin(Nx.flatten(param_tensor)) |> Nx.to_number()
          max_indices = Nx.argmax(Nx.flatten(param_tensor)) |> Nx.to_number()

          # Convert flat indices to multi-dimensional indices
          shape = Nx.shape(param_tensor)
          {_rows, cols} = shape

          min_row = div(min_indices, cols)
          min_col = rem(min_indices, cols)
          max_row = div(max_indices, cols)
          max_col = rem(max_indices, cols)

          IO.puts(
            "    Min weight: #{Float.round(min_val, 6)} at position [#{min_row}, #{min_col}]"
          )

          IO.puts(
            "    Max weight: #{Float.round(max_val, 6)} at position [#{max_row}, #{max_col}]"
          )
        end
      end)
    end)

    IO.puts("")
  end

  @doc """
  Collects parameter statistics without printing them.
  Returns a map with layer statistics for consolidated printing.
  """
  def collect_parameter_stats(model_state) do
    params = model_state.data

    Enum.map(params, fn {layer_name, layer_params} ->
      layer_stats =
        Enum.map(layer_params, fn {param_name, param_tensor} ->
          min_val = Nx.reduce_min(param_tensor) |> Nx.to_number()
          max_val = Nx.reduce_max(param_tensor) |> Nx.to_number()
          mean_val = Nx.mean(param_tensor) |> Nx.to_number()

          param_info = %{
            name: param_name,
            min: min_val,
            max: max_val,
            mean: mean_val
          }

          # For weight parameters, also collect min/max position info
          if param_name == "kernel" do
            # Find indices of min and max values
            min_indices = Nx.argmin(Nx.flatten(param_tensor)) |> Nx.to_number()
            max_indices = Nx.argmax(Nx.flatten(param_tensor)) |> Nx.to_number()

            # Convert flat indices to multi-dimensional indices
            shape = Nx.shape(param_tensor)
            {_rows, cols} = shape

            min_row = div(min_indices, cols)
            min_col = rem(min_indices, cols)
            max_row = div(max_indices, cols)
            max_col = rem(max_indices, cols)

            Map.merge(param_info, %{
              min_position: [min_row, min_col],
              max_position: [max_row, max_col]
            })
          else
            param_info
          end
        end)

      {layer_name, layer_stats}
    end)
    |> Enum.into(%{})
  end

  @doc """
  Runs inference on test data while tracking activation values.
  Returns both the predictions and the captured activations.
  """
  def run_inference_with_tracking(model, model_state, test_data, num_samples \\ 100) do
    # Start the activation capture process
    start_activation_capture()

    {test_images, _test_labels} = test_data

    # Take only the specified number of samples
    test_inputs = Nx.slice_along_axis(test_images, 0, num_samples, axis: 0)

    # Run inference
    {_init_fn, predict_fn} = Axon.build(model)
    predictions = predict_fn.(model_state, %{"input" => test_inputs})

    # Get captured activations and print summary
    activations = get_captured_activations()
    print_activation_summary(activations)

    {predictions, activations}
  end

  # Private functions for activation tracking

  defp capture_activation(tensor, layer_name) do
    # Store activation values in process dictionary for tracking
    current_activations = Process.get(:activations, %{})

    # Convert to numbers for analysis
    min_val = Nx.reduce_min(tensor) |> Nx.to_number()
    max_val = Nx.reduce_max(tensor) |> Nx.to_number()
    mean_val = Nx.mean(tensor) |> Nx.to_number()

    # Update activation tracking
    layer_stats = Map.get(current_activations, layer_name, %{min: [], max: [], mean: []})

    updated_stats = %{
      min: [min_val | layer_stats.min],
      max: [max_val | layer_stats.max],
      mean: [mean_val | layer_stats.mean]
    }

    Process.put(:activations, Map.put(current_activations, layer_name, updated_stats))

    tensor
  end

  defp start_activation_capture do
    Process.put(:activations, %{})
  end

  defp get_captured_activations do
    Process.get(:activations, %{})
  end

  defp print_activation_summary(activations) do
    IO.puts("\n=== INFERENCE ACTIVATION RANGES ===")

    Enum.each(activations, fn {layer_name, stats} ->
      overall_min = Enum.min(stats.min)
      overall_max = Enum.max(stats.max)
      avg_mean = Enum.sum(stats.mean) / length(stats.mean)

      IO.puts(
        "#{layer_name}: min=#{Float.round(overall_min, 4)}, max=#{Float.round(overall_max, 4)}, avg_mean=#{Float.round(avg_mean, 4)}"
      )
    end)

    IO.puts("")
  end

  @doc """
  Complete workflow: loads MNIST data, creates 36x6x10 model, trains it, and analyzes both parameters and activations.
  """
  def analyze_mnist_mlp(opts \\ []) do
    IO.puts("Loading and preprocessing MNIST data...")
    {train_data, test_data} = load_mnist_data()

    IO.puts("Creating 36x6x10 MLP model for MNIST classification")

    # Create and train regular model
    model = create_model()

    IO.puts("Training model on MNIST data...")
    default_opts = [epochs: 8, batch_size: 128, learning_rate: 0.005]
    merged_opts = Keyword.merge(default_opts, opts)
    trained_params = train_model(model, train_data, merged_opts)

    # Inspect trained parameters
    inspect_parameters(trained_params)

    # Create model with hooks for activation tracking
    model_with_hooks = create_model_with_hooks()

    IO.puts("Running inference with activation tracking...")

    {predictions, activations} =
      run_inference_with_tracking(model_with_hooks, trained_params, test_data)

    # Calculate test accuracy
    {test_images, test_labels} = test_data
    _test_inputs = Nx.slice_along_axis(test_images, 0, 100, axis: 0)
    test_targets = Nx.slice_along_axis(test_labels, 0, 100, axis: 0)

    predicted_classes = Nx.argmax(predictions, axis: 1)
    actual_classes = Nx.argmax(test_targets, axis: 1)
    accuracy = Nx.mean(Nx.equal(predicted_classes, actual_classes)) |> Nx.to_number()

    IO.puts("Test accuracy: #{Float.round(accuracy * 100, 2)}%")

    %{
      model: model,
      params: trained_params,
      predictions: predictions,
      activations: activations,
      test_accuracy: accuracy
    }
  end

  @doc """
  Extracts weight matrices from trained model parameters.
  Returns a map with keys "B" (input->hidden weights) and "D" (hidden->output weights).
  Each value is a 2D list representing the weight matrix.

  The structure uses 2D arrays (list of lists) which can be easily:
  - Accessed by index in Typst: `weights.B.at(row).at(col)`
  - Converted to tables in Typst using `#table(...weights.B.flatten())`
  - Iterated over for creating custom visualisations

  ## Shape

  - B: {36, 6} - Maps each of 36 input features to 6 hidden neurons
  - D: {6, 10} - Maps each of 6 hidden neurons to 10 output classes
  """
  def extract_weights(model_state) do
    params = model_state.data

    # Extract hidden layer weights (input -> hidden): shape {36, 6}
    b_weights = params["hidden"]["kernel"]
    b_list = b_weights |> Nx.to_list()

    # Extract output layer weights (hidden -> output): shape {6, 10}
    d_weights = params["output"]["kernel"]
    d_list = d_weights |> Nx.to_list()

    %{"B" => b_list, "D" => d_list}
  end

  @doc """
  Writes trained weights to a JSON file.
  The JSON structure has top-level keys "B" and "D" containing 2D arrays of weights,
  and optionally "test_accuracy" if provided.

  ## Example

      trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 5)
      PerceptronApparatus.MLP.write_weights_to_json(trained_params, "weights.json")

      # With test accuracy
      PerceptronApparatus.MLP.write_weights_to_json(trained_params, "weights.json", test_accuracy: 0.85)

  ## Typst Usage

  In Typst, you can read and use the weights like this:

      #let weights = json("weights.json")
      #table(
        columns: 6,
        ..weights.B.flatten()
      )

      // Display accuracy if available
      Test accuracy: #weights.test_accuracy
  """
  def write_weights_to_json(model_state, filename, opts \\ []) do
    weights = extract_weights(model_state)

    data = if test_accuracy = opts[:test_accuracy] do
      Map.put(weights, "test_accuracy", test_accuracy)
    else
      weights
    end

    json = Jason.encode!(data, pretty: true)
    File.write!(filename, json)
    IO.puts("Weights written to #{filename}")
  end

  @doc """
  Analyzes a model with bounded initialization before and after training.
  This shows the activation ranges with bounded weights targeting [-1,1] ranges.
  """
  def analyze_bounded_initialization(opts \\ []) do
    IO.puts("Loading and preprocessing MNIST data...")
    {train_data, test_data} = load_mnist_data()

    IO.puts("Creating bounded 36x6x10 MLP model with grouped parameters...")

    # Create bounded model
    model = create_bounded_model()
    
    # Initialize the model to see initial parameter ranges
    {init_fn, _predict_fn} = Axon.build(model)
    initial_params = init_fn.(Nx.template({1, 36}, :f32), %{})

    IO.puts("\n=== INITIAL BOUNDED PARAMETER RANGES ===")
    initial_param_stats = collect_parameter_stats(initial_params)

    # Create model with hooks for activation tracking
    model_with_hooks = create_bounded_model_with_hooks()

    IO.puts("Running inference on untrained bounded model...")

    {initial_predictions, initial_activations} = 
      run_inference_with_tracking(model_with_hooks, initial_params, test_data, 100)

    IO.puts("Initial activations with bounded weights (before training):")
    
    # Print initial bounded activation ranges
    IO.puts("\n=== INITIAL BOUNDED ACTIVATION RANGES ===")
    Enum.each(["input", "hidden", "output"], fn layer_name ->
      if Map.has_key?(initial_activations, layer_name) do
        stats = initial_activations[layer_name]
        min_activation = Enum.min(stats.min)
        max_activation = Enum.max(stats.max)
        IO.puts("#{layer_name}: min=#{Float.round(min_activation, 4)}, max=#{Float.round(max_activation, 4)}")
      end
    end)

    # Train the model
    IO.puts("\nTraining bounded model for comparison...")
    epochs = Keyword.get(opts, :epochs, 3)
    trained_params = train_model(model, train_data, epochs: epochs, batch_size: 128)

    # Analyze trained model
    trained_param_stats = collect_parameter_stats(trained_params)

    {trained_predictions, trained_activations} = 
      run_inference_with_tracking(model_with_hooks, trained_params, test_data, 100)

    # Print comparison
    IO.puts("\n=== PARAMETER COMPARISON ===")
    IO.puts("INITIAL:")
    Enum.each(initial_param_stats, fn {layer_name, layer_params} ->
      kernel_param = Enum.find(layer_params, fn param -> param.name == "kernel" end)
      if kernel_param do
        IO.puts("  #{layer_name} kernel: min=#{Float.round(kernel_param.min, 4)}, max=#{Float.round(kernel_param.max, 4)}, mean=#{Float.round(kernel_param.mean, 4)}")
      end
    end)

    IO.puts("TRAINED:")
    Enum.each(trained_param_stats, fn {layer_name, layer_params} ->
      kernel_param = Enum.find(layer_params, fn param -> param.name == "kernel" end)
      if kernel_param do
        IO.puts("  #{layer_name} kernel: min=#{Float.round(kernel_param.min, 4)}, max=#{Float.round(kernel_param.max, 4)}, mean=#{Float.round(kernel_param.mean, 4)}")
      end
    end)

    IO.puts("\n=== ACTIVATION COMPARISON ===")
    IO.puts("INITIAL:")
    Enum.each(["input", "hidden", "output"], fn layer_name ->
      if Map.has_key?(initial_activations, layer_name) do
        stats = initial_activations[layer_name]
        min_activation = Enum.min(stats.min)
        max_activation = Enum.max(stats.max)
        IO.puts("  #{layer_name}: min=#{Float.round(min_activation, 4)}, max=#{Float.round(max_activation, 4)}")
      end
    end)

    IO.puts("TRAINED:")
    Enum.each(["input", "hidden", "output"], fn layer_name ->
      if Map.has_key?(trained_activations, layer_name) do
        stats = trained_activations[layer_name]
        min_activation = Enum.min(stats.min)
        max_activation = Enum.max(stats.max)
        IO.puts("  #{layer_name}: min=#{Float.round(min_activation, 4)}, max=#{Float.round(max_activation, 4)}")
      end
    end)

    %{
      model: model,
      initial_params: initial_params,
      trained_params: trained_params,
      initial_predictions: initial_predictions,
      trained_predictions: trained_predictions,
      initial_activations: initial_activations,
      trained_activations: trained_activations
    }
  end
end
