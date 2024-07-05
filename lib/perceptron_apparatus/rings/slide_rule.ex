defmodule PerceptronApparatus.Rings.SlideRule do
  @moduledoc """
  Documentation for `SlideRule`.
  """
  defstruct [:width, :rule, :context]

  @type t :: %__MODULE__{
          # rule consists of {outer_rule, inner_rule}
          # each rule is a list of {value, theta} tuples
          rule: {[{float(), float() | nil}], [{float(), float() | nil}]},
          # ring width (fixed for slide rules)
          width: float(),
          # drawing context: {outer_radius, layer_index}
          context: {float(), integer()}
        }

  def new(rule) do
    %__MODULE__{width: 20.0, rule: rule}
  end

  # each rule should be a list of tuples {theta, label}, where label can be nil (for a minor tick with no label)
  def render_slider(radius, {outer_rule, inner_rule}) do
    outer_ticks =
      outer_rule
      |> Enum.map(fn {theta, val} ->
        %{label: label, tick_length: tick_length, stroke_width: stroke_width} =
          ticks_and_labels(val)

        """
          <g transform="rotate(#{-theta})" transform-origin="0 0">
            <text class="top etch" x="0" y="#{radius + 2 * tick_length}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="auto">#{label}</text>
            <line class="top etch" x1="0" y1="#{radius}" x2="0" y2="#{radius + tick_length}" stroke_width="#{stroke_width}" />
          </g>
        """
      end)

    inner_ticks =
      inner_rule
      |> Enum.map(fn {theta, label} ->
        """
          <g transform="rotate(#{-theta})" transform-origin="0 0">
            <text x="0" y="#{radius - 20}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="hanging">#{label}</text>
            <line x1="0" y1="#{if label != "", do: radius - 8, else: radius - 4}" x2="0" y2="#{radius}" />
          </g>
        """
      end)

    Enum.join([
      outer_ticks,
      ~s|<circle class="top full" cx="0" cy="0" r="#{radius}" />|,
      inner_ticks
    ])
  end

  def log_rule do
    10..99
    |> Enum.map(fn x ->
      pos = (Math.log(x / 10.0) - Math.log(1.0)) / (Math.log(10.0) - Math.log(1.0)) * 360.0

      cond do
        x <= 20 -> {pos, Float.to_string(x / 10.0)}
        Integer.mod(x, 2) == 0 && x <= 50 -> {pos, Float.to_string(x / 10.0)}
        Integer.mod(x, 5) == 0 && x > 50 -> {pos, Float.to_string(x / 10.0)}
        true -> {pos, ""}
      end
    end)
  end

  def relu_rule(max_value, delta_value) do
    delta_theta = 180.0 * delta_value / max_value

    outer_positive =
      {0.0, 0.0}
      |> Stream.iterate(fn {val, theta} -> {val + delta_value, theta + delta_theta} end)
      |> Enum.take_while(fn {val, _theta} -> val <= max_value end)

    outer_negative =
      outer_positive
      # remove first + last elements because that would overlap with the positive rule
      |> List.delete_at(0)
      |> List.delete_at(-1)
      |> Enum.map(fn {val, theta} -> {-val, -theta} end)

    outer_rule = Enum.reverse(outer_negative) ++ outer_positive

    inner_rule =
      outer_rule
      |> Enum.map(fn
        {val, theta} when val < 0 -> {0.0, theta}
        {val, theta} -> {val, theta}
      end)

    # reversal not strictly necessary, but nice to keep it ordered
    {outer_rule, inner_rule}
  end

  defp ticks_and_labels(val) do
    cond do
      Integer.mod(val, 5) == 0 ->
        %{label: Integer.to_string(val), tick_length: 10, stroke_width: "1.0"}

      true ->
        %{label: nil, tick_length: 10, stroke_width: "0.5"}
    end
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.SlideRule do
  alias PerceptronApparatus.Rings.SlideRule

  def render(%SlideRule{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{outer_range: outer_range, inner_range: inner_range, context: {radius, _layer_index}} = ring

    SlideRule.render(radius, outer_range, inner_range)
  end
end
