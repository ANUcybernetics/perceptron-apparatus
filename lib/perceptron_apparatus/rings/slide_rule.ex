defmodule PerceptronApparatus.Rings.SlideRule do
  @moduledoc """
  Documentation for `SlideRule`.
  """
  defstruct [:width, :outer_range, :inner_range, :context]

  @type t :: %__MODULE__{
          # atom is scale type: :linear or :log
          outer_range: {Range.t(), :atom},
          inner_range: {Range.t(), :atom},
          # ring width (fixed for slide rules)
          width: float(),
          # drawing context: {outer_radius, layer_index}
          context: {float(), integer()}
        }

  def new(outer_range, inner_range) do
    %__MODULE__{width: 20.0, outer_range: outer_range, inner_range: inner_range}
  end

  def render_slider(radius, outer_scale, inner_scale) do
    outer_ticks =
      outer_scale
      |> Enum.map(fn {pos, label} ->
        """
          <g transform="rotate(#{-pos})" transform-origin="0 0">
            <text x="0" y="#{radius + 20}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="auto">#{label}</text>
            <line x1="0" y1="#{radius}" x2="0" y2="#{if label != "", do: radius + 8, else: radius + 4}" />
          </g>
        """
      end)

    inner_ticks =
      inner_scale
      |> Enum.map(fn {pos, label} ->
        """
          <g transform="rotate(#{-pos})" transform-origin="0 0">
            <text x="0" y="#{radius - 20}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="hanging">#{label}</text>
            <line x1="0" y1="#{if label != "", do: radius - 8, else: radius - 4}" x2="0" y2="#{radius}" />
          </g>
        """
      end)

    Enum.join([
      outer_ticks,
      ~s|<circle class="top full" cx="0" ch="0" r="#{radius}" />|,
      inner_ticks
    ])
  end

  def log_scale do
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

  def relu_outer do
    -180..179//3
    |> Enum.map(fn x ->
      cond do
        Integer.mod(x, 5) == 0 -> {x, Float.to_string(x / 30.0)}
        true -> {x, ""}
      end
    end)
  end

  def relu_inner do
    -180..179//3
    |> Enum.map(fn x ->
      cond do
        x <= 0 && Integer.mod(x, 5) == 0 -> {x, "0"}
        Integer.mod(x, 5) == 0 -> {x, Float.to_string(x / 30.0)}
        true -> {x, ""}
      end
    end)
  end

  defp ticks_and_labels(val) do
    cond do
      Integer.mod(val, 5) == 0 -> %{label: Integer.to_string(val), stroke_width: "1.0"}
      true -> %{label: nil, stroke_width: "0.5"}
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
