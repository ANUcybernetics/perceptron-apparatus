defmodule PerceptronApparatus.Board do
  @moduledoc """
  A perceptron apparatus board that automatically creates the required ring sequence
  for a neural network with specified input, hidden, and output dimensions.
  """
  use Ash.Resource,
    otp_app: :perceptron_apparatus,
    domain: PerceptronApparatus

  alias PerceptronApparatus.{AzimuthalRing, RadialRing, RuleRing, Renderable, Utils}

  code_interface do
    define :create, args: [:size, :n_input, :n_hidden, :n_output]
    define :read
  end

  actions do
    defaults [:read]

    create :create do
      accept [:size, :n_input, :n_hidden, :n_output]

      change fn changeset, _context ->
        # Get the parameters
        size = Ash.Changeset.get_attribute(changeset, :size)
        n_input = Ash.Changeset.get_attribute(changeset, :n_input)
        n_hidden = Ash.Changeset.get_attribute(changeset, :n_hidden)
        n_output = Ash.Changeset.get_attribute(changeset, :n_output)

        # Create the ring sequence
        rings = create_ring_sequence(n_input, n_hidden, n_output)

        # Set the rings on the changeset
        Ash.Changeset.change_attribute(changeset, :rings, rings)
      end
    end

    update :add_ring do
      accept [:rings]
    end

    read :validate do
      prepare fn query, _context ->
        query
      end
    end
  end

  attributes do
    uuid_primary_key :id
    attribute :size, :float, allow_nil?: false
    attribute :n_input, :integer, allow_nil?: false
    attribute :n_hidden, :integer, allow_nil?: false
    attribute :n_output, :integer, allow_nil?: false
    attribute :rings, :term, default: []
  end

  @type t :: %__MODULE__{
          id: String.t(),
          size: float(),
          n_input: integer(),
          n_hidden: integer(),
          n_output: integer(),
          rings: [map()]
        }

  @doc """
  Creates the standard ring sequence for a perceptron apparatus.
  From outside to inside:
  1. Log ring
  2. ReLU ring
  3. Input azimuthal ring (n_input sliders)
  4. Weight1 radial ring (n_hidden groups x n_input sliders per group)
  5. Hidden azimuthal ring (n_hidden sliders)
  6. Weight2 radial ring (n_output groups x n_hidden sliders per group)
  7. Output azimuthal ring (n_output sliders)
  """
  def create_ring_sequence(n_input, n_hidden, n_output) do
    [
      # Log ring
      create_log_ring(),

      # ReLU ring
      create_relu_ring(),

      # Input azimuthal ring
      create_input_ring(n_input),

      # Weight1 radial ring (input -> hidden)
      create_weight_ring(n_hidden, n_input),

      # Hidden azimuthal ring
      create_hidden_ring(n_hidden),

      # Weight2 radial ring (hidden -> output)
      create_weight_ring(n_output, n_hidden),

      # Output azimuthal ring
      create_output_ring(n_output)
    ]
  end

  defp create_log_ring do
    {:ok, ring} =
      Ash.Changeset.for_create(RuleRing, :new, %{rule: RuleRing.log_rule(), width: 30.0})
      |> Ash.create()

    ring
  end

  defp create_relu_ring do
    {:ok, ring} =
      Ash.Changeset.for_create(RuleRing, :new, %{rule: RuleRing.relu_rule(10, 0.25), width: 30.0})
      |> Ash.create()

    ring
  end

  defp create_input_ring(n_input) do
    rule = Utils.new_rule(0, 1, 0.1, 0.5)
    shape = %{sliders: n_input}

    {:ok, ring} =
      Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 10.0})
      |> Ash.create()

    ring
  end

  defp create_weight_ring(n_groups, n_sliders_per_group) do
    rule = Utils.new_rule(-10, 10, 2, 10)
    shape = %{groups: n_groups, sliders_per_group: n_sliders_per_group}

    {:ok, ring} =
      Ash.Changeset.for_create(RadialRing, :new, %{shape: shape, rule: rule, width: 25.0})
      |> Ash.create()

    ring
  end

  defp create_hidden_ring(n_hidden) do
    rule = Utils.new_rule(0, 10, 1, 5)
    shape = %{sliders: n_hidden}

    {:ok, ring} =
      Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 10.0})
      |> Ash.create()

    ring
  end

  defp create_output_ring(n_output) do
    rule = Utils.new_rule(0, 1, 0.1, 0.5)
    shape = %{sliders: n_output}

    {:ok, ring} =
      Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 10.0})
      |> Ash.create()

    ring
  end

  def validate!(apparatus) do
    Enum.each(apparatus.rings, fn ring ->
      case ring do
        %AzimuthalRing{} -> :ok
        %RadialRing{} -> :ok
        %RuleRing{} -> :ok
        _ -> raise "Invalid ring type"
      end
    end)
  end

  def render(apparatus, nodisplay_selectors \\ []) do
    %{size: size, rings: rings} = apparatus

    radius = size / 2
    radial_padding = 25
    center_space = 120
    svg_padding = 10

    # Calculate optimal ring widths with automatic spacing
    rings_with_widths = calculate_ring_widths(rings, radius, radial_padding, center_space)

    view_box =
      "-#{size / 2 + svg_padding} -#{size / 2 + svg_padding} #{size + 2 * svg_padding} #{size + 2 * svg_padding}"

    rings_with_widths
    |> Enum.with_index()
    |> Enum.reduce(
      {radius - radial_padding / 2, 1, ""},
      fn {{ring, ring_width}, ring_index}, {current_radius, idx, output} ->
        # Determine if this should have a bottom channel (consecutive RuleRings)
        bottom_channel? =
          ring_index < length(rings_with_widths) - 1 &&
            match?(%RuleRing{}, ring) &&
            match?(%RuleRing{}, elem(Enum.at(rings_with_widths, ring_index + 1), 0))

        # Set context for the ring
        {:ok, ring_with_context} =
          ring
          |> Ash.Changeset.for_update(:set_context, %{
            context: %{
              radius: current_radius,
              layer_index: idx,
              ring_width: ring_width,
              outer_radius: current_radius,
              inner_radius: current_radius - ring_width
            }
          })
          |> Ash.update()

        {
          current_radius - ring_width - radial_padding,
          next_layer_index(ring, idx),
          """
          #{bottom_channel? && bottom_rotating_channel(current_radius - ring_width - radial_padding / 2, 2 * ring_width + 10)}
          #{output}
          <circle class="debug" cx="0" cy="0" r="#{current_radius}" stroke-width="1"/>
          #{Renderable.render(ring_with_context)}
          <circle class="debug" cx="0" cy="0" r="#{current_radius - ring_width}" stroke-width="1"/>
          """
        }
      end
    )
    # add the "board edge" circle
    |> then(fn {_, _, output} ->
      ~s|<circle class="full" cx="0" cy="0" r="#{radius}" stroke-width="2"/>| <> output
    end)
    |> render_body(view_box, nodisplay_selectors)
  end

  defp calculate_ring_widths(rings, radius, radial_padding, center_space) do
    # Identify ring types
    radial_rings = Enum.filter(rings, &match?(%RadialRing{}, &1))
    fixed_rings = Enum.reject(rings, &match?(%RadialRing{}, &1))

    # Calculate fixed space usage
    fixed_widths_total = Enum.sum(Enum.map(fixed_rings, & &1.width))

    # Calculate padding: we need (n-1) gaps between n rings
    padding_total = radial_padding * (length(rings) - 1)

    # Calculate available space for radial rings
    available_for_radial = radius - center_space - fixed_widths_total - padding_total
    radial_count = length(radial_rings)

    # Ensure we have positive space available
    available_for_radial = max(available_for_radial, 0)

    # Distribute space evenly among radial rings
    radial_width = if radial_count > 0, do: available_for_radial / radial_count, else: 0

    # Map rings to their calculated widths
    Enum.map(rings, fn ring ->
      width =
        case ring do
          %RadialRing{} -> radial_width
          _ -> ring.width
        end

      {ring, width}
    end)
  end

  def render_body(body, view_box, nodisplay_selectors) do
    """
    <svg viewBox="#{view_box}" stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      text {
        font-family: "Libertinus Sans";
        font-size: 12px;
      }
      #{Enum.map(nodisplay_selectors, fn s -> "#{s} { display: none; }" end) |> Enum.join("\n")}
      .full {
        stroke-width: 1;
        stroke: #6ab04c;
      }
      .slider {
        stroke: #f0932b;
      }
      .top.slider {
        stroke-width: 3;
      }
      .bottom.slider {
        stroke-width: 8;
        opacity: 0.3;
      }
      .bottom.rotating {
        stroke: #f0932b;
        opacity: 0.3;
      }
      .etch {
        stroke-width: 0.5;
        stroke: black;
      }
      .etch.heavy {
        stroke-width: 1.5;
      }
      text {
        fill: black;
        stroke: none;
      }
      text.indices{
        font-size: 8px;
      }
      .debug {
        display: none;
        stroke: red;
        fill: transparent;
      }
      </style>
      #{body}
    </svg>
    """
  end

  defp next_layer_index(%RuleRing{}, idx), do: idx
  defp next_layer_index(_ring, idx), do: idx + 1

  defp bottom_rotating_channel(radius, width) do
    """
    <circle class="bottom rotating" cx="0" cy="0" r="#{radius}" stroke-width="#{width}"/>
    """
  end
end
