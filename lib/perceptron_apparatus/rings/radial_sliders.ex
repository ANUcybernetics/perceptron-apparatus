defmodule PerceptronApparatus.Rings.RadialSliders do
  @moduledoc """
  Documentation for `RadialSliders`.
  """
  defstruct [:width, :shape, :range, :context]

  @type t :: %__MODULE__{
          # min, max
          range: Range.t(),
          # this is not the geometric shape, rather the shape of the corresponding matrix
          # {n_groups, n_sliders_per_group}
          shape: {integer(), integer},
          # ring width (r_outer - r_inner)
          width: float(),
          # drawing context: {r_outer, layer_index}
          context: {float(), integer()}
        }

  def new(shape, opts \\ []) do
    # use default values when it makes sense
    range = Keyword.get(opts, :range, 0..10)
    width = Keyword.get(opts, :width, 100.0)

    %__MODULE__{width: width, range: range, shape: shape}
  end

  def render_slider(radius, width, theta) do
    slider_hwidth = 5

    """
    <g class="top full" transform="rotate(#{-theta}) translate(0 #{radius})" transform-origin="0 0">
     <path
      fill="white"
      d="M -#{slider_hwidth} 0
        a #{slider_hwidth} #{slider_hwidth} 0 0 0 #{2 * slider_hwidth} 0
        v #{-width}
        a #{slider_hwidth} #{slider_hwidth} 0 0 0 -#{2 * slider_hwidth} 0
        v #{width}"
      />
      </g>
    """
  end

  @doc """
  - `radius` is the outer radius of the slider group
  - `theta_sweep` is the sweep angle of the slider group in degrees
  - `theta_offset` is the angle offset of the slider group in degrees
  """
  def render_group(radius, width, sliders_per_group, theta_sweep, theta_offset) do
    # the extra 1s are to two "gaps" at the beginning and end of the [theta_sweep, theta_sweep + theta_offset] range (where the labels will go)
    1..sliders_per_group
    |> Enum.map(fn i ->
      render_slider(radius, width, theta_offset + i * (theta_sweep / (sliders_per_group + 1)))
    end)
    |> Enum.join()
  end

  def render_guides(radius, width, groups, range) do
    range
    |> Enum.map(fn val ->
      range_min = Enum.min(range)
      dynamic_range = Enum.max(range) - range_min
      r = radius - width * (val - range_min) / dynamic_range
      %{label: label, stroke_width: stroke_width} = ticks_and_labels(val)

      circle =
        ~s|<circle class="top etch" cx="0" cy="0" r="#{r}" stroke-width="#{stroke_width}" />|

      labels =
        0..(groups - 1)
        |> Enum.map(fn i ->
          theta = 360 * i / groups

          """
          <g class="top etch" transform="rotate(#{-theta})" transform-origin="0 0">
           <text class="top etch" x="0" y="#{r - 4}"
                 style="font-size: 12px;" fill="black" stroke="none" stroke-width="#{stroke_width}"
                 text-anchor="middle"
                 >#{label}</text>
          </g>
          """
        end)
        |> Enum.join()

      circle <> labels
    end)
    |> Enum.join()
  end

  def render(radius, width, groups, sliders_per_group, range) do
    theta_sweep = 360 / groups

    0..(groups - 1)
    |> Enum.map(fn i ->
      render_group(radius, width, sliders_per_group, theta_sweep, theta_sweep * i)
    end)
    |> List.insert_at(0, render_guides(radius, width, groups, range))
    |> Enum.join()
  end

  defp ticks_and_labels(val) do
    cond do
      Integer.mod(val, 5) == 0 -> %{label: Integer.to_string(val), stroke_width: "1.0"}
      true -> %{label: nil, stroke_width: "0.5"}
    end
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.RadialSliders do
  def render(%PerceptronApparatus.Rings.RadialSliders{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{
      width: width,
      range: range,
      shape: {groups, sliders_per_group},
      context: {radius, _layer_index}
    } = ring

    PerceptronApparatus.Rings.RadialSliders.render(
      radius,
      width,
      groups,
      sliders_per_group,
      range
    )
  end
end
