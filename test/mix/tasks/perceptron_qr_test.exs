defmodule Mix.Tasks.Perceptron.QrTest do
  use ExUnit.Case, async: false

  @moduletag :svg

  @output_dir "svg/test/qr"

  setup do
    File.rm_rf!(@output_dir)
    File.mkdir_p!(@output_dir)

    on_exit(fn ->
      File.rm_rf!(@output_dir)
    end)

    :ok
  end

  describe "mix perceptron.qr" do
    test "generates logo SVG by default (no QR data)" do
      filename = Path.join(@output_dir, "logo_default.svg")

      Mix.Tasks.Perceptron.Qr.run(["--file", filename])

      assert File.exists?(filename)

      {:ok, content} = File.read(filename)

      assert String.contains?(content, "<svg")
      assert String.contains?(content, "class=\"logo\"")
      assert String.contains?(content, "Cybernetic")
      assert String.contains?(content, "Studio")
      assert String.contains?(content, "Neon Tubes 2")
      refute String.contains?(content, "class=\"qr-code\"")
    end

    test "generates QR code SVG when QR data is provided" do
      filename = Path.join(@output_dir, "qr_with_data.svg")

      Mix.Tasks.Perceptron.Qr.run(["--qr", "https://example.com", "--file", filename])

      assert File.exists?(filename)

      {:ok, content} = File.read(filename)

      assert String.contains?(content, "<svg")
      assert String.contains?(content, "class=\"qr-code\"")
      refute String.contains?(content, "class=\"logo\"")
      refute String.contains?(content, "Cybernetic")
    end

    test "generates print-ready SVG with white-on-black styling" do
      filename = Path.join(@output_dir, "logo_print.svg")

      Mix.Tasks.Perceptron.Qr.run(["--file", filename, "--print"])

      assert File.exists?(filename)

      {:ok, content} = File.read(filename)

      assert String.contains?(content, "stroke: white")
      assert String.contains?(content, "fill: white")
      refute String.contains?(content, "stroke: #6ab04c")
    end

    test "generates default SVG with colour styling when print mode is false" do
      filename = Path.join(@output_dir, "logo_colour.svg")

      Mix.Tasks.Perceptron.Qr.run(["--file", filename])

      assert File.exists?(filename)

      {:ok, content} = File.read(filename)

      assert String.contains?(content, "stroke: #6ab04c")
      refute String.contains?(content, "stroke: white")
    end

    test "uses default output file path when not specified" do
      default_file = "svg/qr.svg"
      File.rm_rf!(default_file)

      on_exit(fn ->
        File.rm_rf!(default_file)
      end)

      Mix.Tasks.Perceptron.Qr.run([])

      assert File.exists?(default_file)
    end

    test "generates QR code SVG in print mode" do
      filename = Path.join(@output_dir, "qr_print.svg")

      Mix.Tasks.Perceptron.Qr.run([
        "--qr",
        "https://example.com",
        "--file",
        filename,
        "--print"
      ])

      assert File.exists?(filename)

      {:ok, content} = File.read(filename)

      assert String.contains?(content, "class=\"qr-code\"")
      assert String.contains?(content, "fill: white")
      assert String.contains?(content, "stroke: white")
    end

    test "creates output directory if it does not exist" do
      nested_dir = Path.join(@output_dir, "nested/deep/path")
      filename = Path.join(nested_dir, "test.svg")

      Mix.Tasks.Perceptron.Qr.run(["--file", filename])

      assert File.exists?(filename)
    end

    test "handles very long QR data" do
      filename = Path.join(@output_dir, "qr_long.svg")
      long_data = String.duplicate("A", 3000)

      Mix.Tasks.Perceptron.Qr.run(["--qr", long_data, "--file", filename])

      assert File.exists?(filename)

      {:ok, content} = File.read(filename)

      assert String.contains?(content, "<svg")
    end

    test "SVG dimensions match the expected viewBox size" do
      filename = Path.join(@output_dir, "logo_dimensions.svg")

      Mix.Tasks.Perceptron.Qr.run(["--file", filename])

      {:ok, content} = File.read(filename)

      center_space = 150
      padding = center_space * 0.05
      box_size = center_space * 0.4 + padding * 2
      view_box_size = box_size + 20
      view_box_offset = -view_box_size / 2

      expected_viewbox = "#{view_box_offset} #{view_box_offset} #{view_box_size} #{view_box_size}"

      assert String.contains?(content, expected_viewbox)
    end

    test "logo and QR code SVGs have identical bounding box dimensions" do
      logo_file = Path.join(@output_dir, "logo_bbox.svg")
      qr_file = Path.join(@output_dir, "qr_bbox.svg")

      Mix.Tasks.Perceptron.Qr.run(["--file", logo_file])
      Mix.Tasks.Perceptron.Qr.run(["--qr", "test", "--file", qr_file])

      {:ok, logo_content} = File.read(logo_file)
      {:ok, qr_content} = File.read(qr_file)

      logo_viewbox = extract_viewbox(logo_content)
      qr_viewbox = extract_viewbox(qr_content)

      assert logo_viewbox == qr_viewbox
    end
  end

  defp extract_viewbox(svg_content) do
    case Regex.run(~r/viewBox="([^"]+)"/, svg_content) do
      [_, viewbox] -> viewbox
      _ -> nil
    end
  end
end
