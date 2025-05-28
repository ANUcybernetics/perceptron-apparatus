defmodule PerceptronApparatus.Board do
  @moduledoc """
  Documentation for `PerceptronApparatus`.
  """
  use Ash.Resource,
    otp_app: :perceptron_apparatus,
    domain: PerceptronApparatus

  alias PerceptronApparatus.AzimuthalRing
  alias PerceptronApparatus.RadialRing
  alias PerceptronApparatus.RuleRing
  alias PerceptronApparatus.Renderable

  attributes do
    uuid_primary_key :id
    attribute :size, :float, allow_nil?: false
    attribute :rings, :term, default: []
  end

  actions do
    defaults [:read]
    
    create :new do
      accept [:size]
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

  @type t :: %__MODULE__{
          id: String.t(),
          size: float(),
          rings: [map()]
        }

  # Legacy functions for backwards compatibility
  def new(size) do
    {:ok, board} = 
      Ash.Changeset.for_create(__MODULE__, :new, %{size: size})
      |> Ash.create()
    
    board
  end

  def add_ring(apparatus, ring) do
    current_rings = apparatus.rings || []
    new_rings = current_rings ++ [ring]
    
    {:ok, updated} = 
      apparatus
      |> Ash.Changeset.for_update(:add_ring, %{rings: new_rings})
      |> Ash.update()
    
    updated
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
