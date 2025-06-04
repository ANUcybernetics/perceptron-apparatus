defmodule PerceptronApparatus.MLPTest do
  use ExUnit.Case
  alias PerceptronApparatus.MLP

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
          IO.puts("#{layer_name} kernel: min=#{Float.round(kernel_param.min, 4)}, max=#{Float.round(kernel_param.max, 4)}, mean=#{Float.round(kernel_param.mean, 4)}")
        end
      end)

      IO.puts("\n=== ACTIVATION RANGES ===")
      Enum.each(["input", "hidden", "output"], fn layer_name ->
        if Map.has_key?(activations, layer_name) do
          stats = activations[layer_name]
          min_activation = Enum.min(stats.min)
          max_activation = Enum.max(stats.max)
          IO.puts("#{layer_name}: min=#{Float.round(min_activation, 4)}, max=#{Float.round(max_activation, 4)}")
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
end
