defmodule PerceptronApparatus.MLPTest do
  use ExUnit.Case
  alias PerceptronApparatus.MLP

  @moduletag :model

  describe "Bounded Initialization Analysis" do
    @tag timeout: 300_000
    @tag :bounded_init
    test "bounded weight initialization for physical accumulator" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("BOUNDED INITIALIZATION ANALYSIS")
      IO.puts("Demonstrating grouped parameters and [-1,1] activation ranges")
      IO.puts(String.duplicate("=", 80))

      result = MLP.analyze_bounded_initialization()

      # Assertions to ensure test passes
      assert %Axon{} = result.model
      assert %Axon.ModelState{} = result.initial_params
      assert %Axon.ModelState{} = result.trained_params
      assert Map.has_key?(result.initial_activations, "input")
      assert Map.has_key?(result.initial_activations, "hidden")
      assert Map.has_key?(result.initial_activations, "output")
      assert Map.has_key?(result.trained_activations, "input")
      assert Map.has_key?(result.trained_activations, "hidden")
      assert Map.has_key?(result.trained_activations, "output")

      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("BOUNDED INITIALIZATION COMPLETE")
      IO.puts("Note: Hidden activations should be in [0,1] due to bounded weights")
      IO.puts("Output activations should be in [-1,1] due to scaled bounded weights")
      IO.puts("All parameters are grouped in consistent ranges for hardware implementation")
      IO.puts(String.duplicate("=", 80))
    end
  end

  describe "Complete MNIST MLP Analysis" do
    @tag timeout: 600_000
    test "end-to-end MNIST analysis with full dataset activation tracking" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("COMPLETE MNIST MLP ANALYSIS (36x6x10)")
      IO.puts("Training network and analyzing activations across full dataset")
      IO.puts(String.duplicate("=", 80))

      # Step 1: Load and preprocess MNIST data
      IO.puts("Loading and preprocessing MNIST data...")
      {train_data, test_data} = MLP.load_mnist_data()

      # Step 2: Create and train the model
      IO.puts("Creating 36x6x10 MLP model...")
      model = MLP.create_model()

      IO.puts("Training model on MNIST data...")
      trained_params = MLP.train_model(model, train_data, epochs: 8, batch_size: 128)

      # Step 3: Collect trained parameter statistics (will print at end)
      parameter_stats = MLP.collect_parameter_stats(trained_params)

      # Step 4: Run inference on ENTIRE test dataset for activation analysis
      IO.puts("Running inference on FULL test dataset for activation analysis...")
      IO.puts("(This may take a while - analyzing all 6,000 test samples)")

      model_with_hooks = MLP.create_model_with_hooks()
      {test_images, test_labels} = test_data
      full_test_size = Nx.axis_size(test_images, 0)

      {predictions, activations} =
        MLP.run_inference_with_tracking(
          model_with_hooks,
          trained_params,
          test_data,
          # Use entire test dataset
          full_test_size
        )

      # Step 5: Calculate final test accuracy
      predicted_classes = Nx.argmax(predictions, axis: 1)
      actual_classes = Nx.argmax(test_labels, axis: 1)
      accuracy = Nx.mean(Nx.equal(predicted_classes, actual_classes)) |> Nx.to_number()

      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("FINAL RESULTS")
      IO.puts(String.duplicate("=", 80))
      IO.puts("Test accuracy on full dataset: #{Float.round(accuracy * 100, 2)}%")
      IO.puts("Total test samples analyzed: #{full_test_size}")

      # Print concise parameter and activation summary
      IO.puts("\n=== PARAMETER RANGES ===")

      Enum.each(parameter_stats, fn {layer_name, layer_params} ->
        kernel_param = Enum.find(layer_params, fn param -> param.name == "kernel" end)

        if kernel_param do
          IO.puts(
            "#{layer_name} kernel: min=#{Float.round(kernel_param.min, 4)}, max=#{Float.round(kernel_param.max, 4)}, mean=#{Float.round(kernel_param.mean, 4)}"
          )
        end
      end)

      IO.puts("\n=== ACTIVATION RANGES ===")

      Enum.each(["input", "hidden", "output"], fn layer_name ->
        if Map.has_key?(activations, layer_name) do
          stats = activations[layer_name]
          min_activation = Enum.min(stats.min)
          max_activation = Enum.max(stats.max)

          IO.puts(
            "#{layer_name}: min=#{Float.round(min_activation, 4)}, max=#{Float.round(max_activation, 4)}"
          )
        end
      end)

      IO.puts("\n" <> String.duplicate("=", 80))

      # Assertions to ensure test passes
      assert %Axon{} = model
      assert %Axon.ModelState{} = trained_params
      assert Nx.shape(predictions) == {full_test_size, 10}
      assert Map.has_key?(activations, "input")
      assert Map.has_key?(activations, "hidden")
      assert Map.has_key?(activations, "output")
      # Should be better than random
      assert accuracy > 0.1
      assert accuracy <= 1.0
    end
  end

  describe "Weight extraction and JSON export" do
    @tag timeout: 300_000
    test "extracts weights and writes to JSON file" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("WEIGHT EXTRACTION AND JSON EXPORT")
      IO.puts(String.duplicate("=", 80))

      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()

      trained_params = MLP.train_model(model, train_data, epochs: 2, batch_size: 128)

      weights = MLP.extract_weights(trained_params)

      assert Map.has_key?(weights, "B")
      assert Map.has_key?(weights, "D")

      assert is_list(weights["B"])
      assert is_list(weights["D"])

      assert length(weights["B"]) == 36
      assert length(List.first(weights["B"])) == 6

      assert length(weights["D"]) == 6
      assert length(List.first(weights["D"])) == 10

      temp_file = "test_weights_temp.json"

      try do
        MLP.write_weights_to_json(trained_params, temp_file)

        assert File.exists?(temp_file)

        file_content = File.read!(temp_file)
        decoded = Jason.decode!(file_content)

        assert Map.has_key?(decoded, "B")
        assert Map.has_key?(decoded, "D")
        assert is_list(decoded["B"])
        assert is_list(decoded["D"])

        IO.puts("✓ Weight extraction successful")
        IO.puts("✓ JSON export successful")
        IO.puts("✓ JSON structure verified")
      after
        if File.exists?(temp_file), do: File.rm!(temp_file)
      end

      IO.puts(String.duplicate("=", 80))
    end
  end

  describe "Non-negative output weights" do
    @tag timeout: 300_000
    @tag :nonnegative_output
    test "trains model with non-negative output layer weights" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("NON-NEGATIVE OUTPUT WEIGHTS")
      IO.puts("Ensures output layer weights stay ≥0 for iterative apparatus calculations")
      IO.puts(String.duplicate("=", 80))

      result = MLP.analyze_nonnegative_output(epochs: 3)

      output_weights = result.params.data["output"]["kernel"]
      min_weight = Nx.reduce_min(output_weights) |> Nx.to_number()
      max_weight = Nx.reduce_max(output_weights) |> Nx.to_number()

      IO.puts(
        "\nOutput layer weight range: [#{Float.round(min_weight, 6)}, #{Float.round(max_weight, 6)}]"
      )

      assert min_weight >= 0, "Output weights must be non-negative, found min=#{min_weight}"

      hidden_weights = result.params.data["hidden"]["kernel"]
      hidden_min = Nx.reduce_min(hidden_weights) |> Nx.to_number()

      assert hidden_min < 0, "Hidden weights should be unconstrained (can be negative)"

      assert result.test_accuracy > 0.1, "Should achieve better than random accuracy"

      output_activations = result.activations["output"]
      min_activation = Enum.min(output_activations.min)

      assert min_activation >= 0, "Output activations should be non-negative"

      IO.puts("✓ All output weights are non-negative")
      IO.puts("✓ Hidden weights remain unconstrained")
      IO.puts("✓ Output activations are non-negative")
      IO.puts("✓ Model achieves #{Float.round(result.test_accuracy * 100, 1)}% accuracy")
      IO.puts("\n" <> String.duplicate("=", 80))
    end
  end

  describe "Fitting weights to the apparatus" do
    setup do
      key = Nx.Random.key(42)
      {inputs, key} = Nx.Random.uniform(key, shape: {200, 8})
      {b, key} = Nx.Random.uniform(key, -3.0, 3.0, shape: {8, 6})
      {d, _key} = Nx.Random.uniform(key, 0.0, 2.0, shape: {6, 4})

      %{inputs: inputs, weights: %{"B" => Nx.to_list(b), "D" => Nx.to_list(d)}}
    end

    test "keeps every slider within its range", %{inputs: inputs, weights: weights} do
      fitted = MLP.fit_weights_to_apparatus(weights, inputs)
      b = Nx.tensor(fitted["B"])
      d = Nx.tensor(fitted["D"])

      # each hidden slider's running total, input by input
      running_totals =
        inputs
        |> Nx.new_axis(2)
        |> Nx.multiply(Nx.new_axis(b, 0))
        |> Nx.cumulative_sum(axis: 1)
        |> Nx.abs()

      outputs = inputs |> Nx.dot(b) |> Nx.max(0) |> Nx.dot(d)

      assert Nx.to_number(Nx.reduce_max(running_totals)) <= 5.0 + 1.0e-3
      assert Nx.to_number(Nx.reduce_max(outputs)) <= 5.0 + 1.0e-3
      assert Nx.to_number(Nx.reduce_min(outputs)) >= 0.0
    end

    test "leaves only weights that can be set on a slider", %{inputs: inputs, weights: weights} do
      fitted = MLP.fit_weights_to_apparatus(weights, inputs)

      for magnitude <- fitted["B"] |> Kernel.++(fitted["D"]) |> List.flatten() |> Enum.map(&abs/1) do
        assert magnitude == 0.0 or (magnitude >= 0.02 and magnitude <= 5.0 + 1.0e-3)
      end
    end

    test "uses the full range of the hidden and output sliders", %{
      inputs: inputs,
      weights: weights
    } do
      fitted = MLP.fit_weights_to_apparatus(weights, inputs)

      outputs =
        inputs |> Nx.dot(Nx.tensor(fitted["B"])) |> Nx.max(0) |> Nx.dot(Nx.tensor(fitted["D"]))

      assert Nx.to_number(Nx.reduce_max(outputs)) > 4.0
    end

    test "does not change which output is largest" do
      inputs = Nx.tensor([[1.0, 0.0, 0.5], [0.0, 1.0, 0.2], [0.3, 0.3, 1.0]])

      weights = %{
        "B" => [[40.0, -20.0], [-30.0, 50.0], [10.0, 10.0]],
        "D" => [[0.5, 0.1, 0.3], [0.1, 0.6, 0.3]]
      }

      labels =
        inputs
        |> Nx.dot(Nx.tensor(weights["B"]))
        |> Nx.max(0)
        |> Nx.dot(Nx.tensor(weights["D"]))
        |> Nx.argmax(axis: 1)
        |> Nx.new_axis(-1)
        |> Nx.equal(Nx.iota({1, 3}))

      fitted = MLP.fit_weights_to_apparatus(weights, inputs)

      assert MLP.accuracy(fitted, {inputs, labels}) == 1.0
    end
  end

  describe "pad_weights/3" do
    test "fills spare inputs and outputs with zeros" do
      weights = %{"B" => [[1.0, 2.0], [3.0, 4.0]], "D" => [[5.0], [6.0]]}

      assert MLP.pad_weights(weights, 3, 2) == %{
               "B" => [[1.0, 2.0], [3.0, 4.0], [0.0, 0.0]],
               "D" => [[5.0, 0.0], [6.0, 0.0]]
             }
    end
  end

  describe "accuracy/2" do
    test "is the fraction of examples whose largest output is the labelled class" do
      weights = %{"B" => [[1.0, 0.0], [0.0, 1.0]], "D" => [[1.0, 0.0], [0.0, 1.0]]}
      inputs = Nx.tensor([[1.0, 0.0], [0.0, 1.0], [1.0, 0.2], [0.1, 1.0]])
      labels = Nx.tensor([[1, 0], [0, 1], [0, 1], [0, 1]])

      assert MLP.accuracy(weights, {inputs, labels}) == 0.75
    end

    test "ignores the padding on weights exported for a larger board" do
      weights =
        MLP.pad_weights(%{"B" => [[1.0, 0.0], [0.0, 1.0]], "D" => [[1.0, 0.0], [0.0, 1.0]]}, 4, 3)

      inputs = Nx.tensor([[1.0, 0.0], [0.0, 1.0]])
      labels = Nx.tensor([[1, 0], [0, 1]])

      assert MLP.accuracy(weights, {inputs, labels}) == 1.0
    end
  end

  describe "Exporting weights for the apparatus" do
    @tag timeout: 300_000
    test "writes fitted weights with the accuracy they achieve" do
      {train_data, test_data} = MLP.load_mnist_data()
      {train_images, _train_labels} = train_data
      model = MLP.create_model()
      trained_params = MLP.train_model(model, train_data, epochs: 2, batch_size: 128)

      temp_file = "test_fitted_weights.json"

      try do
        MLP.write_weights_to_json(trained_params, temp_file,
          fit_to: train_images,
          test_data: test_data
        )

        decoded = temp_file |> File.read!() |> Jason.decode!()

        assert length(decoded["B"]) == 36
        assert length(decoded["D"]) == 6
        assert decoded["D"] |> List.flatten() |> Enum.min() >= 0
        assert decoded["B"] |> List.flatten() |> Enum.map(&abs/1) |> Enum.max() <= 5.001

        # cross-entropy training gets well clear of the 10% a guess would score
        assert decoded["test_accuracy"] > 0.5
        assert decoded["test_accuracy"] == MLP.accuracy(decoded, test_data)
      after
        if File.exists?(temp_file), do: File.rm!(temp_file)
      end
    end
  end
end
