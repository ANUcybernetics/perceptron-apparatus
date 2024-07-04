defmodule PerceptronApparatus do
  @moduledoc """
  Documentation for `PerceptronApparatus`.
  """
  alias PerceptronApparatus.Rings

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

  def render(%__MODULE__{size: size} = apparatus) do
    padding = 10

    view_box =
      "-#{size / 2 + padding} -#{size / 2 + padding} #{size + 2 * padding} #{size + 2 * padding}"

    radius = size / 2

    apparatus.rings
    |> Enum.with_index(fn ring, idx ->
      # add one to index because layers use 1-based indexing
      %{ring | context: {radius, idx + 1}}
      |> PerceptronApparatus.Renderable.render()
    end)
    |> List.insert_at(0, ~s|<circle cx="0" cy="0" r="#{radius}" stroke-width="2"/>|)
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
