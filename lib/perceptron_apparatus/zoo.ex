defmodule PerceptronApparatus.Zoo do
  @moduledoc """
  Animal classification on the UCI Zoo dataset, as a task for the apparatus.

  Each of the 101 animals is described by 15 yes/no traits and a leg count, and
  belongs to one of 7 classes. An animal is encoded as 21 inputs: the traits in
  the order of `traits/0`, then a one-hot of the leg count over `leg_counts/0`.
  The outputs are the classes in the order of `class_names/0`.

  The dataset (Richard Forsyth, 1990) is vendored at `priv/zoo.data` from the
  UCI Machine Learning Repository, where it is licensed CC BY 4.0.

  ## Example usage

      {train_data, test_data} = PerceptronApparatus.Zoo.load_data()
      model = PerceptronApparatus.MLP.create_model(21, 7)
      trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 400, batch_size: 16)
  """

  @traits ~w(hair feathers eggs milk airborne aquatic predator toothed backbone breathes venomous fins tail domestic catsize)
  @leg_counts [0, 2, 4, 5, 6, 8]
  @class_names ~w(mammal bird reptile fish amphibian insect invertebrate)

  # the dataset lists legs between "fins" and "tail"
  @legs_column 12

  def traits, do: @traits
  def leg_counts, do: @leg_counts
  def class_names, do: @class_names
  def n_input, do: length(@traits) + length(@leg_counts)
  def n_output, do: length(@class_names)

  @doc """
  Encodes an animal as a list of 21 inputs.

  `traits` is a list of the names of the traits the animal has.

  ## Example

      encode_animal(["hair", "milk", "toothed", "backbone", "breathes", "tail"], 4)
  """
  def encode_animal(traits, legs) when legs in @leg_counts do
    trait_inputs = for trait <- @traits, do: if(trait in traits, do: 1.0, else: 0.0)
    leg_inputs = for count <- @leg_counts, do: if(count == legs, do: 1.0, else: 0.0)

    trait_inputs ++ leg_inputs
  end

  @doc """
  Reads the dataset. Returns a list of `{name, inputs, class_index}` tuples.
  """
  def animals do
    :perceptron_apparatus
    |> Application.app_dir("priv/zoo.data")
    |> File.stream!()
    |> Stream.map(&String.trim/1)
    |> Stream.reject(&(&1 == ""))
    |> Enum.map(fn line ->
      [name | fields] = String.split(line, ",")
      {attributes, [class]} = fields |> Enum.map(&String.to_integer/1) |> Enum.split(16)
      {legs, flags} = List.pop_at(attributes, @legs_column)
      traits = for {trait, 1} <- Enum.zip(@traits, flags), do: trait

      {name, encode_animal(traits, legs), class - 1}
    end)
  end

  @doc """
  Loads the dataset as `{train_data, test_data}`, each `{inputs, one_hot_labels}`.
  Every fifth animal is held out for testing.
  """
  def load_data do
    {test, train} =
      animals()
      |> Enum.with_index()
      |> Enum.split_with(fn {_animal, index} -> rem(index, 5) == 4 end)

    {to_tensors(train), to_tensors(test)}
  end

  defp to_tensors(indexed_animals) do
    inputs =
      indexed_animals
      |> Enum.map(fn {{_name, inputs, _class}, _index} -> inputs end)
      |> Nx.tensor(type: :f32)

    classes =
      indexed_animals
      |> Enum.map(fn {{_name, _inputs, class}, _index} -> class end)
      |> Nx.tensor(type: :s64)

    labels =
      classes
      |> Nx.new_axis(-1)
      |> Nx.equal(Nx.iota({1, n_output()}))
      |> Nx.as_type(:f32)

    {inputs, labels}
  end
end
