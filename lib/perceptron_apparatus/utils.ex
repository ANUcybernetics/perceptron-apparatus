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
