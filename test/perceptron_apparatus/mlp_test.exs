defmodule PerceptronApparatus.MLPTest do
  use ExUnit.Case
  alias PerceptronApparatus.MLP

  describe "MLP MNIST functionality" do
    test "creates a 36x6x10 MLP model" do
      model = MLP.create_model()
      assert %Axon{} = model
    end

    test "creates model with hooks" do
      model_with_hooks = MLP.create_model_with_hooks()
      assert %Axon{} = model_with_hooks
    end

    test "loads and preprocesses MNIST data" do
      {train_data, test_data} = MLP.load_mnist_data()

      {train_images, train_labels} = train_data
      {test_images, test_labels} = test_data

      # Verify train data shapes
      # 90% of 60,000
      assert Nx.shape(train_images) == {54000, 36}
      assert Nx.shape(train_labels) == {54000, 10}

      # Verify test data shapes  
      # 10% of 60,000
      assert Nx.shape(test_images) == {6000, 36}
      assert Nx.shape(test_labels) == {6000, 10}

      # Verify data ranges
      assert Nx.reduce_min(train_images) |> Nx.to_number() >= 0.0
      assert Nx.reduce_max(train_images) |> Nx.to_number() <= 1.0

      # Verify labels are one-hot encoded
      assert Nx.sum(train_labels, axes: [1]) |> Nx.reduce_min() |> Nx.to_number() == 1.0
      assert Nx.sum(train_labels, axes: [1]) |> Nx.reduce_max() |> Nx.to_number() == 1.0
    end

    @tag timeout: 60_000
    test "trains model on MNIST data" do
      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()

      # Train for just a few epochs for testing
      trained_params = MLP.train_model(model, train_data, epochs: 2, batch_size: 128)

      # Verify we have an Axon.ModelState
      assert %Axon.ModelState{} = trained_params

      # Extract parameters and verify structure
      params = trained_params.data
      assert Map.has_key?(params, "hidden")
      assert Map.has_key?(params, "output")

      # Verify hidden layer has weights and biases
      assert Map.has_key?(params["hidden"], "kernel")
      assert Map.has_key?(params["hidden"], "bias")
      assert Nx.shape(params["hidden"]["kernel"]) == {36, 6}
      assert Nx.shape(params["hidden"]["bias"]) == {6}

      # Verify output layer has weights and biases
      assert Map.has_key?(params["output"], "kernel")
      assert Map.has_key?(params["output"], "bias")
      assert Nx.shape(params["output"]["kernel"]) == {6, 10}
      assert Nx.shape(params["output"]["bias"]) == {10}
    end

    @tag timeout: 60_000
    test "inspects parameters without crashing" do
      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()

      trained_params = MLP.train_model(model, train_data, epochs: 2, batch_size: 128)

      # This should not crash
      assert :ok = MLP.inspect_parameters(trained_params)
    end

    @tag timeout: 120_000
    test "runs inference with activation tracking" do
      {train_data, test_data} = MLP.load_mnist_data()

      # Train a model first (quick training)
      model = MLP.create_model()
      trained_params = MLP.train_model(model, train_data, epochs: 2, batch_size: 128)

      # Create model with hooks
      model_with_hooks = MLP.create_model_with_hooks()

      # Run inference with tracking on small sample
      {predictions, activations} =
        MLP.run_inference_with_tracking(
          model_with_hooks,
          trained_params,
          test_data,
          # Small sample for testing
          10
        )

      # Verify predictions shape
      assert Nx.shape(predictions) == {10, 10}

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
    @tag timeout: 180_000
    test "complete MNIST workflow analysis" do
      # Run complete analysis with reduced epochs for testing
      result = MLP.analyze_mnist_mlp(epochs: 3, batch_size: 128)

      # Verify result structure
      assert Map.has_key?(result, :model)
      assert Map.has_key?(result, :params)
      assert Map.has_key?(result, :predictions)
      assert Map.has_key?(result, :activations)
      assert Map.has_key?(result, :test_accuracy)

      # Verify model
      assert %Axon{} = result.model

      # Verify parameters
      assert %Axon.ModelState{} = result.params
      params = result.params.data
      assert Map.has_key?(params, "hidden")
      assert Map.has_key?(params, "output")

      # Verify predictions shape (default is 100 samples)
      assert Nx.shape(result.predictions) == {100, 10}

      # Verify activations were captured
      assert Map.has_key?(result.activations, "input")
      assert Map.has_key?(result.activations, "hidden")
      assert Map.has_key?(result.activations, "output")

      # Verify test accuracy is reasonable (should be > 0.1 for random)
      assert result.test_accuracy > 0.1
      assert result.test_accuracy <= 1.0
    end
  end

  describe "demonstration tests" do
    @tag :demo
    @tag timeout: 300_000
    test "demonstrates MNIST MLP analysis" do
      IO.puts("\n" <> String.duplicate("=", 60))
      IO.puts("DEMONSTRATING MNIST MLP ANALYSIS (36x6x10)")
      IO.puts(String.duplicate("=", 60))

      # Run analysis with reasonable epochs for demonstration
      MLP.analyze_mnist_mlp(epochs: 8, batch_size: 128, learning_rate: 0.001)

      IO.puts(String.duplicate("=", 60))
    end

    @tag :demo
    @tag timeout: 120_000
    test "demonstrates parameter inspection only" do
      IO.puts("\n" <> String.duplicate("=", 60))
      IO.puts("DEMONSTRATING PARAMETER INSPECTION")
      IO.puts(String.duplicate("=", 60))

      # Load data and train a model
      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()
      trained_params = MLP.train_model(model, train_data, epochs: 3, batch_size: 128)

      # Just inspect parameters
      MLP.inspect_parameters(trained_params)

      IO.puts(String.duplicate("=", 60))
    end
  end
end
