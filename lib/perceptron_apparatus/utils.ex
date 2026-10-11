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
      #{body}
    </svg>
    """
  end

  def wrap_in_svg(body, view_box) do
    """
    <svg viewBox="#{view_box}" stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
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

  @weight_min 0.02
  @weight_max 5.0
  @weight_zero_gap 0.12
  @weight_labelled ["0.02", "0.05", "0.1", "0.2", "0.5", "1", "2", "5"]

  @doc """
  The rule for a weight slider: zero, then a tick at every leading digit from
  the smallest settable magnitude to the largest, labelled on the 1-2-5 series.

  Weight sliders carry magnitude on a log scale; sign is shown by the slider
  marker, not by position.
  """
  def weight_rule do
    ticks =
      for exponent <- -2..0,
          digit <- 1..9,
          val = D.new(1, digit, exponent),
          D.to_float(val) >= @weight_min and D.to_float(val) <= @weight_max do
        label = val |> D.normalize() |> D.to_string(:normal)
        {if(label in @weight_labelled, do: label), val}
      end

    [{"0", D.new(0)} | ticks]
  end

  @doc """
  Fraction of a weight slot between its zero end (0.0) and the largest
  magnitude (1.0). Magnitudes too small to set park at zero.
  """
  def weight_scale_fraction(value) do
    magnitude = min(abs(value), @weight_max)

    if magnitude < @weight_min do
      0.0
    else
      log_fraction = :math.log(magnitude / @weight_min) / :math.log(@weight_max / @weight_min)
      @weight_zero_gap + (1 - @weight_zero_gap) * log_fraction
    end
  end

  # LazyHTML helper functions for SVG generation

  @doc """
  Creates a generic SVG element as a LazyHTML tree node.
  """
  def svg_element(tag, attributes \\ [], children \\ []) do
    {tag, attributes, children}
  end

  @doc """
  Creates a line element with the given attributes.
  """
  def line_element(attributes) do
    {"line", attributes, []}
  end

  @doc """
  Creates a circle element with the given attributes.
  """
  def circle_element(attributes) do
    {"circle", attributes, []}
  end

  @doc """
  Creates a rectangle element with the given attributes.
  """
  def rect_element(attributes) do
    {"rect", attributes, []}
  end

  @doc """
  Creates a text element with content and attributes.
  """
  def text_element(content, attributes \\ []) do
    {"text", attributes, [content]}
  end

  @doc """
  Creates a path element with the given attributes.
  """
  def path_element(attributes) do
    {"path", attributes, []}
  end

  @doc """
  Creates a group (g) element with children and attributes.
  """
  def group_element(children, attributes \\ []) do
    {"g", attributes, children}
  end

  @doc """
  Creates a style element with CSS content.
  """
  def style_element(css_content) do
    {"style", [], [css_content]}
  end

  @doc """
  Converts a LazyHTML tree to an HTML string.
  """
  def tree_to_html(tree) when is_list(tree) do
    tree
    |> LazyHTML.from_tree()
    |> LazyHTML.to_html()
    |> String.replace("viewbox=", "viewBox=")
  end

  def tree_to_html(tree_node) do
    [tree_node]
    |> LazyHTML.from_tree()
    |> LazyHTML.to_html()
    |> String.replace("viewbox=", "viewBox=")
  end

  @doc """
  Creates an SVG root element with viewBox and other standard attributes.
  """
  def svg_root(view_box, children, extra_attributes \\ []) do
    base_attributes = [
      {"viewBox", view_box},
      {"stroke", "black"},
      {"fill", "transparent"},
      {"stroke-width", "1"},
      {"xmlns", "http://www.w3.org/2000/svg"}
    ]

    attributes = base_attributes ++ extra_attributes
    {"svg", attributes, children}
  end
end
