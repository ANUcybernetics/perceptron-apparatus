defmodule PerceptronApparatus.Board.Changes.CreateRingSequence do
  @moduledoc """
  Creates the ring sequence for a perceptron apparatus board based on the
  neural network dimensions (input, hidden, output).
  """
  use Ash.Resource.Change

  alias PerceptronApparatus.{AzimuthalRing, RadialRing, RuleRing, Utils}

  @impl true
  def change(changeset, _opts, _context) do
    n_input = Ash.Changeset.get_attribute(changeset, :n_input)
    n_hidden = Ash.Changeset.get_attribute(changeset, :n_hidden)
    n_output = Ash.Changeset.get_attribute(changeset, :n_output)

    rings = create_ring_sequence(n_input, n_hidden, n_output)

    Ash.Changeset.change_attribute(changeset, :rings, rings)
  end

  defp create_ring_sequence(n_input, n_hidden, n_output) do
    [
      # Log ring
      create_log_ring!(),

      # Input azimuthal ring
      create_input_ring!(n_input),

      # Weight1 radial ring (input -> hidden)
      create_weight_ring!(n_hidden, n_input),

      # Hidden azimuthal ring
      create_hidden_ring!(n_hidden),

      # Weight2 radial ring (hidden -> output)
      create_weight_ring!(n_output, n_hidden),

      # Output azimuthal ring
      create_output_ring!(n_output)
    ]
  end

  defp create_log_ring! do
    RuleRing
    |> Ash.Changeset.for_create(:new, %{rule: RuleRing.log_rule(), width: 30.0})
    |> Ash.create!()
  end

  defp create_input_ring!(n_input) do
    rule = Utils.new_rule(0, 1, 0.1, 0.5)
    shape = %{sliders: n_input}

    AzimuthalRing
    |> Ash.Changeset.for_create(:new, %{shape: shape, rule: rule, width: 10.0})
    |> Ash.create!()
  end

  defp create_weight_ring!(n_groups, n_sliders_per_group) do
    rule = Utils.new_rule(-5, 5, 1, 5)
    shape = %{groups: n_groups, sliders_per_group: n_sliders_per_group}

    RadialRing
    |> Ash.Changeset.for_create(:new, %{shape: shape, rule: rule, width: 25.0})
    |> Ash.create!()
  end

  defp create_hidden_ring!(n_hidden) do
    rule = Utils.new_rule(-5, 5, 1, 5)
    shape = %{sliders: n_hidden}

    AzimuthalRing
    |> Ash.Changeset.for_create(:new, %{shape: shape, rule: rule, width: 10.0})
    |> Ash.create!()
  end

  defp create_output_ring!(n_output) do
    rule = Utils.new_rule(0, 5, 1, 5)
    shape = %{sliders: n_output}

    AzimuthalRing
    |> Ash.Changeset.for_create(:new, %{shape: shape, rule: rule, width: 10.0})
    |> Ash.create!()
  end
end