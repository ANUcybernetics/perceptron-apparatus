defmodule PerceptronApparatus.Rings.RadialSliders do
  @moduledoc """
  Documentation for `RadialSliders`.
  """
  defstruct [:a, :b, :c]

  radial_slider = fn r_inner, r_outer, theta ->
    length = r_outer - r_inner

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

  svg_kino.(radial_slider.(150, 250, 0), "-100 140 200 120")
  ```

  ```elixir
  radial_slider_group = fn r_inner, r_outer, n_sliders, d_theta, offset_theta ->
    0..(n_sliders - 1)
    |> Enum.map(fn x -> radial_slider.(r_inner, r_outer, offset_theta + x * d_theta) end)
    |> Enum.join()
  end

  radial_slider_ring = fn r_inner, r_outer, n_groups, sliders_per_group ->
    d_theta =
      case n_groups do
        1 -> 360 / (sliders_per_group * n_groups)
        _ -> 360 / ((sliders_per_group + 1) * n_groups)
      end

    0..(n_groups - 1)
    |> Enum.map(fn x ->
      radial_slider_group.(r_inner, r_outer, sliders_per_group, d_theta, 360 * x / n_groups)
    end)
    |> Enum.join()
  end

  hidden_1_ring = radial_slider_ring.(200, 300, 5, 25)
  hidden_2_ring = radial_slider_ring.(80, 160, 10, 5)
  disk_kino.(hidden_1_ring <> hidden_2_ring)
end
