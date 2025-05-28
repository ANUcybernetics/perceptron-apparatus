defmodule PerceptronApparatus.ResourcesTest do
  use ExUnit.Case
  
  alias PerceptronApparatus.{Board, RuleRing, AzimuthalRing, RadialRing}
  alias Decimal, as: D

  describe "Board" do
    test "creates a new board with size" do
      {:ok, board} = 
        Ash.Changeset.for_create(Board, :new, %{size: 100.0})
        |> Ash.create()
      
      assert board.size == 100.0
      assert board.rings == []
      assert is_binary(board.id)
    end

    test "adds a ring to a board" do
      {:ok, board} = 
        Ash.Changeset.for_create(Board, :new, %{size: 100.0})
        |> Ash.create()

      ring_data = %{
        width: 50.0,
        rule: [{nil, 0.0}, {D.new(1), 180.0}],
        shape: %{sliders: 4}
      }

      current_rings = board.rings || []
      new_rings = current_rings ++ [ring_data]
      
      {:ok, updated_board} = 
        board
        |> Ash.Changeset.for_update(:add_ring, %{rings: new_rings})
        |> Ash.update()

      assert length(updated_board.rings) == 1
      assert hd(updated_board.rings) == ring_data
    end

    test "legacy new/1 function works" do
      board = Board.new(150.0)
      assert board.size == 150.0
      assert board.rings == []
    end

    test "legacy add_ring/2 function works" do
      board = Board.new(150.0)
      ring_data = %{width: 30.0, rule: [], shape: %{groups: 2, sliders_per_group: 3}}
      
      updated_board = Board.add_ring(board, ring_data)
      assert length(updated_board.rings) == 1
    end
  end

  describe "RuleRing" do
    test "creates a new rule ring" do
      rule = [{D.new(1), 0.0, D.new(1)}, {D.new(2), 90.0, D.new(2)}]
      
      {:ok, rule_ring} = 
        Ash.Changeset.for_create(RuleRing, :new, %{rule: rule})
        |> Ash.create()
      
      assert rule_ring.rule == rule
      assert rule_ring.width == 50.0  # default width
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
      assert az_ring.width == 20.0  # default width
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
      assert radial_ring.width == 80.0  # default width
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
    test "rendering works end-to-end with Ash resources" do
      # Create a board
      board = Board.new(400.0)
      
      # Create some rings
      rule_ring = RuleRing.new(RuleRing.log_rule())
      
      azimuthal_shape = %{sliders: 4}
      azimuthal_rule = [{nil, D.new(0)}, {D.new(1), D.new(90)}, {D.new(2), D.new(180)}, {nil, D.new(270)}]
      azimuthal_ring = AzimuthalRing.new(azimuthal_shape, azimuthal_rule)
      
      radial_shape = %{groups: 3, sliders_per_group: 2}
      radial_rule = [{nil, D.new(0)}, {D.new(1), D.new("0.5")}, {D.new(2), D.new(1)}]
      radial_ring = RadialRing.new(radial_shape, radial_rule)
      
      # Add rings to board
      board = Board.add_ring(board, rule_ring)
      board = Board.add_ring(board, azimuthal_ring)
      board = Board.add_ring(board, radial_ring)
      
      # Test rendering
      svg_output = Board.render(board)
      
      # Verify SVG output contains expected elements
      assert String.contains?(svg_output, "<svg")
      assert String.contains?(svg_output, "</svg>")
      assert String.contains?(svg_output, "viewBox")
      assert String.contains?(svg_output, "<circle")
      assert String.contains?(svg_output, "<path")
      
      # Verify it's a valid string (not crashing)
      assert is_binary(svg_output)
      assert String.length(svg_output) > 100
    end
  end
end