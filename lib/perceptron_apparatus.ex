defmodule PerceptronApparatus do
  @moduledoc """
  Documentation for `PerceptronApparatus`.
  """
  alias PerceptronApparatus.Rings.AzimuthalSliders
  alias PerceptronApparatus.Rings.RadialSliders
  alias PerceptronApparatus.Rings.SlideRule

  defstruct [:size, :rings]

  @type t :: %__MODULE__{
          size: {float(), float()},
          rings: [AzimuthalSliders.t() | RadialSliders.t() | SlideRule.t()]
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
        %AzimuthalSliders{} -> :ok
        %RadialSliders{} -> :ok
        %SlideRule{} -> :ok
        _ -> raise "Invalid ring type"
      end
    end)
  end

  def render(%__MODULE__{size: size} = apparatus) do
    view_box = "-#{size / 2} -#{size / 2} #{size} #{size}"

    apparatus.rings
    |> Enum.map(&PerceptronApparatus.Renderable.render/1)
    |> List.insert_at(0, ~s|<circle cx="0" cy="0" r="#{size / 2}" stroke-width="2"/>|)
    |> render_body(view_box)
  end

  def render_body(body, view_box) do
    """
    <svg viewBox="#{view_box}" stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      svg {
        font-family: Garamond;
      }
      </style>
      #{body}
    </svg>
    """
  end
end
