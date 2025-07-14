defmodule PerceptronApparatus.Board.Actions.WriteSvg do
  @moduledoc """
  Generic action to write a board's SVG representation to a file.
  """
  use Ash.Resource.Actions.Implementation

  @impl true
  def run(input, _opts, _context) do
    board = input.arguments.board
    filename = input.arguments.filename

    # Ensure parent directory exists
    output_dir = Path.dirname(filename)
    File.mkdir_p!(output_dir)

    # Write the SVG file
    svg_content = PerceptronApparatus.Board.render(board)
    File.write!(filename, svg_content)

    {:ok, %{filename: filename, board_id: board.id}}
  end
end