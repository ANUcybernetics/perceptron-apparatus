defmodule Mix.Tasks.Perceptron.Qr do
  @moduledoc """
  Generate standalone SVG file for the central piece (QR code or logo).

  ## Usage

      mix perceptron.qr [options]

  ## Options

    * `--qr` - QR code data (optional, defaults to Cybernetic Studio logo)
    * `--size` - Board size in mm (default: 1200.0, used to match apparatus dimensions)
    * `--file` - Output file path (default: svg/qr.svg)
    * `--print` - Generate print-ready SVG (white on black)
    * `--help` - Show this help message

  ## Examples

      # Create logo piece (default)
      mix perceptron.qr

      # Create QR code piece with data
      mix perceptron.qr --qr "https://example.com"

      # Save to specific file
      mix perceptron.qr --qr "https://example.com" --file /path/to/qr.svg

      # Generate print-ready version
      mix perceptron.qr --qr "https://example.com" --print
  """

  @shortdoc "Generate standalone SVG for central piece"

  use Mix.Task

  alias PerceptronApparatus.Utils
  import PerceptronApparatus.Utils

  @switches [
    qr: :string,
    size: :float,
    file: :string,
    print: :boolean,
    help: :boolean
  ]

  @aliases [
    q: :qr,
    s: :size,
    f: :file
  ]

  @defaults [
    size: 1200.0,
    file: "svg/qr.svg"
  ]

  @impl Mix.Task
  def run(args) do
    Mix.Task.run("app.start")

    {opts, _, _} = OptionParser.parse(args, switches: @switches, aliases: @aliases)

    if opts[:help] do
      Mix.shell().info(@moduledoc)
      System.halt(0)
    end

    qr_data = opts[:qr]

    config = Keyword.merge(@defaults, opts)

    size = config[:size]
    filename = config[:file]
    print_mode = config[:print] || false

    output_dir = Path.dirname(filename)
    File.mkdir_p!(output_dir)

    Mix.shell().info("Creating central piece...")
    Mix.shell().info("Parameters:")
    if qr_data do
      Mix.shell().info("  QR data: #{qr_data}")
    else
      Mix.shell().info("  Content: Cybernetic Studio logo")
    end
    Mix.shell().info("  Board size: #{size}mm")
    if print_mode, do: Mix.shell().info("  Print mode: enabled")
    Mix.shell().info("  Output file: #{filename}")
    Mix.shell().info("")

    center_space = 150
    elements = if qr_data do
      render_qr_code(qr_data, center_space)
    else
      render_cybernetic_studio_logo(center_space)
    end

    padding = center_space * 0.05
    box_size = center_space * 0.4 + padding * 2
    view_box_size = box_size + 20
    view_box_offset = -view_box_size / 2

    view_box =
      "#{view_box_offset} #{view_box_offset} #{view_box_size} #{view_box_size}"

    svg_content = render_body_as_tree(elements, view_box, print_mode)

    case File.write(filename, svg_content) do
      :ok ->
        Mix.shell().info("")
        Mix.shell().info(String.duplicate("=", 60))
        Mix.shell().info("SUCCESS! QR code SVG generated at: #{filename}")
        Mix.shell().info(String.duplicate("=", 60))

      {:error, reason} ->
        Mix.shell().error("Failed to write file: #{inspect(reason)}")
        System.halt(1)
    end
  end

  defp get_neon_tubes_font_data do
    font_paths = [
      "/Users/ben/Library/Fonts/neontubes2.otf",
      "#{System.user_home()}/Library/Fonts/neontubes2.otf",
      "/Library/Fonts/neontubes2.otf",
      "/System/Library/Fonts/neontubes2.otf"
    ]

    font_path = Enum.find(font_paths, &File.exists?/1)

    if font_path do
      font_binary = File.read!(font_path)
      base64_font = Base.encode64(font_binary)

      """
      @font-face {
        font-family: "Neon Tubes 2";
        src: url(data:font/otf;base64,#{base64_font}) format("opentype");
      }
      """
    else
      """
      @font-face {
        font-family: "Neon Tubes 2";
        src: local("Neon Tubes 2");
      }
      """
    end
  end

  defp render_qr_code(data, center_space) do
    case QRCode.create(data, :medium) do
      {:ok, qr} ->
        padding = center_space * 0.05
        box_size = center_space * 0.4 + padding * 2
        box_offset = -box_size / 2
        corner_radius = box_size * 0.1

        x1 = box_offset
        y1 = box_offset
        x2 = box_offset + box_size
        y2 = box_offset + box_size
        r = corner_radius

        path_data =
          "M #{x1 + r},#{y1} " <>
            "L #{x2 - r},#{y1} " <>
            "Q #{x2},#{y1} #{x2},#{y1 + r} " <>
            "L #{x2},#{y2} " <>
            "L #{x1 + r},#{y2} " <>
            "Q #{x1},#{y2} #{x1},#{y2 - r} " <>
            "L #{x1},#{y1 + r} " <>
            "Q #{x1},#{y1} #{x1 + r},#{y1} " <>
            "Z"

        bounding_box =
          Utils.path_element([
            {"class", "full"},
            {"d", path_data},
            {"fill", "transparent"},
            {"stroke-width", "2"}
          ])

        qr_elements = render_qr_matrix(qr.matrix, center_space)

        [bounding_box | qr_elements]

      {:error, _} ->
        []
    end
  end

  defp render_qr_matrix(matrix, center_space) do
    matrix_size = length(matrix)
    qr_size = center_space * 0.4
    cell_size = qr_size / matrix_size

    offset = -qr_size / 2

    matrix
    |> Enum.with_index()
    |> Enum.flat_map(fn {row, y} ->
      row
      |> Enum.with_index()
      |> Enum.filter(fn {cell, _x} -> cell == 1 end)
      |> Enum.map(fn {_cell, x} ->
        Utils.rect_element([
          {"class", "qr-code"},
          {"x", to_string(offset + x * cell_size)},
          {"y", to_string(offset + y * cell_size)},
          {"width", to_string(cell_size)},
          {"height", to_string(cell_size)},
          {"fill", "#000000"}
        ])
      end)
    end)
  end

  defp render_cybernetic_studio_logo(center_space) do
    padding = center_space * 0.05
    box_size = center_space * 0.4 + padding * 2
    box_offset = -box_size / 2
    corner_radius = box_size * 0.1

    x1 = box_offset
    y1 = box_offset
    x2 = box_offset + box_size
    y2 = box_offset + box_size
    r = corner_radius

    path_data =
      "M #{x1 + r},#{y1} " <>
        "L #{x2 - r},#{y1} " <>
        "Q #{x2},#{y1} #{x2},#{y1 + r} " <>
        "L #{x2},#{y2} " <>
        "L #{x1 + r},#{y2} " <>
        "Q #{x1},#{y2} #{x1},#{y2 - r} " <>
        "L #{x1},#{y1 + r} " <>
        "Q #{x1},#{y1} #{x1 + r},#{y1} " <>
        "Z"

    bounding_box =
      Utils.path_element([
        {"class", "full"},
        {"d", path_data},
        {"fill", "transparent"},
        {"stroke-width", "2"}
      ])

    text_size = box_size * 0.13
    line_height = text_size * 1.2

    text_x_center = box_offset + box_size * 0.5
    cybernetic_half_width = 10 * text_size * 0.3
    text_x_right = text_x_center + cybernetic_half_width
    text_y_first = box_offset + box_size * 0.5 - line_height / 2
    text_y_second = text_y_first + line_height

    cybernetic_text =
      Utils.text_element("Cybernetic", [
        {"class", "logo"},
        {"x", to_string(text_x_center)},
        {"y", to_string(text_y_first)},
        {"style", "font-family: 'Neon Tubes 2'; font-size: #{text_size}px; fill: black; stroke: none;"},
        {"text-anchor", "middle"},
        {"dominant-baseline", "middle"}
      ])

    studio_text =
      Utils.text_element("Studio", [
        {"class", "logo"},
        {"x", to_string(text_x_right)},
        {"y", to_string(text_y_second)},
        {"style", "font-family: 'Neon Tubes 2'; font-size: #{text_size}px; fill: black; stroke: none;"},
        {"text-anchor", "end"},
        {"dominant-baseline", "middle"}
      ])

    [bounding_box, cybernetic_text, studio_text]
  end

  defp render_body_as_tree(elements, view_box, print_mode) do
    style_content = build_style_content(print_mode)
    style_elem = style_element(style_content)

    illustrator_attrs = [
      {"xmlns:xlink", "http://www.w3.org/1999/xlink"},
      {"xml:space", "preserve"},
      {"style", "enable-background:new #{view_box};"}
    ]

    svg_root(view_box, [style_elem | List.flatten(elements)], illustrator_attrs)
    |> tree_to_html()
  end

  defp build_style_content(print_mode) do
    if print_mode do
      build_print_mode_styles()
    else
      build_default_styles()
    end
  end

  defp build_default_styles() do
    font_data = get_neon_tubes_font_data()

    """
    #{font_data}text {
      font-family: "Alegreya";
      font-size: 12px;
    }
    .full {
      stroke-width: 1;
      stroke: #6ab04c;
    }
    .qr-code {
      fill: #000000;
      stroke: none;
    }
    text.logo {
      fill: black;
      stroke: none;
    }
    """
  end

  defp build_print_mode_styles() do
    font_data = get_neon_tubes_font_data()

    """
    #{font_data}text {
      font-family: "Alegreya";
      font-size: 12px;
    }
    .full {
      stroke-width: 1;
      stroke: white;
      fill: none;
    }
    .qr-code {
      fill: white;
      stroke: none;
    }
    text.logo {
      fill: white;
      stroke: none;
    }
    """
  end
end
