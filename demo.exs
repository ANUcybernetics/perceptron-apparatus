#!/usr/bin/env elixir

# Demo script for MNIST MLP Analysis
# Run with: elixir demo.exs

Mix.install([
  {:axon, "~> 0.7"},
  {:nx, "~> 0.9"},
  {:polaris, "~> 0.1"},
  {:scidata, "~> 0.1"}
])

defmodule Demo.MLP do
  @moduledoc """
  Simplified MLP for MNIST demo
  """

  alias Axon.Loop

  def create_model do
    Axon.input("input", shape: {nil, 36})
    |> Axon.dense(6, activation: :relu, name: "hidden")
    |> Axon.dense(10, activation: :softmax, name: "output")
  end

  def load_mnist_data do
    IO.puts("Loading MNIST data...")
    {{train_images_binary, train_images_type, train_images_shape}, 
     {train_labels_binary, train_labels_type, train_labels_shape}} = Scidata.MNIST.download()
    
    # Convert to tensors
    train_images = train_images_binary 
    |> Nx.from_binary(train_images_type) 
    |> Nx.reshape(train_images_shape) 
    |> Nx.as_type(:f32)
    
    train_labels = train_labels_binary 
    |> Nx.from_binary(train_labels_type) 
    |> Nx.reshape(train_labels_shape) 
    |> Nx.as_type(:s64)
    
    # Resize images from 28x28 to 6x6, then flatten to 36
    indices = Nx.tensor([0, 5, 9, 14, 18, 23])
    
    train_images = train_images
    |> Nx.squeeze(axes: [1])  # Remove singleton dimension
    |> Nx.take(indices, axis: 1)  # Downsample rows
    |> Nx.take(indices, axis: 2)  # Downsample columns
    |> Nx.reshape({:auto, 36})   # Flatten to 36 features
    |> Nx.divide(255.0)          # Normalize to [0, 1]
    
    # Convert labels to one-hot encoding
    train_labels_one_hot = Nx.equal(
      Nx.new_axis(train_labels, -1),
      Nx.tensor(Enum.to_list(0..9))
    ) |> Nx.as_type(:f32)
    
    # 90/10 split
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
    
    IO.puts("Data loaded: #{train_size} training samples, #{total_samples - train_size} test samples")
    {train_data, test_data}
  end

  def train_model(model, train_data, epochs \\ 5) do
    IO.puts("Training model for #{epochs} epochs...")
    
    {train_images, train_labels} = train_data
    batch_size = 256
    
    # Create batched data stream
    batched_data = train_images
    |> Nx.to_batched(batch_size)
    |> Stream.zip(Nx.to_batched(train_labels, batch_size))
    
    # Train
    model
    |> Loop.trainer(:categorical_cross_entropy, Polaris.Optimizers.adam(learning_rate: 0.001))
    |> Loop.metric(:accuracy)
    |> Loop.run(batched_data, %{}, epochs: epochs)
  end

  def inspect_parameters(model_state) do
    IO.puts("\n=== TRAINED PARAMETER RANGES ===")
    
    params = model_state.data
    
    Enum.each(params, fn {layer_name, layer_params} ->
      IO.puts("\nLayer: #{layer_name}")
      
      Enum.each(layer_params, fn {param_name, param_tensor} ->
        min_val = Nx.reduce_min(param_tensor) |> Nx.to_number()
        max_val = Nx.reduce_max(param_tensor) |> Nx.to_number()
        mean_val = Nx.mean(param_tensor) |> Nx.to_number()
        
        IO.puts("  #{param_name}: min=#{Float.round(min_val, 4)}, max=#{Float.round(max_val, 4)}, mean=#{Float.round(mean_val, 4)}")
      end)
    end)
    
    IO.puts("")
  end

  def test_model(model, model_state, test_data, num_samples \\ 100) do
    IO.puts("Testing model on #{num_samples} samples...")
    
    {test_images, test_labels} = test_data
    test_inputs = Nx.slice_along_axis(test_images, 0, num_samples, axis: 0)
    test_targets = Nx.slice_along_axis(test_labels, 0, num_samples, axis: 0)
    
    # Run inference
    {_init_fn, predict_fn} = Axon.build(model)
    predictions = predict_fn.(model_state.data, %{"input" => test_inputs})
    
    # Calculate accuracy
    predicted_classes = Nx.argmax(predictions, axis: 1)
    actual_classes = Nx.argmax(test_targets, axis: 1)
    accuracy = Nx.mean(Nx.equal(predicted_classes, actual_classes)) |> Nx.to_number()
    
    IO.puts("Test accuracy: #{Float.round(accuracy * 100, 2)}%")
    
    # Show activation ranges
    IO.puts("\n=== INFERENCE ACTIVATION RANGES ===")
    
    # Get intermediate activations by building model step by step
    input_layer = Axon.input("input", shape: {nil, 36})
    hidden_layer = Axon.dense(input_layer, 6, activation: :relu, name: "hidden")
    
    # Build intermediate model to get hidden activations
    {_init_fn, hidden_predict_fn} = Axon.build(hidden_layer)
    hidden_activations = hidden_predict_fn.(model_state.data, %{"input" => test_inputs})
    
    # Input stats
    input_min = Nx.reduce_min(test_inputs) |> Nx.to_number()
    input_max = Nx.reduce_max(test_inputs) |> Nx.to_number()
    input_mean = Nx.mean(test_inputs) |> Nx.to_number()
    IO.puts("input: min=#{Float.round(input_min, 4)}, max=#{Float.round(input_max, 4)}, avg_mean=#{Float.round(input_mean, 4)}")
    
    # Hidden layer stats
    hidden_min = Nx.reduce_min(hidden_activations) |> Nx.to_number()
    hidden_max = Nx.reduce_max(hidden_activations) |> Nx.to_number()
    hidden_mean = Nx.mean(hidden_activations) |> Nx.to_number()
    IO.puts("hidden: min=#{Float.round(hidden_min, 4)}, max=#{Float.round(hidden_max, 4)}, avg_mean=#{Float.round(hidden_mean, 4)}")
    
    # Output stats
    output_min = Nx.reduce_min(predictions) |> Nx.to_number()
    output_max = Nx.reduce_max(predictions) |> Nx.to_number()
    output_mean = Nx.mean(predictions) |> Nx.to_number()
    IO.puts("output: min=#{Float.round(output_min, 4)}, max=#{Float.round(output_max, 4)}, avg_mean=#{Float.round(output_mean, 4)}")
    
    IO.puts("")
    accuracy
  end

  def run_demo do
    IO.puts("=" |> String.duplicate(60))
    IO.puts("MNIST MLP ANALYSIS DEMO (36x6x10 network)")
    IO.puts("=" |> String.duplicate(60))
    
    # Load data
    {train_data, test_data} = load_mnist_data()
    
    # Create model
    IO.puts("Creating 36x6x10 MLP model...")
    model = create_model()
    
    # Train model
    trained_params = train_model(model, train_data, 8)  # Quick training
    
    # Inspect parameters
    inspect_parameters(trained_params)
    
    # Test model and show activations
    test_model(model, trained_params, test_data)
    
    IO.puts("=" |> String.duplicate(60))
    IO.puts("Demo completed!")
    IO.puts("=" |> String.duplicate(60))
  end
end

# Run the demo
Demo.MLP.run_demo()