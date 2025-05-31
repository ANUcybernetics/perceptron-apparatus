defmodule PerceptronApparatus.ResourcesTest do
  use ExUnit.Case

  alias PerceptronApparatus.{Board, RuleRing, AzimuthalRing, RadialRing}
  alias Decimal, as: D

  describe "Board" do
    test "creates a board with neural network parameters" do
      {:ok, board} = Board.create(400.0, 25, 5, 10)

      assert board.size == 400.0
      assert board.n_input == 25
      assert board.n_hidden == 5
      assert board.n_output == 10
      assert is_list(board.rings)
      # log, relu, input, w1, hidden, w2, output
      assert length(board.rings) == 7
      assert is_binary(board.id)
    end

    test "creates the correct ring sequence" do
      {:ok, board} = Board.create(400.0, 3, 2, 1)

      [ring1, ring2, ring3, ring4, ring5, ring6, ring7] = board.rings

      # Ring 1: Log ring
      assert %RuleRing{} = ring1
      assert length(ring1.rule) > 0

      # Ring 2: ReLU ring  
      assert %RuleRing{} = ring2
      assert length(ring2.rule) > 0

      # Ring 3: Input azimuthal ring (3 sliders)
      assert %AzimuthalRing{} = ring3
      assert ring3.shape == %{sliders: 3}

      # Ring 4: Weight1 radial ring (2 groups x 3 sliders per group)
      assert %RadialRing{} = ring4
      assert ring4.shape == %{groups: 2, sliders_per_group: 3}

      # Ring 5: Hidden azimuthal ring (2 sliders)
      assert %AzimuthalRing{} = ring5
      assert ring5.shape == %{sliders: 2}

      # Ring 6: Weight2 radial ring (1 group x 2 sliders per group)
      assert %RadialRing{} = ring6
      assert ring6.shape == %{groups: 1, sliders_per_group: 2}

      # Ring 7: Output azimuthal ring (1 slider)
      assert %AzimuthalRing{} = ring7
      assert ring7.shape == %{sliders: 1}
    end

    test "creates rings with appropriate rules" do
      {:ok, board} = Board.create(400.0, 2, 3, 1)

      [_log, _relu, input, w1, hidden, _w2, output] = board.rings

      # Input ring should have 0-1 range rule
      input_rule = input.rule
      assert length(input_rule) > 0
      first_input = List.first(input_rule) |> elem(1) |> D.to_float()
      last_input = List.last(input_rule) |> elem(1) |> D.to_float()
      assert first_input >= 0.0
      assert last_input <= 1.0

      # Weight rings should have -10 to 10 range
      w1_rule = w1.rule
      first_w1 = List.first(w1_rule) |> elem(1) |> D.to_float()
      last_w1 = List.last(w1_rule) |> elem(1) |> D.to_float()
      assert first_w1 >= -10.0
      assert last_w1 <= 10.0

      # Hidden ring should have 0-10 range
      hidden_rule = hidden.rule
      first_hidden = List.first(hidden_rule) |> elem(1) |> D.to_float()
      last_hidden = List.last(hidden_rule) |> elem(1) |> D.to_float()
      assert first_hidden >= 0.0
      assert last_hidden <= 10.0

      # Output ring should have 0-1 range
      output_rule = output.rule
      first_output = List.first(output_rule) |> elem(1) |> D.to_float()
      last_output = List.last(output_rule) |> elem(1) |> D.to_float()
      assert first_output >= 0.0
      assert last_output <= 1.0
    end

    test "code interface works" do
      board = Board.create!(400.0, 5, 3, 2)

      assert board.size == 400.0
      assert board.n_input == 5
      assert board.n_hidden == 3
      assert board.n_output == 2
      assert length(board.rings) == 7
    end

    test "validates board structure" do
      {:ok, board} = Board.create(400.0, 2, 2, 1)

      # Should not raise for valid board
      assert :ok = Board.validate!(board)
    end

    test "comprehensive neural network structure validation" do
      # Test a 4-3-2 neural network
      {:ok, board} = Board.create(500.0, 4, 3, 2)

      # Verify board parameters
      assert board.n_input == 4
      assert board.n_hidden == 3
      assert board.n_output == 2
      assert board.size == 500.0

      # Extract rings
      [log_ring, relu_ring, input_ring, w1_ring, hidden_ring, w2_ring, output_ring] = board.rings

      # Verify neural network topology in ring sequence

      # 1. Log and ReLU rings (computation aids)
      assert %RuleRing{} = log_ring
      assert %RuleRing{} = relu_ring

      # 2. Input layer (4 neurons)
      assert %AzimuthalRing{shape: %{sliders: 4}} = input_ring

      # 3. Input-to-Hidden weights (3 hidden neurons × 4 input neurons)
      assert %RadialRing{shape: %{groups: 3, sliders_per_group: 4}} = w1_ring

      # 4. Hidden layer (3 neurons)
      assert %AzimuthalRing{shape: %{sliders: 3}} = hidden_ring

      # 5. Hidden-to-Output weights (2 output neurons × 3 hidden neurons)
      assert %RadialRing{shape: %{groups: 2, sliders_per_group: 3}} = w2_ring

      # 6. Output layer (2 neurons)
      assert %AzimuthalRing{shape: %{sliders: 2}} = output_ring

      # Verify weight matrix dimensions match neural network topology
      # W1: (hidden_size, input_size) = (3, 4)
      assert w1_ring.shape.groups == board.n_hidden
      assert w1_ring.shape.sliders_per_group == board.n_input

      # W2: (output_size, hidden_size) = (2, 3)  
      assert w2_ring.shape.groups == board.n_output
      assert w2_ring.shape.sliders_per_group == board.n_hidden

      # Verify activation value ranges are appropriate for neural networks
      # Input layer: 0-1 (normalized inputs)
      input_min = input_ring.rule |> List.first() |> elem(1) |> D.to_float()
      input_max = input_ring.rule |> List.last() |> elem(1) |> D.to_float()
      assert input_min >= 0.0
      assert input_max <= 1.0

      # Hidden layer: 0-10 (post-activation values)
      hidden_min = hidden_ring.rule |> List.first() |> elem(1) |> D.to_float()
      hidden_max = hidden_ring.rule |> List.last() |> elem(1) |> D.to_float()
      assert hidden_min >= 0.0
      assert hidden_max <= 10.0

      # Output layer: 0-1 (final outputs, often probabilities)
      output_min = output_ring.rule |> List.first() |> elem(1) |> D.to_float()
      output_max = output_ring.rule |> List.last() |> elem(1) |> D.to_float()
      assert output_min >= 0.0
      assert output_max <= 1.0

      # Weight ranges: -10 to 10 (standard weight initialization range)
      w1_min = w1_ring.rule |> List.first() |> elem(1) |> D.to_float()
      w1_max = w1_ring.rule |> List.last() |> elem(1) |> D.to_float()
      assert w1_min >= -10.0
      assert w1_max <= 10.0

      w2_min = w2_ring.rule |> List.first() |> elem(1) |> D.to_float()
      w2_max = w2_ring.rule |> List.last() |> elem(1) |> D.to_float()
      assert w2_min >= -10.0
      assert w2_max <= 10.0

      # Verify total ring count matches expected neural network structure
      # 2 computation aids + 5 network layers
      assert length(board.rings) == 7

      # Test that the board renders successfully (integration check)
      svg_output = Board.render(board)
      assert is_binary(svg_output)
      assert String.contains?(svg_output, "viewBox") or String.contains?(svg_output, "viewbox")
      # Substantial SVG content
      assert String.length(svg_output) > 1000
    end
  end

  describe "RuleRing" do
    test "creates a new rule ring" do
      rule = [{D.new(1), 0.0, D.new(1)}, {D.new(2), 90.0, D.new(2)}]

      {:ok, rule_ring} =
        Ash.Changeset.for_create(RuleRing, :new, %{rule: rule})
        |> Ash.create()

      assert rule_ring.rule == rule
      # default width
      assert rule_ring.width == 50.0
      assert rule_ring.context == nil
      assert is_binary(rule_ring.id)
    end

    test "creates rule ring with custom width" do
      rule = [{D.new(1), 0.0, D.new(1)}]

      {:ok, rule_ring} =
        Ash.Changeset.for_create(RuleRing, :new, %{rule: rule, width: 75.0})
        |> Ash.create()

      assert rule_ring.width == 75.0
    end

    test "sets context on rule ring" do
      rule = [{D.new(1), 0.0, D.new(1)}]

      {:ok, rule_ring} =
        Ash.Changeset.for_create(RuleRing, :new, %{rule: rule})
        |> Ash.create()

      context = %{radius: 100.0, layer_index: 1}

      {:ok, updated_ring} =
        rule_ring
        |> Ash.Changeset.for_update(:set_context, %{context: context})
        |> Ash.update()

      assert updated_ring.context == context
    end

    test "legacy new/1 function works" do
      rule = [{D.new(1), 0.0, D.new(1)}]
      rule_ring = RuleRing.new(rule)

      assert rule_ring.rule == rule
      assert rule_ring.width == 50.0
    end

    test "generates log rule correctly" do
      log_rule = RuleRing.log_rule()

      assert is_list(log_rule)
      assert length(log_rule) > 0

      # Check that it contains expected structure
      first_rule = List.first(log_rule)
      assert {_outer_label, _theta, _inner_label} = first_rule
    end

    test "generates relu rule correctly" do
      relu_rule = RuleRing.relu_rule(10, 0.25)

      assert is_list(relu_rule)
      assert length(relu_rule) > 0

      # Check that it contains expected structure
      first_rule = List.first(relu_rule)
      assert {_outer_label, _theta, _inner_label} = first_rule
    end
  end

  describe "AzimuthalRing" do
    test "creates a new azimuthal ring" do
      shape = %{sliders: 6}
      rule = [{nil, 0.0}, {D.new(1), 60.0}, {D.new(2), 120.0}]

      {:ok, az_ring} =
        Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule})
        |> Ash.create()

      assert az_ring.shape == shape
      assert az_ring.rule == rule
      # default width
      assert az_ring.width == 20.0
      assert az_ring.context == nil
      assert is_binary(az_ring.id)
    end

    test "creates azimuthal ring with custom width" do
      shape = %{sliders: 4}
      rule = [{D.new(1), 0.0}]

      {:ok, az_ring} =
        Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 30.0})
        |> Ash.create()

      assert az_ring.width == 30.0
    end

    test "legacy new/2 function works" do
      shape = %{sliders: 8}
      rule = [{D.new(1), 45.0}]
      az_ring = AzimuthalRing.new(shape, rule)

      assert az_ring.shape == shape
      assert az_ring.rule == rule
      assert az_ring.width == 20.0
    end
  end

  describe "RadialRing" do
    test "creates a new radial ring" do
      shape = %{groups: 4, sliders_per_group: 3}
      rule = [{nil, 0.0}, {D.new(1), 0.5}, {D.new(2), 1.0}]

      {:ok, radial_ring} =
        Ash.Changeset.for_create(RadialRing, :new, %{shape: shape, rule: rule})
        |> Ash.create()

      assert radial_ring.shape == shape
      assert radial_ring.rule == rule
      # default width
      assert radial_ring.width == 80.0
      assert radial_ring.context == nil
      assert is_binary(radial_ring.id)
    end

    test "creates radial ring with custom width" do
      shape = %{groups: 2, sliders_per_group: 5}
      rule = [{D.new(1), 0.0}]

      {:ok, radial_ring} =
        Ash.Changeset.for_create(RadialRing, :new, %{shape: shape, rule: rule, width: 60.0})
        |> Ash.create()

      assert radial_ring.width == 60.0
    end

    test "legacy new/2 function works" do
      shape = %{groups: 3, sliders_per_group: 2}
      rule = [{D.new(1), 30.0}]
      radial_ring = RadialRing.new(shape, rule)

      assert radial_ring.shape == shape
      assert radial_ring.rule == rule
      assert radial_ring.width == 80.0
    end

    test "legacy new/3 function works with options" do
      shape = %{groups: 3, sliders_per_group: 2}
      rule = [{D.new(1), 30.0}]
      radial_ring = RadialRing.new(shape, rule, width: 120.0)

      assert radial_ring.width == 120.0
    end
  end

  describe "Integration" do
    test "rendering works end-to-end with new Board interface" do
      # Create a board with the new interface
      {:ok, board} = Board.create(400.0, 4, 3, 2)

      # Test rendering
      svg_output = Board.render(board)

      # Verify SVG output contains expected elements
      assert String.contains?(svg_output, "<svg")
      assert String.contains?(svg_output, "</svg>")
      # LazyHTML generates lowercase attributes, so check for both
      assert String.contains?(svg_output, "viewbox") or String.contains?(svg_output, "viewBox")
      assert String.contains?(svg_output, "<circle")
      assert String.contains?(svg_output, "<path")

      # Verify it's a valid string (not crashing)
      assert is_binary(svg_output)
      assert String.length(svg_output) > 100
    end

    test "rendering works with different network sizes" do
      # Test with minimal network
      {:ok, small_board} = Board.create(300.0, 2, 1, 1)
      small_svg = Board.render(small_board)
      assert is_binary(small_svg)
      assert String.contains?(small_svg, "<svg")

      # Test with larger network
      {:ok, large_board} = Board.create(600.0, 10, 8, 5)
      large_svg = Board.render(large_board)
      assert is_binary(large_svg)
      assert String.contains?(large_svg, "<svg")

      # Larger board should generate more content
      assert String.length(large_svg) > String.length(small_svg)
    end

    test "code interface works for full workflow" do
      # Create board using code interface
      board = Board.create!(500.0, 5, 4, 3)

      # Verify structure
      assert board.n_input == 5
      assert board.n_hidden == 4
      assert board.n_output == 3
      assert length(board.rings) == 7

      # Test rendering
      svg = Board.render(board)
      assert is_binary(svg)
      assert String.contains?(svg, "viewBox") or String.contains?(svg, "viewbox")
    end

    test "individual ring creation still works" do
      # Test that we can still create individual rings manually if needed
      rule_ring = RuleRing.new(RuleRing.log_rule())
      assert %RuleRing{} = rule_ring

      azimuthal_shape = %{sliders: 4}

      azimuthal_rule = [
        {nil, D.new(0)},
        {D.new(1), D.new(90)},
        {D.new(2), D.new(180)},
        {nil, D.new(270)}
      ]

      azimuthal_ring = AzimuthalRing.new(azimuthal_shape, azimuthal_rule)
      assert %AzimuthalRing{} = azimuthal_ring

      radial_shape = %{groups: 3, sliders_per_group: 2}
      radial_rule = [{nil, D.new(0)}, {D.new(1), D.new("0.5")}, {D.new(2), D.new(1)}]
      radial_ring = RadialRing.new(radial_shape, radial_rule)
      assert %RadialRing{} = radial_ring
    end

    test "new interface produces equivalent neural network structure" do
      # Test that Board.create produces the expected neural network topology
      # matching the original manual approach from the documentation
      {:ok, board} = Board.create(1200.0, 25, 5, 10)

      # Verify this matches the original 25-input, 5-hidden, 10-output network
      assert board.n_input == 25
      assert board.n_hidden == 5
      assert board.n_output == 10
      assert board.size == 1200.0

      # Extract and verify ring sequence matches neural network expectations
      [log_ring, relu_ring, input_ring, w1_ring, hidden_ring, w2_ring, output_ring] = board.rings

      # Verify ring types and dimensions match neural network structure
      assert %RuleRing{} = log_ring
      assert %RuleRing{} = relu_ring
      assert %AzimuthalRing{shape: %{sliders: 25}} = input_ring
      assert %RadialRing{shape: %{groups: 5, sliders_per_group: 25}} = w1_ring
      assert %AzimuthalRing{shape: %{sliders: 5}} = hidden_ring
      assert %RadialRing{shape: %{groups: 10, sliders_per_group: 5}} = w2_ring
      assert %AzimuthalRing{shape: %{sliders: 10}} = output_ring

      # Test rendering produces valid SVG with expected complexity
      svg_output = Board.render(board, [".full", ".etch"])
      assert is_binary(svg_output)
      assert String.contains?(svg_output, "<svg")
      # LazyHTML generates lowercase attributes, so check for both
      assert String.contains?(svg_output, "viewbox") or String.contains?(svg_output, "viewBox")
      assert String.contains?(svg_output, "<circle")
      assert String.contains?(svg_output, "<path")

      # Should produce substantial SVG content for a complex neural network
      assert String.length(svg_output) > 100_000

      # Verify it matches the complexity expected from the original example
      # (which produced a 25-input, 5-hidden, 10-output network)
      ring_count = length(board.rings)
      # 2 computation + 5 neural network layers
      assert ring_count == 7

      # Test that all rings have valid widths that fit within the board
      total_width = Enum.sum(Enum.map(board.rings, & &1.width))
      # account for radial padding
      usable_radius = board.size / 2 - 30
      assert total_width <= usable_radius
    end
  end
end
