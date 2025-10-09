defmodule PerceptronApparatus.PokerTest do
  use ExUnit.Case
  alias PerceptronApparatus.Poker

  @moduletag :model

  describe "Poker hand encoding" do
    test "encode_card creates 7-dimensional vector" do
      # Test Hearts (suit=1), King (rank=13, high)
      encoded = Poker.encode_card(1, 13)

      assert length(encoded) == 7
      # Suit one-hot: Hearts = [1, 0, 0, 0]
      assert Enum.slice(encoded, 0, 4) == [1.0, 0.0, 0.0, 0.0]
      # Rank bin: 13 is high = [0, 0, 1]
      assert Enum.slice(encoded, 4, 3) == [0.0, 0.0, 1.0]
    end

    test "encode_card handles all suits" do
      # Hearts=1, Spades=2, Diamonds=3, Clubs=4
      hearts = Poker.encode_card(1, 5)
      spades = Poker.encode_card(2, 5)
      diamonds = Poker.encode_card(3, 5)
      clubs = Poker.encode_card(4, 5)

      assert Enum.slice(hearts, 0, 4) == [1.0, 0.0, 0.0, 0.0]
      assert Enum.slice(spades, 0, 4) == [0.0, 1.0, 0.0, 0.0]
      assert Enum.slice(diamonds, 0, 4) == [0.0, 0.0, 1.0, 0.0]
      assert Enum.slice(clubs, 0, 4) == [0.0, 0.0, 0.0, 1.0]
    end

    test "encode_card handles rank bins" do
      # Low: 2-5, Mid: 6-9, High: 10-14 (Ace remapped from 1 to 14)
      low_rank = Poker.encode_card(1, 3)
      mid_rank = Poker.encode_card(1, 7)
      high_rank = Poker.encode_card(1, 11)
      ace_high = Poker.encode_card(1, 1)

      assert Enum.slice(low_rank, 4, 3) == [1.0, 0.0, 0.0]
      assert Enum.slice(mid_rank, 4, 3) == [0.0, 1.0, 0.0]
      assert Enum.slice(high_rank, 4, 3) == [0.0, 0.0, 1.0]
      assert Enum.slice(ace_high, 4, 3) == [0.0, 0.0, 1.0]
    end

    test "encode_poker_hand creates 36-dimensional vector" do
      # Example hand: 5 cards with suit and rank
      features = [1, 10, 2, 5, 3, 1, 4, 13, 1, 7]
      encoded = Poker.encode_poker_hand(features)

      assert length(encoded) == 36
      # First card (suit=1, rank=10): Hearts, High
      assert Enum.slice(encoded, 0, 7) == [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]
      # Last element should be padding
      assert List.last(encoded) == 0.0
    end

    test "encode_poker_hand encodes all 5 cards" do
      features = [1, 2, 2, 6, 3, 10, 4, 1, 1, 13]
      encoded = Poker.encode_poker_hand(features)

      # Card 1: suit=1, rank=2 (low: 2-5)
      assert Enum.slice(encoded, 0, 7) == [1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0]
      # Card 2: suit=2, rank=6 (mid: 6-9)
      assert Enum.slice(encoded, 7, 7) == [0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0]
      # Card 3: suit=3, rank=10 (high: 10-14)
      assert Enum.slice(encoded, 14, 7) == [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]
      # Card 4: suit=4, rank=1 (Ace, remapped to 14, high: 10-14)
      assert Enum.slice(encoded, 21, 7) == [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0]
      # Card 5: suit=1, rank=13 (high: 10-14)
      assert Enum.slice(encoded, 28, 7) == [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]
      # Padding
      assert Enum.at(encoded, 35) == 0.0
    end
  end

  describe "Data loading and preprocessing" do
    @tag timeout: 300_000
    @tag :integration
    test "load_poker_data downloads and preprocesses dataset" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("POKER HAND DATA LOADING")
      IO.puts(String.duplicate("=", 80))

      {{train_features, train_labels}, {test_features, test_labels}} = Poker.load_poker_data()

      # Check training data shape
      assert Nx.shape(train_features) == {25010, 36}
      assert Nx.shape(train_labels) == {25010, 10}

      # Check test data shape (using subset)
      assert Nx.shape(test_features) == {10000, 36}
      assert Nx.shape(test_labels) == {10000, 10}

      # Verify features are in valid range [0, 1]
      train_min = Nx.reduce_min(train_features) |> Nx.to_number()
      train_max = Nx.reduce_max(train_features) |> Nx.to_number()

      assert train_min >= 0.0
      assert train_max <= 1.0

      # Verify labels are one-hot encoded (10 classes)
      train_label_sum = Nx.sum(train_labels, axes: [1])
      assert Nx.all(Nx.equal(train_label_sum, 1.0)) |> Nx.to_number() == 1

      IO.puts("✓ Training data: #{Nx.axis_size(train_features, 0)} samples")
      IO.puts("✓ Test data: #{Nx.axis_size(test_features, 0)} samples")
      IO.puts("✓ Feature dimensions: 36")
      IO.puts("✓ Output classes: 10")
      IO.puts("✓ Features in valid range [0, 1]")
      IO.puts("✓ Labels properly one-hot encoded")
      IO.puts(String.duplicate("=", 80))
    end
  end

  describe "Model creation" do
    test "create_model builds 36x6x10 architecture" do
      model = Poker.create_model()

      assert %Axon{} = model

      # Initialize model to check parameter shapes
      {init_fn, _predict_fn} = Axon.build(model)
      params = init_fn.(Nx.template({1, 36}, :f32), %{})

      # Check hidden layer weights (36 inputs -> 6 hidden)
      assert Nx.shape(params.data["hidden"]["kernel"]) == {36, 6}

      # Check output layer weights (6 hidden -> 10 outputs)
      assert Nx.shape(params.data["output"]["kernel"]) == {6, 10}
    end

    test "create_nonnegative_output_model uses non-negative initialisation" do
      model = Poker.create_nonnegative_output_model()

      assert %Axon{} = model

      # Initialize model
      {init_fn, _predict_fn} = Axon.build(model)
      params = init_fn.(Nx.template({1, 36}, :f32), %{})

      # Output layer weights should be initialized non-negative
      output_weights = params.data["output"]["kernel"]
      min_weight = Nx.reduce_min(output_weights) |> Nx.to_number()

      assert min_weight >= 0.0
    end
  end

  describe "Complete poker hand analysis" do
    @tag timeout: 600_000
    @tag :integration
    test "end-to-end poker hand classification" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("COMPLETE POKER HAND CLASSIFICATION (36x6x10)")
      IO.puts("Training network on UCI Poker Hand dataset")
      IO.puts(String.duplicate("=", 80))

      result = Poker.analyze_poker_mlp(epochs: 5, batch_size: 128)

      # Verify result structure
      assert %Axon{} = result.model
      assert %Axon.ModelState{} = result.params
      assert is_float(result.test_accuracy)

      # Check that we achieve better than random accuracy (10 classes = 10% random)
      assert result.test_accuracy > 0.15,
             "Expected >15% accuracy, got #{Float.round(result.test_accuracy * 100, 2)}%"

      # Verify predictions shape
      assert Nx.shape(result.predictions) == {10000, 10}

      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("POKER HAND CLASSIFICATION COMPLETE")
      IO.puts("Test accuracy: #{Float.round(result.test_accuracy * 100, 2)}%")
      IO.puts("(Random baseline: 10%)")
      IO.puts(String.duplicate("=", 80))
    end
  end

  describe "Weight extraction and export" do
    @tag timeout: 300_000
    @tag :integration
    test "extracts weights from trained poker model" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("POKER WEIGHT EXTRACTION")
      IO.puts(String.duplicate("=", 80))

      {train_data, _test_data} = Poker.load_poker_data()
      model = Poker.create_model()

      trained_params = Poker.train_model(model, train_data, epochs: 2, batch_size: 128)

      weights = Poker.extract_weights(trained_params)

      assert Map.has_key?(weights, "B")
      assert Map.has_key?(weights, "D")

      # B matrix: 36 inputs -> 6 hidden
      assert is_list(weights["B"])
      assert length(weights["B"]) == 36
      assert length(List.first(weights["B"])) == 6

      # D matrix: 6 hidden -> 10 outputs
      assert is_list(weights["D"])
      assert length(weights["D"]) == 6
      assert length(List.first(weights["D"])) == 10

      IO.puts("✓ B matrix shape: 36×6")
      IO.puts("✓ D matrix shape: 6×10")
      IO.puts(String.duplicate("=", 80))
    end

    @tag timeout: 300_000
    @tag :integration
    test "writes poker weights to JSON file" do
      {train_data, _test_data} = Poker.load_poker_data()
      model = Poker.create_model()

      trained_params = Poker.train_model(model, train_data, epochs: 1, batch_size: 128)

      temp_file = "test_poker_weights.json"

      try do
        Poker.write_weights_to_json(trained_params, temp_file)

        assert File.exists?(temp_file)

        content = File.read!(temp_file)
        decoded = Jason.decode!(content)

        assert Map.has_key?(decoded, "B")
        assert Map.has_key?(decoded, "D")
        assert is_list(decoded["B"])
        assert is_list(decoded["D"])

        IO.puts("\n✓ JSON export successful")
      after
        if File.exists?(temp_file), do: File.rm!(temp_file)
      end
    end

    @tag timeout: 300_000
    @tag :integration
    test "writes poker weights with scaling" do
      {train_data, _test_data} = Poker.load_poker_data()
      model = Poker.create_model()

      trained_params = Poker.train_model(model, train_data, epochs: 1, batch_size: 128)

      temp_file = "test_poker_scaled_weights.json"

      try do
        Poker.write_weights_to_json(trained_params, temp_file,
          scale_to_range: true,
          target_max: 5.0
        )

        assert File.exists?(temp_file)

        content = File.read!(temp_file)
        decoded = Jason.decode!(content)

        # Check that weights are scaled appropriately
        b_max =
          decoded["B"]
          |> List.flatten()
          |> Enum.map(&abs/1)
          |> Enum.max()

        d_max =
          decoded["D"]
          |> List.flatten()
          |> Enum.map(&abs/1)
          |> Enum.max()

        # Both should be at or close to 5.0
        assert_in_delta b_max, 5.0, 0.1
        assert_in_delta d_max, 5.0, 0.1

        IO.puts("\n✓ Scaled JSON export successful")
        IO.puts("✓ B max: #{Float.round(b_max, 2)}")
        IO.puts("✓ D max: #{Float.round(d_max, 2)}")
      after
        if File.exists?(temp_file), do: File.rm!(temp_file)
      end
    end
  end

  describe "Non-negative output weights for poker" do
    @tag timeout: 600_000
    @tag :integration
    test "trains poker model with non-negative output weights" do
      IO.puts("\n" <> String.duplicate("=", 80))
      IO.puts("POKER NON-NEGATIVE OUTPUT WEIGHTS")
      IO.puts("Ensures output layer weights stay ≥0 for iterative apparatus")
      IO.puts(String.duplicate("=", 80))

      {train_data, test_data} = Poker.load_poker_data()

      model = Poker.create_nonnegative_output_model()

      trained_params =
        Poker.train_model(model, train_data, epochs: 3, nonnegative_output: true)

      # Verify output weights are non-negative
      output_weights = trained_params.data["output"]["kernel"]
      min_weight = Nx.reduce_min(output_weights) |> Nx.to_number()
      max_weight = Nx.reduce_max(output_weights) |> Nx.to_number()

      IO.puts("\nOutput layer weight range: [#{Float.round(min_weight, 6)}, #{Float.round(max_weight, 6)}]")

      assert min_weight >= 0.0, "Output weights must be non-negative, found min=#{min_weight}"

      # Verify hidden weights are unconstrained
      hidden_weights = trained_params.data["hidden"]["kernel"]
      hidden_min = Nx.reduce_min(hidden_weights) |> Nx.to_number()

      assert hidden_min < 0.0, "Hidden weights should be unconstrained (can be negative)"

      # Check test accuracy
      {test_features, test_labels} = test_data
      {_init_fn, predict_fn} = Axon.build(model)
      predictions = predict_fn.(trained_params, %{"input" => test_features})

      predicted_classes = Nx.argmax(predictions, axis: 1)
      actual_classes = Nx.argmax(test_labels, axis: 1)
      accuracy = Nx.mean(Nx.equal(predicted_classes, actual_classes)) |> Nx.to_number()

      assert accuracy > 0.15, "Should achieve better than random accuracy"

      IO.puts("✓ All output weights are non-negative")
      IO.puts("✓ Hidden weights remain unconstrained")
      IO.puts("✓ Model achieves #{Float.round(accuracy * 100, 1)}% accuracy")
      IO.puts(String.duplicate("=", 80))
    end
  end

  describe "Training stability" do
    @tag timeout: 300_000
    @tag :integration
    test "poker model trains without NaN or infinity" do
      {train_data, _test_data} = Poker.load_poker_data()
      model = Poker.create_model()

      trained_params = Poker.train_model(model, train_data, epochs: 2, batch_size: 128)

      # Check that all weights are finite
      hidden_weights = trained_params.data["hidden"]["kernel"]
      output_weights = trained_params.data["output"]["kernel"]

      # Check for NaN
      refute Nx.any(Nx.is_nan(hidden_weights)) |> Nx.to_number() == 1,
             "Hidden weights contain NaN"

      refute Nx.any(Nx.is_nan(output_weights)) |> Nx.to_number() == 1,
             "Output weights contain NaN"

      # Check for infinity
      refute Nx.any(Nx.is_infinity(hidden_weights)) |> Nx.to_number() == 1,
             "Hidden weights contain Inf"

      refute Nx.any(Nx.is_infinity(output_weights)) |> Nx.to_number() == 1,
             "Output weights contain Inf"
    end
  end
end
