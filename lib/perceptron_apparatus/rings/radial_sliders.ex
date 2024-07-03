defmodule PerceptronApparatus.Rings.RadialSliders do
  @moduledoc """
  Documentation for `RadialSliders`.
  """
  defstruct [:radial_size, :range, :shape, :layer_index]

  @type t :: %__MODULE__{
          # min, max
          range: Range.t(),
          # {groups, sliders_per_group}
          shape: {integer(), integer()},
          # radial size (often the default will be fine)
          radial_size: float(),
          # layer index, counted from outside-to-inside
          layer_index: integer()
        }

  def new(opts \\ []) do
    # shape is required
    shape = Keyword.fetch!(opts, :shape)
    # use default values when it makes sense
    range = Keyword.get(opts, :range, 0..10)
    size = Keyword.get(opts, :radial_size, 100.0)
    # layer index can be added later, nil ok at first
    layer_index = Keyword.get(opts, :layer_index)

    %__MODULE__{radial_size: size, range: range, shape: shape, layer_index: layer_index}
  end

  def radial_slider(r_outer, length, theta) do
    r_inner = r_outer - length

    labels =
      0..10
      |> Enum.map(fn x ->
        y = length - (2 + x * (length - 4) / 10.0)

        label =
          cond do
            Integer.mod(x, 5) == 0 -> Integer.to_string(x)
            true -> ""
          end

        """
          <line x1="-3"  y1="#{y}"  x2="3" y2="#{y}" stroke-width="0.3" />
          <text x="0" y="#{y}"
                style="font-size: 5px;" fill="black" stroke="none" stroke-width="0.3"
                text-anchor="middle" dominant-baseline="middle"
                >#{label}</text>
        """
      end)
      |> Enum.join()

    """
    <g transform="rotate(#{theta}) translate(0 #{r_inner})"  transform-origin="0 0">
     <path
      d="M -3 0
        a 3 3 0 0 1 6 0
        v #{length}
        a 3 3 0 0 1 -6 0
        v #{-length}"
      stroke="red"
      />
      #{labels}
      </g>
    """
  end

  def radial_slider_group(r_outer, length, n_sliders, d_theta, offset_theta) do
    0..(n_sliders - 1)
    |> Enum.map(fn x -> radial_slider(r_outer, length, offset_theta + x * d_theta) end)
    |> Enum.join()
  end

  def radial_slider_ring(r_outer, length, n_groups, sliders_per_group) do
    d_theta =
      case n_groups do
        1 -> 360 / (sliders_per_group * n_groups)
        _ -> 360 / ((sliders_per_group + 1) * n_groups)
      end

    0..(n_groups - 1)
    |> Enum.map(fn x ->
      radial_slider_group(r_outer, length, sliders_per_group, d_theta, 360 * x / n_groups)
    end)
    |> Enum.join()
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.RadialSliders do
  def render(ring) do
    %{position: {radius, length}, shape: {n_groups, sliders_per_group}} = ring

    PerceptronApparatus.Rings.RadialSliders.radial_slider_ring(
      radius,
      length,
      n_groups,
      sliders_per_group
    )
  end
end
