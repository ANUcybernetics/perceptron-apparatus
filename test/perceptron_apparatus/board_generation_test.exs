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
          full_filename = "svg/test/board_#{board.id}.svg"

          case Board.write_svg(board, full_filename) do
            {:ok, _updated_board} ->
              # Verify that the output directory and SVG files were created
              assert File.exists?(@output_dir),
                     "Output directory '#{@output_dir}' was not created."

              # Verify that the test subdirectory was created
              test_dir = Path.join([@output_dir, "test"])
              assert File.exists?(test_dir),
                     "Test subdirectory '#{test_dir}' was not created."

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
  end
end
