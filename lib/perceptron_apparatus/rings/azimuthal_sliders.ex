defmodule PerceptronApparatus.Rings.AzimuthalSliders do
  @moduledoc """
  Documentation for `AzimuthalSliders`.
  """
  alias Decimal, as: D

  defstruct [:width, :shape, :range, :context]

  @type t :: %__MODULE__{
          # min, max
          range: [Decimal.t()],
          # no groups for azimuthal sliders, just the number of sliders
          # this is not the geometric shape, rather the shape of the corresponding matrix
          shape: {integer()},
          # ring width (fixed for azimuthal sliders)
          width: float(),
          # drawing context: {outer_radius, layer_index}
          context: {float(), integer()}
        }

  def new(shape, opts \\ []) do
    # use default values when it makes sense
    range = Keyword.get(opts, :range, PerceptronApparatus.Utils.drange(0, 1, 0.1))

    %__MODULE__{width: 20.0, range: range, shape: shape}
  end

  # range is a list of Decimals, but for calculation purposes we convert them to floats early
  # on and just live with the rounding error from there
  def render_slider(radius, theta_sweep, theta_offset, range) do
    slider_hwidth = 3
    range_min = List.first(range) |> D.to_float()
    range_max = List.last(range) |> D.to_float()
    dynamic_range = range_max - range_min

    # for creating "gaps" at the beginning and end of the [theta_offset, theta_offset + theta_sweep]
    # range (where the labels will go)
    az_padding = 1500 / radius

    labels =
      range
      |> Enum.map(fn val ->
        theta =
          az_padding +
            (theta_sweep - 2 * az_padding) * (D.to_float(val) - range_min) / dynamic_range

        %{stroke_width: stroke_width} = ticks_and_labels(val)

        """
        <g transform="rotate(#{-theta})"  transform-origin="0 0">
          <line class="top etch" x1="0" x2="0" y1="#{radius - slider_hwidth * 3}" y2="#{radius + slider_hwidth * 3}" stroke-width="#{stroke_width}" />
        </g>
        """
      end)
      |> List.insert_at(
        0,
        """
        <g transform="rotate(#{-(theta_offset + 2 / 3 * az_padding)})"  transform-origin="0 0">
          <text class="top etch" x="0" y="#{radius}"
                style="font-size: 12px;" fill="black" stroke="none" stroke-width="#{range |> List.first() |> ticks_and_labels() |> Map.get(:stroke_width)}"
                text-anchor="middle" dominant-baseline="middle"
                >#{range |> List.first() |> ticks_and_labels() |> Map.get(:label)}</text>
        </g>
        """
      )
      |> List.insert_at(
        -1,
        """
        <g transform="rotate(#{-(theta_offset + theta_sweep - 2 / 3 * az_padding)})"  transform-origin="0 0">
          <text class="top etch" x="0" y="#{radius}"
                style="font-size: 12px;" fill="black" stroke="none" stroke-width="#{range |> List.last() |> ticks_and_labels() |> Map.get(:stroke_width)}"
                text-anchor="middle" dominant-baseline="middle"
                >#{range |> List.last() |> ticks_and_labels() |> Map.get(:label)}</text>
        </g>
        """
      )
      |> Enum.join()

    x1 = (radius + slider_hwidth) * Math.sin(Math.deg2rad(az_padding))
    y1 = (radius - slider_hwidth) * Math.cos(Math.deg2rad(az_padding))
    x2 = (radius - slider_hwidth) * Math.sin(Math.deg2rad(az_padding))
    y2 = (radius + slider_hwidth) * Math.cos(Math.deg2rad(az_padding))
    x3 = (radius + slider_hwidth) * Math.sin(Math.deg2rad(theta_sweep - az_padding))
    y3 = (radius + slider_hwidth) * Math.cos(Math.deg2rad(theta_sweep - az_padding))
    x4 = (radius - slider_hwidth) * Math.sin(Math.deg2rad(theta_sweep - az_padding))
    y4 = (radius - slider_hwidth) * Math.cos(Math.deg2rad(theta_sweep - az_padding))

    """
    <g transform="rotate(#{-theta_offset})"  transform-origin="0 0">
    #{labels}
     <path
      class="top full"
      style="fill: white;"
      d="M #{x1} #{y1}
        A #{slider_hwidth} #{slider_hwidth} 0 0 0 #{x2} #{y2}
        A #{radius + slider_hwidth} #{radius + slider_hwidth} 0 0 0 #{x3} #{y3}
        A #{slider_hwidth} #{slider_hwidth} 0 0 0 #{x4} #{y4}
        A #{radius - slider_hwidth} #{radius - slider_hwidth} 0 0 1 #{x1} #{y1}"
      />
      </g>
    """
  end

  def render(radius, sliders, range) do
    theta_sweep = 360 / sliders

    0..(sliders - 1)
    |> Enum.map(fn i ->
      render_slider(
        radius,
        theta_sweep,
        theta_sweep * i,
        range
      )
    end)
    |> Enum.join()
  end

  defp ticks_and_labels(val) do
    cond do
      D.integer?(val) ->
        %{
          label: val |> D.normalize() |> D.to_string(:normal),
          stroke_width: "1.0"
        }

      true ->
        %{label: nil, stroke_width: "0.5"}
    end
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.AzimuthalSliders do
  alias PerceptronApparatus.Rings.AzimuthalSliders

  def render(%AzimuthalSliders{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{range: range, shape: {sliders}, context: {radius, _layer_index}} = ring

    AzimuthalSliders.render(radius - 10, sliders, range)
  end
end
