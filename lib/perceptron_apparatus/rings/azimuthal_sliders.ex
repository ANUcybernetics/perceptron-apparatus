defmodule PerceptronApparatus.Rings.AzimuthalSliders do
  @moduledoc """
  Documentation for `AzimuthalSliders`.
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
    size = Keyword.get(opts, :radial_size, 50.0)
    # layer index can be added later, nil ok at first
    layer_index = Keyword.get(opts, :layer_index)

    %__MODULE__{radial_size: size, range: range, shape: shape, layer_index: layer_index}
  end

  def slider(r, theta, theta_offset) do
    labels =
      0..10
      |> Enum.map(fn val ->
        label =
          cond do
            Integer.mod(val, 2) == 0 -> Integer.to_string(val)
            true -> ""
          end

        """
        <g transform="rotate(#{-theta * val / 10.0})"  transform-origin="0 0">
          <line x1="0" y1="#{r + 3}" x2="0" y2="#{r + 6}" />
          <text x="0" y="#{r + 10}"
                style="font-size: 7px;" fill="black" stroke="none" stroke-width="0.3"
                text-anchor="middle" dominant-baseline="middle"
                >#{label}</text>
        </g>
        """
      end)
      |> Enum.join()

    x1 = 0
    y1 = r - 3
    x2 = 0
    y2 = r + 3
    x3 = (r + 3) * Math.sin(Math.deg2rad(theta))
    y3 = (r + 3) * Math.cos(Math.deg2rad(theta))
    x4 = (r - 3) * Math.sin(Math.deg2rad(theta))
    y4 = (r - 3) * Math.cos(Math.deg2rad(theta))

    """
    <g transform="rotate(#{-theta_offset})"  transform-origin="0 0">
     <path
      d="M #{x1} #{y1}
        A 3 3 0 0 0 #{x2} #{y2}
        A #{r + 3} #{r + 3} 0 0 0 #{x3} #{y3}
        A 3 3 0 0 0 #{x4} #{y4}
        A #{r - 3} #{r - 3} 0 0 1 #{x1} #{y1}"
      stroke="red"
      />
      #{labels}
      </g>
    """
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.AzimuthalSliders do
  def render(%PerceptronApparatus.Rings.AzimuthalSliders{layer_index: nil}) do
    raise "layer_index is required for renderng"
  end

  def render(ring) do
    %{size: {diameter, _width}, shape: {_, sliders_per_group}} = ring

    0..(sliders_per_group - 1)
    |> Enum.map(fn val ->
      PerceptronApparatus.Rings.AzimuthalSliders.slider(
        diameter / 2,
        0.8 * 360 / sliders_per_group,
        360 * val / sliders_per_group
      )
    end)
    |> Enum.join()
  end
end
