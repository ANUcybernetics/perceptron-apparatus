defmodule PerceptronApparatus.BoardGenerationTest do
  # File system operations, use async: false
  use ExUnit.Case, async: false

  alias PerceptronApparatus.Board

  # Define at module level for clarity
  @output_dir "svg"

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
        size: 250.0,
        n_input: 3,
        n_hidden: 2,
        n_output: 1
      }

      # Execute the Ash action to create the board
      case Board.create(params.size, params.n_input, params.n_hidden, params.n_output) do
        {:ok, board} ->
          # Now write the SVG file using the separate action
          filename_base = "board_#{board.id}"

          case Board.write_svg(board, filename_base) do
            {:ok, _updated_board} ->
              # Verify that the output directory and SVG files were created
              assert File.exists?(@output_dir), "Output directory '#{@output_dir}' was not created."

              svg_files =
                case File.ls(@output_dir) do
                  {:ok, files} ->
                    files

                  {:error, reason} ->
                    flunk("Failed to list files in '#{@output_dir}': #{inspect(reason)}")
                end

              # 1. Check for the main board SVG file (e.g., board_<uuid>.svg)
              # The UUID part means we need to use a pattern.
              # With direct Ash call, we know the filename_base.
              main_board_file_name = filename_base <> ".svg"

              assert Enum.member?(svg_files, main_board_file_name),
                     "Expected main board SVG file '#{main_board_file_name}' not found. Files: #{inspect(svg_files)}"

              # 2. Verify the total number of expected files.
              # This should be 1 (main board file) only.
              total_expected_files = 1

              assert length(svg_files) == total_expected_files,
                     "Expected #{total_expected_files} total SVG file, but found #{length(svg_files)}. Files: #{inspect(svg_files)}"

            {:error, changeset} ->
              flunk("SVG writing failed: #{inspect(changeset)}")
          end

        {:error, changeset} ->
          flunk("Board creation failed: #{inspect(changeset)}")
      end
    end
  end
end
