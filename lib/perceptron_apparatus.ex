defmodule PerceptronApparatus do
  @moduledoc """
  Documentation for `PerceptronApparatus`.
  """
  alias PerceptronApparatus.Rings
  alias PerceptronApparatus.Renderable

  defstruct [:size, :rings]

  @type t :: %__MODULE__{
          size: {float(), float()},
          rings: [Rings.AzimuthalSliders.t() | Rings.RadialSliders.t() | Rings.SlideRule.t()]
        }

  def new(size) do
    %__MODULE__{
      size: size,
      rings: []
    }
  end

  def add_ring(%__MODULE__{} = apparatus, ring) do
    %{apparatus | rings: apparatus.rings ++ [ring]}
  end

  def validate!(%__MODULE__{} = apparatus) do
    Enum.each(apparatus.rings, fn ring ->
      case ring do
        %Rings.AzimuthalSliders{} -> :ok
        %Rings.RadialSliders{} -> :ok
        %Rings.SlideRule{} -> :ok
        _ -> raise "Invalid ring type"
      end
    end)
  end

  def render(apparatus) do
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
      [%Rings.SlideRule{} = ring, %Rings.SlideRule{}] -> {ring, 15}
      [ring | _] -> {ring, 25}
    end)
    |> Enum.reduce({radius - radial_padding / 2, 1, ""}, fn {ring, radial_padding},
                                                            {r, idx, output} ->
      {
        r - ring.width - radial_padding,
        next_layer_index(ring, idx),
        """
        idx + 1,
        #{output}
        <circle class="debug" cx="0" cy="0" r="#{r}" stroke-width="1"/>
        #{Renderable.render(%{ring | context: {r, idx}})}
        <circle class="debug" cx="0" cy="0" r="#{r - ring.width}" stroke-width="1"/>
        """
      }
    end)
    # add the "board edge" circle
    |> then(fn {_, _, output} ->
      ~s|<circle cx="0" cy="0" r="#{radius}" stroke-width="2"/>| <> output
    end)
    |> render_body(view_box)
  end

  def render_body(body, view_box) do
    """
    <svg viewBox="#{view_box}" stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      text {
        font-family: "Relief SingleLine";
        font-size: 12px;
      }
      .full {
        stroke-width: 3;
        stroke: #6ab04c;
      }
      .slider {
        stroke-width: 6;
        stroke: #f0932b;
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
        stroke: #130f40;
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

  defp next_layer_index(%Rings.SlideRule{}, idx), do: idx
  defp next_layer_index(_ring, idx), do: idx + 1
end
