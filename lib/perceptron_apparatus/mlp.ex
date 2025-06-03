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
  - Suppress noisy training logs for cleaner output

  ## Example Usage

      # Run complete analysis workflow
      result = PerceptronApparatus.MLP.analyze_mnist_mlp(epochs: 8, batch_size: 128)
      
      # Or run individual steps
      {train_data, test_data} = PerceptronApparatus.MLP.load_mnist_data()
      model = PerceptronApparatus.MLP.create_model()
      trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 5)
      PerceptronApparatus.MLP.inspect_parameters(trained_params)
  """

  alias Axon.Loop

  @doc """
  Creates a 36x6x10 MLP model with ReLU activation for MNIST classification.
  """
  def create_model do
    Axon.input("input", shape: {nil, 36})
    |> Axon.dense(6, activation: :relu, name: "hidden")
    |> Axon.dense(10, activation: :softmax, name: "output")
  end

  @doc """
  Creates a model with hooks attached for activation tracking during inference.
  """
  def create_model_with_hooks do
    input = Axon.input("input", shape: {nil, 36})

    # Attach hook to capture input values
    input_with_hook = Axon.attach_hook(input, &capture_activation(&1, "input"), on: :forward)

    # Hidden layer with hook
    hidden = Axon.dense(input_with_hook, 6, activation: :relu, name: "hidden")
    hidden_with_hook = Axon.attach_hook(hidden, &capture_activation(&1, "hidden"), on: :forward)

    # Output layer with hook
    output = Axon.dense(hidden_with_hook, 10, activation: :softmax, name: "output")
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
    learning_rate = Keyword.get(opts, :learning_rate, 0.001)

    {train_images, train_labels} = train_data

    # Create batched data stream
    batched_data =
      train_images
      |> Nx.to_batched(batch_size)
      |> Stream.zip(Nx.to_batched(train_labels, batch_size))

    # Create training loop
    model
    |> Loop.trainer(
      :categorical_cross_entropy,
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
      end)
    end)

    IO.puts("")
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
    params = model_state.data
    predictions = predict_fn.(params, %{"input" => test_inputs})

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
    default_opts = [epochs: 8, batch_size: 128, learning_rate: 0.001]
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
end
