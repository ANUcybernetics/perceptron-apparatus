defmodule PerceptronApparatus.WeightScaleTest do
  use ExUnit.Case, async: true

  alias PerceptronApparatus.Utils

  describe "weight_rule/0" do
    test "runs from zero to the largest magnitude, labelled on the 1-2-5 series" do
      rule = Utils.weight_rule()

      assert {"0", zero} = List.first(rule)
      assert Decimal.equal?(zero, 0)
      assert {"5", five} = List.last(rule)
      assert Decimal.equal?(five, 5)

      labels = for {label, _val} <- rule, label, do: label
      assert labels == ["0", "0.02", "0.05", "0.1", "0.2", "0.5", "1", "2", "5"]
    end

    test "has an unlabelled tick at every other leading digit" do
      unlabelled = for {nil, val} <- Utils.weight_rule(), do: Decimal.to_float(val)

      assert 0.03 in unlabelled
      assert 0.7 in unlabelled
      assert 4.0 in unlabelled
      refute 0.01 in unlabelled
      refute 6.0 in unlabelled
    end
  end

  describe "weight_scale_fraction/1" do
    test "puts zero at one end of the slot and the largest magnitude at the other" do
      assert Utils.weight_scale_fraction(0) == 0.0
      assert_in_delta Utils.weight_scale_fraction(5), 1.0, 1.0e-9
    end

    test "ignores sign" do
      assert Utils.weight_scale_fraction(-0.3) == Utils.weight_scale_fraction(0.3)
    end

    test "parks magnitudes too small to set at zero" do
      assert Utils.weight_scale_fraction(0.019) == 0.0
      assert Utils.weight_scale_fraction(0.02) > 0.0
    end

    test "clamps magnitudes beyond the largest" do
      assert_in_delta Utils.weight_scale_fraction(50), 1.0, 1.0e-9
    end

    test "gives equal ratios equal distances" do
      low = Utils.weight_scale_fraction(0.2) - Utils.weight_scale_fraction(0.02)
      high = Utils.weight_scale_fraction(5) - Utils.weight_scale_fraction(0.5)

      assert_in_delta low, high, 1.0e-9
    end
  end

  test "a generated board engraves the weight scale on its radial rings" do
    board = PerceptronApparatus.create_board!(600.0, 4, 2, 3)
    svg = PerceptronApparatus.Board.render(board)

    for label <- ["0.02", "0.05", "0.2", "0.5"] do
      assert svg =~ ">#{label}<"
    end
  end
end
