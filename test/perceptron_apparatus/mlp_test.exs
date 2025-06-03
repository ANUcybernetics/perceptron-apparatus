defmodule PerceptronApparatus.MLPTest do
  use ExUnit.Case
  alias PerceptronApparatus.MLP

  describe "MLP functionality" do
    test "creates and trains a simple MLP model" do
      input_size = 4
      hidden_size = 8
      output_size = 2

      # Create model
      model = MLP.create_model(input_size, hidden_size, output_size)
      assert %Axon{} = model

      # Train model (small number of epochs for testing)
      trained_params = MLP.train_model(model, input_size, output_size, epochs: 10, batch_size: 16)
      
      # Verify we have an Axon.ModelState
      assert %Axon.ModelState{} = trained_params
      
      # Extract parameters and verify structure
      params = trained_params.data
      assert Map.has_key?(params, "hidden")
      assert Map.has_key?(params, "output")
      
      # Verify hidden layer has weights and biases
      assert Map.has_key?(params["hidden"], "kernel")
      assert Map.has_key?(params["hidden"], "bias")
      
      # Verify output layer has weights and biases
      assert Map.has_key?(params["output"], "kernel")
      assert Map.has_key?(params["output"], "bias")
    end

    test "generates random training data correctly" do
      input_size = 3
      output_size = 2
      batch_size = 8
      total_samples = 24

      data_stream = MLP.generate_random_data(input_size, output_size, total_samples, batch_size)
      batches = Enum.take(data_stream, 3)

      assert length(batches) == 3
      
      Enum.each(batches, fn {inputs, targets} ->
        assert Nx.shape(inputs) == {batch_size, input_size}
        assert Nx.shape(targets) == {batch_size, output_size}
      end)
    end

    test "inspects parameters without crashing" do
      input_size = 3
      hidden_size = 5
      output_size = 2

      model = MLP.create_model(input_size, hidden_size, output_size)
      trained_params = MLP.train_model(model, input_size, output_size, epochs: 5)
      
      # This should not crash
      assert :ok = MLP.inspect_parameters(trained_params)
    end

    test "runs inference with activation tracking" do
      input_size = 3
      hidden_size = 4
      output_size = 2
      num_samples = 5

      # Train a model first
      model = MLP.create_model(input_size, hidden_size, output_size)
      trained_params = MLP.train_model(model, input_size, output_size, epochs: 5)
      
      # Create model with hooks
      model_with_hooks = MLP.create_model_with_hooks(input_size, hidden_size, output_size)
      
      # Run inference with tracking
      {predictions, activations} = MLP.run_inference_with_tracking(
        model_with_hooks, 
        trained_params, 
        input_size, 
        num_samples
      )
      
      # Verify predictions shape
      assert Nx.shape(predictions) == {num_samples, output_size}
      
      # Verify we captured activations for each layer
      assert Map.has_key?(activations, "input")
      assert Map.has_key?(activations, "hidden") 
      assert Map.has_key?(activations, "output")
      
      # Verify each layer has min, max, mean stats
      Enum.each(activations, fn {_layer_name, stats} ->
        assert Map.has_key?(stats, :min)
        assert Map.has_key?(stats, :max)
        assert Map.has_key?(stats, :mean)
        assert is_list(stats.min) and length(stats.min) > 0
        assert is_list(stats.max) and length(stats.max) > 0
        assert is_list(stats.mean) and length(stats.mean) > 0
      end)
    end

    @tag :integration
    test "complete workflow analysis" do
      input_size = 6
      hidden_size = 10
      output_size = 3

      # Run complete analysis
      result = MLP.analyze_mlp(input_size, hidden_size, output_size, epochs: 20, batch_size: 32)
      
      # Verify result structure
      assert Map.has_key?(result, :model)
      assert Map.has_key?(result, :params)
      assert Map.has_key?(result, :predictions)
      assert Map.has_key?(result, :activations)
      
      # Verify model
      assert %Axon{} = result.model
      
      # Verify parameters
      assert %Axon.ModelState{} = result.params
      params = result.params.data
      assert Map.has_key?(params, "hidden")
      assert Map.has_key?(params, "output")
      
      # Verify predictions shape (default is 10 samples)
      assert Nx.shape(result.predictions) == {10, output_size}
      
      # Verify activations were captured
      assert Map.has_key?(result.activations, "input")
      assert Map.has_key?(result.activations, "hidden")
      assert Map.has_key?(result.activations, "output")
    end
  end

  describe "demonstration tests" do
    @tag :demo
    test "demonstrates small network analysis" do
      IO.puts("\n" <> String.duplicate("=", 60))
      IO.puts("DEMONSTRATING MLP ANALYSIS")
      IO.puts(String.duplicate("=", 60))
      
      # Small network for clear output
      MLP.analyze_mlp(3, 5, 2, epochs: 50, batch_size: 16, learning_rate: 0.02)
      
      IO.puts(String.duplicate("=", 60))
    end

    @tag :demo
    test "demonstrates larger network analysis" do
      IO.puts("\n" <> String.duplicate("=", 60))
      IO.puts("DEMONSTRATING LARGER MLP ANALYSIS")
      IO.puts(String.duplicate("=", 60))
      
      # Larger network
      MLP.analyze_mlp(10, 20, 5, epochs: 100, batch_size: 32, learning_rate: 0.01)
      
      IO.puts(String.duplicate("=", 60))
    end

    @tag :demo
    test "demonstrates parameter inspection only" do
      IO.puts("\n" <> String.duplicate("=", 60))
      IO.puts("DEMONSTRATING PARAMETER INSPECTION")
      IO.puts(String.duplicate("=", 60))
      
      # Train a model
      model = MLP.create_model(4, 8, 3)
      trained_params = MLP.train_model(model, 4, 3, epochs: 30)
      
      # Just inspect parameters
      MLP.inspect_parameters(trained_params)
      
      IO.puts(String.duplicate("=", 60))
    end
  end
end