defmodule PerceptronApparatus.Rings.RadialSliders do
  @moduledoc """
  Documentation for `RadialSliders`.
  """
  alias Decimal, as: D

  defstruct [:width, :shape, :rule, :context]

  @type t :: %__MODULE__{
          rule: [{Decimal.t() | nil, float()}],
          # this is not the geometric shape, rather the shape of the corresponding matrix
          # {n_groups, n_sliders_per_group}
          shape: {integer(), integer},
          # ring width (r_outer - r_inner)
          width: float(),
          # drawing context: {r_outer, layer_index}
          context: {float(), integer()}
        }

  def new(shape, rule, opts \\ []) do
    # use default values when it makes sense
    width = Keyword.get(opts, :width, 80.0)

    %__MODULE__{width: width, rule: rule, shape: shape}
  end

  def render_slider(radius, width, theta) do
    """
    <path class="bottom slider" transform="rotate(#{-theta}) translate(0 #{radius})" stroke-linecap="round" d="M 0 0 v #{-width}" />
    <path class="top slider" transform="rotate(#{-theta}) translate(0 #{radius})" stroke-linecap="round" d="M 0 0 v #{-width}" />
    """
  end

  @doc """
  - `radius` is the outer radius of the slider group
  - `theta_sweep` is the sweep angle of the slider group in degrees
  - `theta_offset` is the angle offset of the slider group in degrees
  """
  def render_group(radius, width, sliders_per_group, theta_sweep, group_index, layer_index) do
    # the extra 1s are to two "gaps" at the beginning and end of the [theta_sweep, theta_sweep + theta_offset] range (where the labels will go)
    theta_offset = theta_sweep * group_index

    1..sliders_per_group
    |> Enum.map(fn i ->
      render_slider(radius, width, theta_offset + i * (theta_sweep / (sliders_per_group + 1)))
    end)
    |> List.insert_at(
      -1,
      """
        <text transform="rotate(#{-(theta_offset + 0.5 * theta_sweep)})" class="top etch indices" x="0" y="#{radius - width - 10}"
              text-anchor="middle" dominant-baseline="middle"
              >#{Roman.encode!(layer_index)}-#{group_index + 1}</text>
      """
    )
    |> Enum.join()
  end

  def render_guides(radius, width, groups, rule) do
    range_min = List.first(rule) |> elem(1) |> D.to_float()
    range_max = List.last(rule) |> elem(1) |> D.to_float()
    dynamic_range = range_max - range_min
    theta_sweep = 360 / groups

    radii =
      rule
      |> Enum.map(fn {label, val} ->
        {label, radius - width * (D.to_float(val) - range_min) / dynamic_range}
      end)

    circles =
      Enum.map(radii, fn {label, r} ->
        az_padding = 700 / r

        0..(groups - 1)
        |> Enum.map(fn i ->
          x1 = r * Math.sin(Math.deg2rad(i * theta_sweep + az_padding))
          y1 = r * Math.cos(Math.deg2rad(i * theta_sweep + az_padding))
          x2 = r * Math.sin(Math.deg2rad((i + 1) * theta_sweep - az_padding))
          y2 = r * Math.cos(Math.deg2rad((i + 1) * theta_sweep - az_padding))

          """
          M #{x1} #{y1}
          A #{r} #{r} 0 0 0 #{x2} #{y2}
          """
        end)
        |> then(fn arc_components ->
          """
          <path class="top etch #{label && "heavy"}" d="#{arc_components}" />
          """
        end)
      end)
      |> Enum.join()

    labels =
      0..(groups - 1)
      |> Enum.map(fn i ->
        theta = 360 * i / groups

        # now, we need to write the labels on the appropriate circle
        radii
        |> Enum.filter(fn {label, _r} -> label end)
        |> Enum.map(fn {label, r} ->
          """
           <text class="top etch heavy" x="0" y="#{r + 1}"
                 text-anchor="middle" dominant-baseline="middle"
                 >#{label}</text>
          """
        end)
        |> Enum.join()
        |> then(fn text ->
          """
          <g class="top etch" transform="rotate(#{-theta})" >
          #{text}
          </g>
          """
        end)
      end)
      |> Enum.join()

    circles <> labels
  end

  def render(radius, width, groups, sliders_per_group, rule, layer_index) do
    theta_sweep = 360 / groups

    0..(groups - 1)
    |> Enum.map(fn i ->
      render_group(radius, width, sliders_per_group, theta_sweep, i, layer_index)
    end)
    |> List.insert_at(0, render_guides(radius, width, groups, rule))
    |> Enum.join()
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.RadialSliders do
  def render(%PerceptronApparatus.Rings.RadialSliders{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{
      width: width,
      rule: rule,
      shape: {groups, sliders_per_group},
      context: {radius, layer_index}
    } = ring

    PerceptronApparatus.Rings.RadialSliders.render(
      radius - 5,
      width - 10,
      groups,
      sliders_per_group,
      rule,
      layer_index
    )
  end
end
