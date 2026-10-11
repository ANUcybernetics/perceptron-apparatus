defmodule PerceptronApparatus.ZooTest do
  use ExUnit.Case, async: true

  alias PerceptronApparatus.{MLP, Zoo}

  describe "encode_animal/2" do
    test "puts each trait and the leg count in its own input" do
      inputs = Zoo.encode_animal(["hair", "milk", "catsize"], 4)

      assert length(inputs) == 21

      # hair is the 1st trait, milk the 4th, catsize the 15th; 4 legs is the 3rd leg count
      assert inputs ==
               [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] ++ [0, 0, 1, 0, 0, 0]
    end

    test "rejects a leg count that no animal in the dataset has" do
      assert_raise FunctionClauseError, fn -> Zoo.encode_animal([], 3) end
    end
  end

  describe "animals/0" do
    test "reads all 101 animals with their classes" do
      animals = Zoo.animals()

      assert length(animals) == 101

      classes =
        Map.new(animals, fn {name, _inputs, class} ->
          {name, Enum.at(Zoo.class_names(), class)}
        end)

      assert classes["aardvark"] == "mammal"
      assert classes["bass"] == "fish"
      assert classes["honeybee"] == "insect"
      assert classes["octopus"] == "invertebrate"
    end

    test "encodes an animal from its row in the dataset" do
      {_name, inputs, _class} = Enum.find(Zoo.animals(), fn {name, _, _} -> name == "frog" end)

      # the frog lays eggs, is aquatic, has four legs and has neither hair nor a tail
      assert inputs ==
               Zoo.encode_animal(~w(eggs aquatic predator toothed backbone breathes), 4)
    end
  end

  describe "load_data/0" do
    test "holds out every fifth animal" do
      {{train_inputs, train_labels}, {test_inputs, test_labels}} = Zoo.load_data()

      assert Nx.shape(train_inputs) == {81, 21}
      assert Nx.shape(train_labels) == {81, 7}
      assert Nx.shape(test_inputs) == {20, 21}
      assert Nx.shape(test_labels) == {20, 7}
    end
  end

  @tag timeout: 300_000
  @tag :model
  test "the apparatus's network learns to classify the animals it was trained on" do
    {train_data, _test_data} = Zoo.load_data()
    {inputs, _labels} = train_data

    trained_params =
      Zoo.n_input()
      |> MLP.create_model(Zoo.n_output())
      |> MLP.train_model(train_data, epochs: 200, batch_size: 16)

    weights = trained_params |> MLP.extract_weights() |> MLP.fit_weights_to_apparatus(inputs)

    # mammals alone are 40% of the dataset
    assert MLP.accuracy(weights, train_data) > 0.7
  end
end
