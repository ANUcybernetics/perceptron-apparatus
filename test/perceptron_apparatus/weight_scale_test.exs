defmodule PerceptronApparatus.WeightScaleTest do
  use ExUnit.Case, async: true

  alias PerceptronApparatus.Utils

  describe "weight_rule/1 on the log scale" do
    test "runs from zero to the largest magnitude, labelled on the 1-2-5 series" do
      rule = Utils.weight_rule(:log)

      assert {"0", zero} = List.first(rule)
      assert Decimal.equal?(zero, 0)
      assert {"5", five} = List.last(rule)
      assert Decimal.equal?(five, 5)

      labels = for {label, _val} <- rule, label, do: label
      assert labels == ["0", "0.02", "0.05", "0.1", "0.2", "0.5", "1", "2", "5"]
    end

    test "has an unlabelled tick at every other leading digit" do
      unlabelled = for {nil, val} <- Utils.weight_rule(:log), do: Decimal.to_float(val)

      assert 0.03 in unlabelled
      assert 0.7 in unlabelled
      assert 4.0 in unlabelled
      refute 0.01 in unlabelled
      refute 6.0 in unlabelled
    end
  end

  describe "weight_scale_fraction/2 on the log scale" do
    test "puts zero at one end of the slot and the largest magnitude at the other" do
      assert Utils.weight_scale_fraction(0, :log) == 0.0
      assert_in_delta Utils.weight_scale_fraction(5, :log), 1.0, 1.0e-9
    end

    test "ignores sign" do
      assert Utils.weight_scale_fraction(-0.3, :log) == Utils.weight_scale_fraction(0.3, :log)
    end

    test "parks magnitudes too small to set at zero" do
      assert Utils.weight_scale_fraction(0.019, :log) == 0.0
      assert Utils.weight_scale_fraction(0.02, :log) > 0.0
    end

    test "clamps magnitudes beyond the largest" do
      assert_in_delta Utils.weight_scale_fraction(50, :log), 1.0, 1.0e-9
    end

    test "gives equal ratios equal distances" do
      low = Utils.weight_scale_fraction(0.2, :log) - Utils.weight_scale_fraction(0.02, :log)
      high = Utils.weight_scale_fraction(5, :log) - Utils.weight_scale_fraction(0.5, :log)

      assert_in_delta low, high, 1.0e-9
    end
  end

  describe "the linear scale" do
    test "runs from -5 to 5 with a tick at every whole number" do
      rule = Utils.weight_rule(:linear)

      assert Enum.map(rule, fn {_label, val} -> Decimal.to_float(val) end) ==
               Enum.map(-5..5, &(&1 * 1.0))

      assert for({label, _val} <- rule, label, do: label) == ["-5", "0", "5"]
    end

    test "is the default" do
      assert Utils.weight_rule() == Utils.weight_rule(:linear)
      assert Utils.weight_scale_fraction(2.5) == Utils.weight_scale_fraction(2.5, :linear)
    end

    test "puts -5 at the outer end of the slot, zero in the middle and 5 at the inner end" do
      assert Utils.weight_scale_fraction(-5, :linear) == 0.0
      assert Utils.weight_scale_fraction(0, :linear) == 0.5
      assert Utils.weight_scale_fraction(5, :linear) == 1.0
      assert Utils.weight_scale_fraction(-50, :linear) == 0.0
    end
  end

  describe "a generated board" do
    test "engraves the linear scale on its weight rings by default" do
      svg =
        PerceptronApparatus.create_board!(600.0, 4, 2, 3) |> PerceptronApparatus.Board.render()

      assert svg =~ ">-5<"
      refute svg =~ ">0.02<"
    end

    test "engraves the log scale when asked" do
      svg =
        PerceptronApparatus.create_board!(600.0, 4, 2, 3, nil, %{weight_scale: :log})
        |> PerceptronApparatus.Board.render()

      for label <- ["0.02", "0.05", "0.2", "0.5"] do
        assert svg =~ ">#{label}<"
      end
    end
  end
end
