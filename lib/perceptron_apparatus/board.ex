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
      Ash.Changeset.for_create(RuleRing, :new, %{rule: RuleRing.log_rule(), width: 15.0})
      |> Ash.create()

    ring
  end

  defp create_relu_ring do
    {:ok, ring} =
      Ash.Changeset.for_create(RuleRing, :new, %{rule: RuleRing.relu_rule(10, 0.25), width: 15.0})
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
    total_ring_width = rings |> Enum.map(& &1.width) |> Enum.sum()

    # TODO this check doesn't account for the radial padding, and so doesn't really work
    if total_ring_width > radius do
      raise "Total ring width exceeds apparatus radius"
    end

    radial_padding = 30

    svg_padding = 10

    view_box =
      "-#{size / 2 + svg_padding} -#{size / 2 + svg_padding} #{size + 2 * svg_padding} #{size + 2 * svg_padding}"

    rings
    |> Enum.chunk_every(2, 1)
    |> Enum.map(fn
      [%RuleRing{} = ring, %RuleRing{}] -> {ring, 15, true}
      [ring | _] -> {ring, 25, false}
    end)
    |> Enum.reduce(
      {radius - radial_padding / 2, 1, ""},
      fn {ring, radial_padding, bottom_channel?}, {r, idx, output} ->
        # Set context for the ring
        {:ok, ring_with_context} =
          ring
          |> Ash.Changeset.for_update(:set_context, %{context: %{radius: r, layer_index: idx}})
          |> Ash.update()

        {
          r - ring.width - radial_padding,
          next_layer_index(ring, idx),
          """
          #{bottom_channel? && bottom_rotating_channel(r - (ring.width + radial_padding / 2), ring.width + radial_padding + 10)}
          #{output}
          <circle class="debug" cx="0" cy="0" r="#{r}" stroke-width="1"/>
          #{Renderable.render(ring_with_context)}
          <circle class="debug" cx="0" cy="0" r="#{r - ring.width}" stroke-width="1"/>
          """
        }
      end
    )
    # add the "board edge" circle
    |> then(fn {_, _, output} ->
      ~s|<circle cx="0" cy="0" r="#{radius}" stroke-width="2"/>| <> output
    end)
    |> render_body(view_box, nodisplay_selectors)
  end

  def render_body(body, view_box, nodisplay_selectors) do
    """
    <svg viewBox="#{view_box}" stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      text {
        font-family: "Relief SingleLine";
        font-size: 12px;
      }
      #{Enum.map(nodisplay_selectors, fn s -> "#{s} { display: none; }" end) |> Enum.join("\n")}
      .full {
        stroke-width: 3;
        stroke: #6ab04c;
      }
      .slider {
        stroke: #f0932b;
      }
      .top.slider {
        stroke-width: 6;
      }
      .bottom.slider {
        stroke-width: 12;
        opacity: 0.3;
      }
      .bottom.rotating {
        stroke: #f0932b;
        opacity: 0.3;
      }
      .etch {
        stroke-width: 0.5;
        stroke: #4834d4;
      }
      text.etch{
        stroke: none;
        fill: #4834d4;
      }
      .etch.heavy {
        stroke-width: 1;
        stroke: #eb4d4b;
      }
      text.indices{
        font-size: 8px;
        text-decoration: solid overline;
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
