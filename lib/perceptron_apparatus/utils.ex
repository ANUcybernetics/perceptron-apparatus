defmodule PerceptronApparatus.Utils do
  @moduledoc """
  Some handy utilities.
  """
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

  def write_cnc_files!(%PerceptronApparatus{} = apparatus, filename_prefix) do
    # this is a bit messy because of the nested list, but :shrug:
    cut_types = [:top, :bottom, :etch, [:etch, :heavy], :full, :slider]

    cut_types
    |> Enum.each(fn cut_type ->
      nodisplay_classes = cut_types -- List.wrap(cut_type)

      File.write!(
        "svg/#{filename_prefix}-#{cut_type}).svg",
        PerceptronApparatus.render(apparatus, nodisplay_classes)
      )
    end)
  end
end
