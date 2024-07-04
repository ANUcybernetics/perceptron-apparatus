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
    size = Keyword.get(opts, :width, 100.0)

    %__MODULE__{width: size, range: range, shape: shape}
  end

  defp labeller(x) do
    cond do
      Integer.mod(x, 5) == 0 -> Integer.to_string(x)
      true -> ""
    end
  end

  def render_slider(r_outer, width, theta) do
    slider_hwidth = 5

    """
    <g class="top full" transform="rotate(#{theta}) translate(0 #{r_outer})" transform-origin="0 0">
     <path
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
  - `theta` is the sweep angle of the slider group in degrees
  - `theta_offset` is the angle offset of the slider group in degrees
  - `range` is the range of values to be displayed
  """
  def render_group(
        r_outer,
        width,
        sliders_per_group,
        theta,
        theta_offset,
        range
      ) do
    _guide_lines =
      range
      |> Enum.map(fn val ->
        range_min = Enum.min(range)
        dynamic_range = Enum.max(range) - range_min
        r = r_outer - width * (val - range_min) / dynamic_range

        """
          <circle class="top etch" cx="0" cy="0" r="#{r}" stroke-width="0.3" />
          <text class="top etch" x="0" y="#{r}"
                style="font-size: 5px;" fill="black" stroke="none" stroke-width="0.3"
                text-anchor="middle" dominant-baseline="middle"
                >#{labeller(val)}</text>
        """
      end)
      |> Enum.join()

    0..(sliders_per_group - 1)
    |> Enum.map(fn i -> render_slider(r_outer, width, theta_offset + i * theta) end)
    |> Enum.join()
  end

  # def render(%__MODULE__{} = ring, {r_outer, layer_index}) do
  #   # r_outer, length, n_groups, sliders_per_group
  #   %{shape: {n_groups, sliders_per_group}, range: range, width: length} = ring

  #   d_theta =
  #     case n_groups do
  #       1 -> 360 / (sliders_per_group * n_groups)
  #       _ -> 360 / ((sliders_per_group + 1) * n_groups)
  #     end

  #   0..(n_groups - 1)
  #   |> Enum.map(fn x ->
  #     group(r_outer, length, sliders_per_group, d_theta, 360 * x / n_groups)
  #   end)
  #   |> Enum.join()
  # end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.RadialSliders do
  def render(%PerceptronApparatus.Rings.RadialSliders{context: nil}) do
    raise "cannot render without context"
  end

  def render(_ring) do
    "TODO"
  end
end
