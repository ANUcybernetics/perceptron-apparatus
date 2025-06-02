# perceptron_apparatus/create_board.exs
# To run this script, navigate to the perceptron_apparatus directory
# and execute: mix run create_board.exs

IO.puts("Starting board creation process...")
IO.puts("This script will create a neural network board and generate an SVG file.")

IO.puts(
  "The SVG file will be saved in the 'svg/' directory, relative to where you run the script."
)

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

# Create the board first
IO.puts("Creating board...")

case PerceptronApparatus.create_board(size, n_input, n_hidden, n_output) do
  {:ok, board} ->
    IO.puts("Board created successfully with ID: #{board.id}")

    # Now generate the SVG file
    filename = "svg/board.svg"

    IO.puts("Generating SVG file...")

    case PerceptronApparatus.Board.write_svg(board, filename) do
      {:ok, _updated_board} ->
        IO.puts("")
        IO.puts("==================================================")
        IO.puts("  SUCCESS: Board created and SVG generated!  ")
        IO.puts("==================================================")
        IO.puts("SVG file has been saved to: #{filename}")
        IO.puts("==================================================")
        IO.puts("")

      {:error, changeset} ->
        IO.puts("")
        IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        IO.puts("  ERROR: Failed to generate SVG file.  ")
        IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        IO.puts("Details of the error:")
        IO.inspect(changeset, pretty: true, width: 80)
        IO.puts("---")
        IO.puts("Board was created but SVG generation failed.")
        IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        IO.puts("")
        # Exit with a non-zero status to indicate failure
        System.halt(1)
    end

  {:error, changeset} ->
    IO.puts("")
    IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    IO.puts("  ERROR: Failed to create the board.  ")
    IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    IO.puts("Details of the error:")
    IO.inspect(changeset, pretty: true, width: 80)
    IO.puts("---")
    IO.puts("Board creation failed. Please check the error messages above.")

    IO.puts(
      "Ensure your Ash domain and resources are correctly configured and migrations (if any) are run."
    )

    IO.puts("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    IO.puts("")
    # Exit with a non-zero status to indicate failure
    System.halt(1)
end
