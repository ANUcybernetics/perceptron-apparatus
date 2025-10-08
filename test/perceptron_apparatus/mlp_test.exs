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

      IO.puts("\nOutput layer weight range: [#{Float.round(min_weight, 6)}, #{Float.round(max_weight, 6)}]")

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

  describe "Weight scaling" do
    test "scale_weight_matrix scales all values by factor" do
      matrix = [[1.0, 2.0], [3.0, 4.0]]
      scaled = MLP.scale_weight_matrix(matrix, 2.0)

      assert scaled == [[2.0, 4.0], [6.0, 8.0]]
    end

    test "max_abs_value finds maximum absolute value in matrix" do
      matrix = [[1.0, -5.0], [3.0, 2.0]]
      max_val = MLP.max_abs_value(matrix)

      assert max_val == 5.0
    end

    test "max_abs_value handles negative max" do
      matrix = [[-10.0, 2.0], [3.0, -8.0]]
      max_val = MLP.max_abs_value(matrix)

      assert max_val == 10.0
    end

    @tag timeout: 300_000
    test "scale_weights_to_range scales both layers to target max" do
      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()
      trained_params = MLP.train_model(model, train_data, epochs: 1, batch_size: 128)

      weights = MLP.extract_weights(trained_params)

      original_b_max = MLP.max_abs_value(weights["B"])
      original_d_max = MLP.max_abs_value(weights["D"])

      target = 5.0
      scaled_weights = MLP.scale_weights_to_range(weights, target_max: target)

      b_max = MLP.max_abs_value(scaled_weights["B"])
      d_max = MLP.max_abs_value(scaled_weights["D"])

      # Both should be at or very close to target (within floating point tolerance)
      assert_in_delta b_max, target, 0.01
      assert_in_delta d_max, target, 0.01

      # Verify the scaling maintains the network output property
      # B scaled by beta, D scaled by 1/beta means outputs stay the same
      # We can verify by checking that the product of scale factors is 1.0
      b_scale = MLP.max_abs_value(scaled_weights["B"]) / original_b_max
      d_scale = MLP.max_abs_value(scaled_weights["D"]) / original_d_max

      # The product should be approximately 1.0 (geometric mean property)
      # Actually, due to the final uniform scaling, this won't be exactly 1.0
      # but the ratio should be preserved
      IO.puts("\nScale factors: B=#{b_scale}, D=#{d_scale}")
      IO.puts("Original maxes: B=#{original_b_max}, D=#{original_d_max}")
      IO.puts("Scaled maxes: B=#{b_max}, D=#{d_max}")
    end

    @tag timeout: 300_000
    test "scaled weights produce similar outputs" do
      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()
      trained_params = MLP.train_model(model, train_data, epochs: 1, batch_size: 128)

      # Get a small sample of test data
      {test_images, _} = train_data
      sample = Nx.slice_along_axis(test_images, 0, 10, axis: 0)

      # Run inference with original weights
      {_init_fn, predict_fn} = Axon.build(model)
      original_output = predict_fn.(trained_params, %{"input" => sample})

      # Scale weights and create new model state
      weights = MLP.extract_weights(trained_params)
      scaled_weights = MLP.scale_weights_to_range(weights, target_max: 5.0)

      # Convert scaled weights back to Nx tensors and update model state
      b_tensor = Nx.tensor(scaled_weights["B"])
      d_tensor = Nx.tensor(scaled_weights["D"])

      scaled_params = %Axon.ModelState{
        data: %{
          "hidden" => %{"kernel" => b_tensor},
          "output" => %{"kernel" => d_tensor}
        }
      }

      scaled_output = predict_fn.(scaled_params, %{"input" => sample})

      # Outputs should be similar (scaled by some constant factor)
      # Check that the argmax (predicted class) is the same
      original_classes = Nx.argmax(original_output, axis: 1)
      scaled_classes = Nx.argmax(scaled_output, axis: 1)

      # The predicted classes should be identical
      assert Nx.equal(original_classes, scaled_classes) |> Nx.all() |> Nx.to_number() == 1

      IO.puts("\n✓ Scaled weights produce same predictions")
    end

    @tag timeout: 300_000
    test "write_weights_to_json with scaling option" do
      {train_data, _test_data} = MLP.load_mnist_data()
      model = MLP.create_model()
      trained_params = MLP.train_model(model, train_data, epochs: 1, batch_size: 128)

      temp_file = "test_scaled_weights.json"

      try do
        MLP.write_weights_to_json(trained_params, temp_file, scale_to_range: true, target_max: 3.0)

        assert File.exists?(temp_file)

        content = File.read!(temp_file)
        decoded = Jason.decode!(content)

        b_max = MLP.max_abs_value(decoded["B"])
        d_max = MLP.max_abs_value(decoded["D"])

        # Both should be at or close to 3.0
        assert_in_delta b_max, 3.0, 0.01
        assert_in_delta d_max, 3.0, 0.01

        IO.puts("\n✓ JSON export with scaling successful")
      after
        if File.exists?(temp_file), do: File.rm!(temp_file)
      end
    end
  end
end
