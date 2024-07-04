defmodule PerceptronApparatus.Rings.SlideRule do
  @moduledoc """
  Documentation for `SlideRule`.
  """
  defstruct [:position, :outer_scale, :inner_scale]

  @type t :: %__MODULE__{
          # outer radius, width
          position: {float(), float()},
          # min, max, type
          outer_scale: {float(), float(), atom()},
          # min, max, type
          inner_scale: {float(), float(), atom()}
        }

  def rotating_ring(r, outer_scale, inner_scale) do
    outer_ticks =
      outer_scale
      |> Enum.map(fn {pos, label} ->
        """
          <g transform="rotate(#{-pos})" transform-origin="0 0">
            <text x="0" y="#{r + 20}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="auto">#{label}</text>
            <line x1="0" y1="#{r}" x2="0" y2="#{if label != "", do: r + 8, else: r + 4}" />
          </g>
        """
      end)

    inner_ticks =
      inner_scale
      |> Enum.map(fn {pos, label} ->
        """
          <g transform="rotate(#{-pos})" transform-origin="0 0">
            <text x="0" y="#{r - 20}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="hanging">#{label}</text>
            <line x1="0" y1="#{if label != "", do: r - 8, else: r - 4}" x2="0" y2="#{r}" />
          </g>
        """
      end)

    Enum.join([
      ~s|<circle cx="0" ch="0" r="#{r}" stroke="red" />|,
      outer_ticks,
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
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.SlideRule do
  def render(_ring) do
    "TODO"
  end
end
