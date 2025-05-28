defmodule PerceptronApparatus.Utils do
  @moduledoc """
  Some handy utilities.
  """

  @rad_in_deg 180 / :math.pi()
  def deg2rad(x) do
    x / @rad_in_deg
  end

  def wrap_in_svg(body) do
    """
    <svg stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      svg {
        font-family: Helvetica;
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
        font-family: Helvetica;
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

  def new_rule(start, stop, step, major_step) do
    {:ok, major_step} = D.cast(major_step)

    drange(start, stop, step)
    |> Enum.map(fn val ->
      cond do
        val |> D.rem(major_step) |> D.equal?(0) ->
          {val |> D.normalize() |> D.to_string(:normal), val}

        true ->
          {nil, val}
      end
    end)
  end

  def write_cnc_files!(apparatus, dir, filename_prefix) do
    File.write!("#{dir}/svg/#{filename_prefix}.svg", PerceptronApparatus.Board.render(apparatus))

    # this is a bit messy because of the nested list, but :shrug:
    cut_selectors = [".top.slider", ".bottom", ".top.etch", ".top.etch.heavy", ".top.full"]

    cut_selectors
    |> Enum.each(fn cut ->
      nodisplay_selectors = cut_selectors -- [cut]

      File.write!(
        "#{dir}/svg/#{filename_prefix}#{String.replace(cut, ".", "-")}.svg",
        PerceptronApparatus.Board.render(apparatus, nodisplay_selectors)
      )
    end)
  end
end
