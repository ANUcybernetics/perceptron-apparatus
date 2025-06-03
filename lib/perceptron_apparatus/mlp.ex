defmodule PerceptronApparatus.MLP do
  @moduledoc """
  Multi-Layer Perceptron utilities using Axon for creating, training, and analyzing
  neural networks with activation value tracking.
  """

  alias Axon.Loop

  @doc """
  Creates a simple MLP model with one hidden layer and ReLU activation.
  
  ## Parameters
  - input_size: Number of input features
  - hidden_size: Number of neurons in the hidden layer
  - output_size: Number of output neurons
  
  ## Returns
  An Axon model
  """
  def create_model(input_size, hidden_size, output_size) do
    Axon.input("input", shape: {nil, input_size})
    |> Axon.dense(hidden_size, activation: :relu, name: "hidden")
    |> Axon.dense(output_size, activation: :linear, name: "output")
  end

  @doc """
  Creates a model with hooks attached for activation tracking during inference.
  """
  def create_model_with_hooks(input_size, hidden_size, output_size) do
    input = Axon.input("input", shape: {nil, input_size})
    
    # Attach hook to capture input values
    input_with_hook = Axon.attach_hook(input, &capture_activation(&1, "input"), on: :forward)
    
    # Hidden layer with hook
    hidden = Axon.dense(input_with_hook, hidden_size, activation: :relu, name: "hidden")
    hidden_with_hook = Axon.attach_hook(hidden, &capture_activation(&1, "hidden"), on: :forward)
    
    # Output layer with hook
    output = Axon.dense(hidden_with_hook, output_size, activation: :linear, name: "output")
    Axon.attach_hook(output, &capture_activation(&1, "output"), on: :forward)
  end

  @doc """
  Trains a model on random data for the specified number of epochs.
  
  ## Parameters
  - model: Axon model to train
  - input_size: Size of input features
  - output_size: Size of output
  - opts: Training options (epochs, batch_size, learning_rate)
  
  ## Returns
  Trained model parameters
  """
  def train_model(model, input_size, output_size, opts \\ []) do
    epochs = Keyword.get(opts, :epochs, 100)
    batch_size = Keyword.get(opts, :batch_size, 32)
    learning_rate = Keyword.get(opts, :learning_rate, 0.01)
    
    # Generate random training data
    train_data = generate_random_data(input_size, output_size, batch_size * 10, batch_size)
    
    # Create training loop
    model
    |> Loop.trainer(:mean_squared_error, Polaris.Optimizers.sgd(learning_rate: learning_rate))
    |> Loop.run(train_data, %{}, epochs: epochs)
  end

  @doc """
  Generates random training data as a stream of batches.
  """
  def generate_random_data(input_size, output_size, total_samples, batch_size) do
    num_batches = div(total_samples, batch_size)
    
    Stream.repeatedly(fn ->
      inputs = Nx.tensor(for _ <- 1..batch_size, do: for(_ <- 1..input_size, do: :rand.normal())) |> Nx.as_type(:f32)
      # Random targets - in practice you'd have real targets
      targets = Nx.tensor(for _ <- 1..batch_size, do: for(_ <- 1..output_size, do: :rand.normal())) |> Nx.as_type(:f32)
      {inputs, targets}
    end)
    |> Stream.take(num_batches)
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
        
        IO.puts("  #{param_name}: min=#{Float.round(min_val, 4)}, max=#{Float.round(max_val, 4)}, mean=#{Float.round(mean_val, 4)}")
      end)
    end)
    
    IO.puts("")
  end

  @doc """
  Runs inference on random inputs while tracking activation values.
  Returns both the predictions and the captured activations.
  """
  def run_inference_with_tracking(model, model_state, input_size, num_samples \\ 10) do
    # Start the activation capture process
    start_activation_capture()
    
    # Generate random test inputs
    test_inputs = Nx.tensor(for _ <- 1..num_samples, do: for(_ <- 1..input_size, do: :rand.normal())) |> Nx.as_type(:f32)
    
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
      
      IO.puts("#{layer_name}: min=#{Float.round(overall_min, 4)}, max=#{Float.round(overall_max, 4)}, avg_mean=#{Float.round(avg_mean, 4)}")
    end)
    
    IO.puts("")
  end

  @doc """
  Complete workflow: creates model, trains it, and analyzes both parameters and activations.
  """
  def analyze_mlp(input_size, hidden_size, output_size, opts \\ []) do
    IO.puts("Creating MLP model (#{input_size} -> #{hidden_size} -> #{output_size})")
    
    # Create and train regular model
    model = create_model(input_size, hidden_size, output_size)
    
    IO.puts("Training model...")
    trained_params = train_model(model, input_size, output_size, opts)
    
    # Inspect trained parameters
    inspect_parameters(trained_params)
    
    # Create model with hooks for activation tracking
    model_with_hooks = create_model_with_hooks(input_size, hidden_size, output_size)
    
    IO.puts("Running inference with activation tracking...")
    {predictions, activations} = run_inference_with_tracking(model_with_hooks, trained_params, input_size)
    
    %{
      model: model,
      params: trained_params,
      predictions: predictions,
      activations: activations
    }
  end
end