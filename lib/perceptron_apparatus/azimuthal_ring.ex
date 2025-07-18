defmodule PerceptronApparatus.AzimuthalRing do
  @moduledoc """
  Documentation for `AzimuthalRing`.
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
    attribute :width, :float, default: 20.0
    attribute :shape, :term, allow_nil?: false
    attribute :rule, :term, allow_nil?: false
    attribute :context, :term, allow_nil?: true
  end

  # Use PerceptronApparatus.create_azimuthal_ring/2 instead

  def render_slider(radius, theta_sweep, rule, {layer_index, number}) do
    tick_length = 14
    range_min = List.first(rule) |> elem(1) |> D.to_float()
    range_max = List.last(rule) |> elem(1) |> D.to_float()
    dynamic_range = range_max - range_min
    theta_offset = theta_sweep * number

    # for creating "gaps" at the beginning and end of the [theta_offset, theta_offset + theta_sweep]
    # range (where the labels will go)
    az_padding = 700 / radius + theta_sweep / 36

    rule_lines =
      rule
      |> Enum.map(fn {label, val} ->
        theta =
          az_padding +
            (theta_sweep - 2 * az_padding) * (D.to_float(val) - range_min) / dynamic_range

        line_class = if label, do: "top etch heavy", else: "top etch"

        line_element([
          {"transform", "rotate(#{-theta})"},
          {"class", line_class},
          {"x1", "0"},
          {"x2", "0"},
          {"y1", to_string(radius - tick_length / 2)},
          {"y2", to_string(radius + tick_length / 2)}
        ])
      end)

    first_label_text =
      text_element(
        rule |> List.first() |> elem(0) || "",
        [
          {"transform", "rotate(#{-(0.7 * az_padding)})"},
          {"class", "top etch"},
          {"x", "0"},
          {"y", to_string(radius)},
          {"text-anchor", "end"},
          {"dominant-baseline", "middle"}
        ]
      )

    last_label_text =
      text_element(
        rule |> List.last() |> elem(0) || "",
        [
          {"transform", "rotate(#{-(theta_sweep - 0.7 * az_padding)})"},
          {"class", "top etch"},
          {"x", "0"},
          {"y", to_string(radius)},
          {"text-anchor", "start"},
          {"dominant-baseline", "middle"}
        ]
      )

    index_text =
      text_element(
        "#{<<64 + layer_index>>}#{number}",
        [
          {"transform", "rotate(#{-0.5 * theta_sweep})"},
          {"class", "top etch indices"},
          {"x", "0"},
          {"y", to_string(radius - tick_length)},
          {"text-anchor", "middle"},
          {"dominant-baseline", "middle"}
        ]
      )

    # Calculate extended positions for bottom slider (10 units extension at each end)
    # Extension in angular terms depends on radius - convert arc length to degrees
    angular_extension_rad = 10 / radius
    angular_extension_deg = angular_extension_rad * 180 / :math.pi()
    
    x1 = radius * :math.sin(deg2rad(az_padding))
    y1 = radius * :math.cos(deg2rad(az_padding))
    x2 = radius * :math.sin(deg2rad(theta_sweep - az_padding))
    y2 = radius * :math.cos(deg2rad(theta_sweep - az_padding))
    
    # Extended positions for bottom slider
    x1_extended = radius * :math.sin(deg2rad(az_padding - angular_extension_deg))
    y1_extended = radius * :math.cos(deg2rad(az_padding - angular_extension_deg))
    x2_extended = radius * :math.sin(deg2rad(theta_sweep - az_padding + angular_extension_deg))
    y2_extended = radius * :math.cos(deg2rad(theta_sweep - az_padding + angular_extension_deg))

    bottom_path =
      path_element([
        {"class", "bottom slider"},
        {"stroke-linecap", "round"},
        {"d", "M #{x1_extended} #{y1_extended} A #{radius} #{radius} 0 0 0 #{x2_extended} #{y2_extended}"}
      ])

    # Top slider uses original (non-extended) positions
    top_path =
      path_element([
        {"class", "top slider"},
        {"stroke-linecap", "round"},
        {"d", "M #{x1} #{y1} A #{radius} #{radius} 0 0 0 #{x2} #{y2}"}
      ])

    children =
      [first_label_text | rule_lines] ++ [last_label_text, index_text, bottom_path, top_path]

    group_element(children, [{"transform", "rotate(#{-theta_offset})"}])
  end

  def render(radius, sliders, rule, layer_index) do
    theta_sweep = 360 / sliders

    0..(sliders - 1)
    |> Enum.map(fn i ->
      render_slider(radius, theta_sweep, rule, {layer_index, i})
    end)
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.AzimuthalRing do
  alias PerceptronApparatus.AzimuthalRing

  def render(%AzimuthalRing{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{
      rule: rule,
      shape: %{sliders: sliders},
      context: %{radius: radius, layer_index: layer_index}
    } = ring

    AzimuthalRing.render(radius, sliders, rule, layer_index)
  end
end
