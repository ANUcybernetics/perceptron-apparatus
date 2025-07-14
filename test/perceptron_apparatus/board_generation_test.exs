defmodule PerceptronApparatus.BoardGenerationTest do
  # File system operations, use async: false
  use ExUnit.Case, async: false

  alias PerceptronApparatus.Board

  # Define at module level for clarity
  @output_dir "svg/test"

  setup do
    # Ensure the svg directory is clean and exists before each test
    File.rm_rf!(@output_dir)
    File.mkdir_p!(@output_dir)

    # Define a cleanup function to run after each test
    on_exit(fn ->
      File.rm_rf!(@output_dir)
    end)

    :ok
  end

  describe "PerceptronApparatus.Board generation" do
    test "creates a board and generates SVG files via separate actions" do
      # Parameters for the Ash action
      params = %{
        size: 800.0,
        n_input: 3,
        n_hidden: 2,
        n_output: 1
      }

      # Execute the Ash action to create the board
      case PerceptronApparatus.create_board(params.size, params.n_input, params.n_hidden, params.n_output) do
        {:ok, board} ->
          # Now write the SVG file using the separate action
          full_filename = Path.join(@output_dir, "board_#{board.id}.svg")

          case PerceptronApparatus.write_svg(board, full_filename) do
            {:ok, _updated_board} ->
              # Verify that the output directory and SVG files were created
              assert File.exists?(@output_dir),
                     "Output directory '#{@output_dir}' was not created."

              # Check that the SVG file was actually created
              assert File.exists?(full_filename),
                     "Expected SVG file '#{full_filename}' was not created."

              # Verify the file is not empty
              {:ok, content} = File.read(full_filename)

              assert String.length(content) > 0,
                     "SVG file '#{full_filename}' is empty."

              # Verify it contains SVG content
              assert String.contains?(content, "<svg"),
                     "File '#{full_filename}' does not contain SVG content."

            {:error, changeset} ->
              flunk("SVG writing failed: #{inspect(changeset)}")
          end

        {:error, changeset} ->
          flunk("Board creation failed: #{inspect(changeset)}")
      end
    end

    test "creates a board with QR code data and renders it in the center" do
      qr_data = "Hello QR World Test"

      case PerceptronApparatus.create_board(800.0, 2, 3, 1, qr_data) do
        {:ok, board} ->
          # Verify QR data is stored
          assert board.qr_data == qr_data

          # Generate SVG content
          svg_content = Board.render(board)

          # Verify SVG content contains QR code elements
          assert String.contains?(svg_content, "class=\"qr-code\""),
                 "SVG content should contain QR code elements when qr_data is provided"

          # Write to file for visual inspection
          filename = Path.join(@output_dir, "board_with_qr_#{board.id}.svg")

          case PerceptronApparatus.write_svg(board, filename) do
            {:ok, _} ->
              assert File.exists?(filename),
                     "QR code SVG file should be created"

              {:ok, file_content} = File.read(filename)

              assert String.contains?(file_content, "class=\"qr-code\""),
                     "Written SVG file should contain QR code elements"

            {:error, error} ->
              flunk("Failed to write QR code SVG: #{inspect(error)}")
          end

        {:error, error} ->
          flunk("Failed to create board with QR data: #{inspect(error)}")
      end
    end

    test "creates a board without QR code data and renders without QR elements" do
      case PerceptronApparatus.create_board(800.0, 2, 3, 1) do
        {:ok, board} ->
          # Verify no QR data is stored
          assert is_nil(board.qr_data)

          # Generate SVG content
          svg_content = Board.render(board)

          # Verify SVG content does not contain QR code elements
          refute String.contains?(svg_content, "class=\"qr-code\""),
                 "SVG content should not contain QR code elements when no qr_data is provided"

          # Write to file for comparison
          filename = Path.join(@output_dir, "board_no_qr_#{board.id}.svg")

          case PerceptronApparatus.write_svg(board, filename) do
            {:ok, _} ->
              assert File.exists?(filename),
                     "SVG file without QR should be created"

              {:ok, file_content} = File.read(filename)

              refute String.contains?(file_content, "class=\"qr-code\""),
                     "Written SVG file should not contain QR code elements"

            {:error, error} ->
              flunk("Failed to write SVG without QR: #{inspect(error)}")
          end

        {:error, error} ->
          flunk("Failed to create board without QR data: #{inspect(error)}")
      end
    end

    test "handles invalid QR data gracefully" do
      # Test with very long string that might exceed QR code limits
      long_qr_data = String.duplicate("A", 3000)

      case PerceptronApparatus.create_board(800.0, 2, 3, 1, long_qr_data) do
        {:ok, board} ->
          # Even if QR creation fails, board should render without QR elements
          svg_content = Board.render(board)

          # Should still be valid SVG
          assert String.contains?(svg_content, "<svg"),
                 "Should still generate valid SVG even with invalid QR data"

        {:error, error} ->
          flunk("Board creation should not fail due to QR data issues: #{inspect(error)}")
      end
    end
  end
end
