defmodule PerceptronApparatus.AzimuthalRing do
  @moduledoc """
  Documentation for `AzimuthalRing`.
  """
  use Ash.Resource,
    otp_app: :perceptron_apparatus,
    domain: PerceptronApparatus

  alias Decimal, as: D
  import PerceptronApparatus.Utils, only: [deg2rad: 1]

  attributes do
    uuid_primary_key :id
    attribute :width, :float, default: 20.0
    attribute :shape, :term, allow_nil?: false
    attribute :rule, :term, allow_nil?: false
    attribute :context, :term, allow_nil?: true
  end

  actions do
    defaults [:read]
    
    create :new do
      accept [:width, :shape, :rule]
    end

    update :set_context do
      accept [:context]
    end
  end

  @type t :: %__MODULE__{
          id: String.t(),
          rule: [{Decimal.t() | nil, float()}],
          # no groups for azimuthal sliders, just the number of sliders
          # this is not the geometric shape, rather the shape of the corresponding matrix
          shape: {integer()},
          # ring width (fixed for azimuthal sliders)
          width: float(),
          # drawing context: {outer_radius, layer_index}
          context: {float(), integer()} | nil
        }

  # Legacy function for backwards compatibility
  def new(shape, rule) do
    {:ok, azimuthal_ring} = 
      Ash.Changeset.for_create(__MODULE__, :new, %{shape: shape, rule: rule})
      |> Ash.create()
    
    azimuthal_ring
  end

  def render_slider(radius, theta_sweep, rule, {layer_index, number}) do
    tick_length = 14
    range_min = List.first(rule) |> elem(1) |> D.to_float()
    range_max = List.last(rule) |> elem(1) |> D.to_float()
    dynamic_range = range_max - range_min
    theta_offset = theta_sweep * number

    # for creating "gaps" at the beginning and end of the [theta_offset, theta_offset + theta_sweep]
    # range (where the labels will go)
    az_padding = 1500 / radius

    labels =
      rule
      |> Enum.map(fn {label, val} ->
        theta =
          az_padding +
            (theta_sweep - 2 * az_padding) * (D.to_float(val) - range_min) / dynamic_range

        """
          <line transform="rotate(#{-theta})" class="top etch #{label && "heavy"}" x1="0" x2="0" y1="#{radius - tick_length / 2}" y2="#{radius + tick_length / 2}" />
        """
      end)
      |> List.insert_at(
        0,
        """
          <text transform="rotate(#{-(0.7 * az_padding)})"
                class="top etch heavy" x="0" y="#{radius}"
                text-anchor="end" dominant-baseline="middle"
                >#{rule |> List.first() |> elem(0)}</text>
        """
      )
      |> List.insert_at(
        -1,
        """
          <text transform="rotate(#{-(theta_sweep - 0.7 * az_padding)})"
                class="top etch heavy" x="0" y="#{radius}"
                text-anchor="start" dominant-baseline="middle"
                >#{rule |> List.last() |> elem(0)}</text>
        """
      )
      |> List.insert_at(
        -1,
        """
          <text transform="rotate(#{-0.5 * theta_sweep})"
                class="top etch indices" x="0" y="#{radius - tick_length}"
                text-anchor="middle" dominant-baseline="middle"
                >#{Roman.encode!(layer_index)}-#{number + 1}</text>
        """
      )
      |> Enum.join()

    x1 = radius * :math.sin(deg2rad(az_padding))
    y1 = radius * :math.cos(deg2rad(az_padding))
    x2 = radius * :math.sin(deg2rad(theta_sweep - az_padding))
    y2 = radius * :math.cos(deg2rad(theta_sweep - az_padding))

    """
    <g transform="rotate(#{-theta_offset})"  >
      #{labels}
      <path class="bottom slider" stroke-linecap="round" d="M #{x1} #{y1} A #{radius} #{radius} 0 0 0 #{x2} #{y2}" />
      <path class="top slider" stroke-linecap="round" d="M #{x1} #{y1} A #{radius} #{radius} 0 0 0 #{x2} #{y2}" />
    </g>
    """
  end

  def render(radius, sliders, rule, layer_index) do
    theta_sweep = 360 / sliders

    0..(sliders - 1)
    |> Enum.map(fn i ->
      render_slider(radius, theta_sweep, rule, {layer_index, i})
    end)
    |> Enum.join()
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.AzimuthalRing do
  alias PerceptronApparatus.AzimuthalRing

  def render(%AzimuthalRing{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{rule: rule, shape: %{sliders: sliders}, context: %{radius: radius, layer_index: layer_index}} = ring

    AzimuthalRing.render(radius - 10, sliders, rule, layer_index)
  end
end
