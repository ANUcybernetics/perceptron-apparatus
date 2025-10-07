defmodule PerceptronApparatus.MLPTest do
  use ExUnit.Case
  alias PerceptronApparatus.MLP

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
end
