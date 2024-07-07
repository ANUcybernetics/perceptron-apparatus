defmodule PerceptronApparatus.Utils do
  @moduledoc """
  Some handy utilities.
  """
  def wrap_in_svg(body) do
    """
    <svg stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      svg {
        font-family: Garamond;
      }
      </style>
      #{body}
    </svg>
    """
  end

  def wrap_in_svg(body, view_box) do
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

  alias Decimal, as: D
  @doc "Range.t(), but with Decimals"
  def drange(start, stop, step \\ 1) do
    {:ok, start} = D.cast(start)
    {:ok, stop} = D.cast(stop)
    {:ok, step} = D.cast(step)

    start
    |> Stream.iterate(fn val ->
      D.add(val, step)
    end)
    |> Enum.take_while(fn val -> !D.gt?(val, stop) end)
  end
end
