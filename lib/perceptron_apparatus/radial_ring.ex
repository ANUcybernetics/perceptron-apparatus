defmodule PerceptronApparatus.RadialRing do
  @moduledoc """
  Documentation for `RadialSliders`.
  """
  use Ash.Resource,
    otp_app: :perceptron_apparatus,
    domain: PerceptronApparatus

  alias Decimal, as: D
  import PerceptronApparatus.Utils, only: [deg2rad: 1]
  import PerceptronApparatus.Utils

  actions do
    defaults [:read]

    create :new do
      accept [:width, :shape, :rule]
    end

    update :set_context do
      accept [:context]
    end
  end

  attributes do
    uuid_primary_key :id
    attribute :width, :float, default: 80.0
    attribute :shape, :term, allow_nil?: false
    attribute :rule, :term, allow_nil?: false
    attribute :context, :term, allow_nil?: true
  end

  # Use PerceptronApparatus.create_radial_ring/2 instead

  def render_slider(radius, width, theta, slider_index) do
    bottom_path =
      path_element([
        {"class", "bottom slider"},
        {"transform", "rotate(#{-theta}) translate(0 #{radius})"},
        {"stroke-linecap", "round"},
        {"d", "M 0 0 v #{-width}"}
      ])

    top_path =
      path_element([
        {"class", "top slider"},
        {"transform", "rotate(#{-theta}) translate(0 #{radius})"},
        {"stroke-linecap", "round"},
        {"d", "M 0 0 v #{-width}"}
      ])

    slider_index_text =
      text_element(
        "#{slider_index}",
        [
          {"transform", "rotate(#{-theta})"},
          {"class", "top etch indices small"},
          {"x", "0"},
          {"y", to_string(radius + 8)},
          {"text-anchor", "middle"},
          {"dominant-baseline", "middle"}
        ]
      )

    [bottom_path, top_path, slider_index_text]
  end

  @doc """
  - `radius` is the outer radius of the slider group
  - `theta_sweep` is the sweep angle of the slider group in degrees
  - `theta_offset` is the angle offset of the slider group in degrees
  """
  def render_group(radius, width, sliders_per_group, theta_sweep, group_index, layer_index) do
    # the extra 1s are to two "gaps" at the beginning and end of the [theta_sweep, theta_sweep + theta_offset] range (where the labels will go)
    theta_offset = theta_sweep * group_index

    sliders =
      1..sliders_per_group
      |> Enum.with_index()
      |> Enum.map(fn {i, slider_index} ->
        render_slider(
          radius,
          width,
          theta_offset + i * (theta_sweep / (sliders_per_group + 1)),
          slider_index
        )
      end)
      |> List.flatten()

    index_text =
      text_element(
        "#{<<64 + layer_index>>}#{group_index}",
        [
          {"transform", "rotate(#{-(theta_offset + 0.5 * theta_sweep)})"},
          {"class", "top etch indices"},
          {"x", "0"},
          {"y", to_string(radius - width - 10)},
          {"text-anchor", "middle"},
          {"dominant-baseline", "middle"}
        ]
      )

    sliders ++ [index_text]
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
        # Guard against division by zero or very small radii
        az_padding = if r > 0.1, do: 700 / r, else: 0

        arc_components =
          0..(groups - 1)
          |> Enum.map(fn i ->
            x1 = r * :math.sin(deg2rad(i * theta_sweep + az_padding))
            y1 = r * :math.cos(deg2rad(i * theta_sweep + az_padding))
            x2 = r * :math.sin(deg2rad((i + 1) * theta_sweep - az_padding))
            y2 = r * :math.cos(deg2rad((i + 1) * theta_sweep - az_padding))

            "M #{x1} #{y1} A #{r} #{r} 0 0 0 #{x2} #{y2}"
          end)
          |> Enum.join(" ")

        path_class = if label, do: "top etch heavy", else: "top etch"

        path_element([
          {"class", path_class},
          {"d", arc_components}
        ])
      end)

    labels =
      0..(groups - 1)
      |> Enum.map(fn i ->
        theta = 360 * i / groups

        # now, we need to write the labels on the appropriate circle
        text_elements =
          radii
          |> Enum.filter(fn {label, _r} -> label end)
          |> Enum.map(fn {label, r} ->
            text_element(
              label || "",
              [
                {"class", "top etch"},
                {"x", "0"},
                {"y", to_string(r + 1)},
                {"text-anchor", "middle"},
                {"dominant-baseline", "middle"}
              ]
            )
          end)

        group_element(text_elements, [
          {"class", "top etch"},
          {"transform", "rotate(#{-theta})"}
        ])
      end)

    circles ++ labels
  end

  def render(radius, width, groups, sliders_per_group, rule, layer_index) do
    theta_sweep = 360 / groups

    groups_elements =
      0..(groups - 1)
      |> Enum.map(fn i ->
        render_group(radius, width, sliders_per_group, theta_sweep, i, layer_index)
      end)
      |> List.flatten()

    guides_elements = render_guides(radius, width, groups, rule)

    guides_elements ++ groups_elements
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.RadialRing do
  def render(%PerceptronApparatus.RadialRing{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{
      rule: rule,
      shape: %{groups: groups, sliders_per_group: sliders_per_group},
      context: %{radius: radius, ring_width: ring_width, layer_index: layer_index}
    } = ring

    PerceptronApparatus.RadialRing.render(
      radius - 5,
      ring_width - 10,
      groups,
      sliders_per_group,
      rule,
      layer_index
    )
  end
end
