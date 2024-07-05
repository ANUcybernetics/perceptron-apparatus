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

  def add_ring(%__MODULE__{} = board, ring) do
    %{board | rings: board.rings ++ [ring]}
  end

  def validate!(%__MODULE__{} = board) do
    Enum.each(board.rings, fn ring ->
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

    if total_ring_width > radius do
      raise "Total ring width exceeds apparatus radius"
    end

    radial_padding = 40

    svg_padding = 10

    view_box =
      "-#{size / 2 + svg_padding} -#{size / 2 + svg_padding} #{size + 2 * svg_padding} #{size + 2 * svg_padding}"

    rings
    |> Enum.reduce({radius - radial_padding / 2, 1, ""}, fn ring, {r, idx, output} ->
      {
        r - ring.width - radial_padding,
        idx + 1,
        """
        #{output}
        <circle class="debug" cx="0" cy="0" r="#{r}" stroke-width="1"/>
        #{Renderable.render(%{ring | context: {r, idx}})}
        <circle class="debug" cx="0" cy="0" r="#{r - ring.width}" stroke-width="2"/>
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
      svg {
        font-family: Garamond;
      }
      .debug {
        stroke: red;
        fill: transparent;
      }
      </style>
      #{body}
    </svg>
    """
  end
end
