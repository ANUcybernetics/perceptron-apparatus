# perceptron_apparatus/create_board.exs
# To run this script, navigate to the perceptron_apparatus directory
# and execute: mix run create_board.exs

IO.puts("Starting board creation process...")
IO.puts("This script will create a neural network board and generate an SVG file.")
IO.puts("The SVG file will be saved in the 'svg/' directory, relative to where you run the script.")
IO.puts("---")

# Define board parameters
size = 1199.0
n_input = 36
n_hidden = 6
n_output = 10

IO.puts("Board Parameters:")
IO.puts("  Size: #{size}")
IO.puts("  Input Neurons (n_input): #{n_input}")
IO.puts("  Hidden Neurons (n_hidden): #{n_hidden}")
IO.puts("  Output Neurons (n_output): #{n_output}")
IO.puts("---")

# Attempt to create the board
# This will also trigger the SVG file generation via the after_action hook in Board.create
IO.puts("Creating board and generating SVG...")
case PerceptronApparatus.create_board(size, n_input, n_hidden, n_output) do
  {:ok, board} ->
    # The Board.create function's after_action hook (or the manual call to Utils.write_cnc_files!
    # within Board.create/4) should have created the svg directory and written the file.
    # The path is relative to the current working directory where the script is run.
    output_svg_path = "svg/board_#{board.id}.svg"

    IO.puts("")
    IO.puts("==================================================")
    IO.puts("  SUCCESS: Board created and SVG generated!  ")
    IO.puts("==================================================")
    IO.puts("Board ID: #{board.id}")
    IO.puts("SVG file has been saved to: #{output_svg_path}")
    IO.puts("---")
    IO.puts("You can now find the SVG file in the '#{File.cwd!()}/svg/' directory.")
    IO.puts("To view the SVG, open '#{output_svg_path}' in a web browser or SVG viewer.")
    IO.puts("==================================================")
    IO.puts("")

  {:error, changeset} ->
    IO.puts("")
    IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    IO.puts("  ERROR: Failed to create the board.  ")
    IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    IO.puts("Details of the error:")
    IO.inspect(changeset, pretty: true, width: 80)
    IO.puts("---")
    IO.puts("Board creation failed. Please check the error messages above.")
    IO.puts("Ensure your Ash domain and resources are correctly configured and migrations (if any) are run.")
    IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    IO.puts("")
    # Exit with a non-zero status to indicate failure
    System.halt(1)
end
