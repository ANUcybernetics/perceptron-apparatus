defmodule PerceptronApparatus.Board do
  @moduledoc """
  A perceptron apparatus board that automatically creates the required ring sequence
  for a neural network with specified input, hidden, and output dimensions.
  """
  use Ash.Resource,
    otp_app: :perceptron_apparatus,
    domain: PerceptronApparatus

  alias PerceptronApparatus.{AzimuthalRing, RadialRing, RuleRing, Renderable, Utils}
  import PerceptronApparatus.Utils

  actions do
    defaults [:read]

    create :create do
      accept [:size, :n_input, :n_hidden, :n_output, :qr_data]

      change fn changeset, _context ->
        # Get the parameters
        size = Ash.Changeset.get_attribute(changeset, :size)
        n_input = Ash.Changeset.get_attribute(changeset, :n_input)
        n_hidden = Ash.Changeset.get_attribute(changeset, :n_hidden)
        n_output = Ash.Changeset.get_attribute(changeset, :n_output)

        # Create the ring sequence
        rings = create_ring_sequence(n_input, n_hidden, n_output)

        # Set the rings on the changeset
        Ash.Changeset.change_attribute(changeset, :rings, rings)
      end
    end

    action :write_svg do
      argument :filename, :string, allow_nil?: false

      run fn input, _context ->
        filename = input.arguments.filename
        board_resource = input.context.private.actor

        # Extract directory and filename parts
        output_dir = Path.dirname(filename)
        base_filename = Path.basename(filename)

        # Ensure parent directory exists
        File.mkdir_p!(output_dir)

        File.write!(filename, PerceptronApparatus.Board.render(board_resource))

        :ok
      end
    end

    update :add_ring do
      accept [:rings]
    end

    read :validate do
      prepare fn query, _context ->
        query
      end
    end
  end

  attributes do
    uuid_primary_key :id
    attribute :size, :float, allow_nil?: false
    attribute :n_input, :integer, allow_nil?: false
    attribute :n_hidden, :integer, allow_nil?: false
    attribute :n_output, :integer, allow_nil?: false
    attribute :qr_data, :string, allow_nil?: true
    attribute :rings, :term, default: []
  end

  @doc """
  Creates a new Board resource with the given parameters and writes SVG files.
  This function manually implements the code interface for `:create` to ensure
  file writing occurs after successful resource creation.
  """
  def create(size, n_input, n_hidden, n_output, qr_data \\ nil) do
    input = %{
      size: size,
      n_input: n_input,
      n_hidden: n_hidden,
      n_output: n_output,
      qr_data: qr_data
    }

    # Create a changeset for the action
    changeset = Ash.Changeset.for_create(__MODULE__, :create, input)

    # Execute the Ash action
    Ash.create(changeset)
  end

  def write_svg(board, filename) do
    # Execute the generic action
    input =
      Ash.ActionInput.for_action(__MODULE__, :write_svg, %{filename: filename}, actor: board)

    case Ash.run_action(input) do
      :ok -> {:ok, board}
      {:error, error} -> {:error, error}
    end
  end

  @doc """
  Creates the standard ring sequence for a perceptron apparatus.
  From outside to inside:
  1. Log ring
  2. ReLU ring (NOTE: currently not using this ring)
  3. Input azimuthal ring (n_input sliders)
  4. Weight1 radial ring (n_hidden groups x n_input sliders per group)
  5. Hidden azimuthal ring (n_hidden sliders)
  6. Weight2 radial ring (n_output groups x n_hidden sliders per group)
  7. Output azimuthal ring (n_output sliders)
  """
  def create_ring_sequence(n_input, n_hidden, n_output) do
    [
      # Log ring
      create_log_ring(),

      # ReLU ring (NOTE: currently not using this ring)
      # create_relu_ring(),

      # Input azimuthal ring
      create_input_ring(n_input),

      # Weight1 radial ring (input -> hidden)
      create_weight_ring(n_hidden, n_input),

      # Hidden azimuthal ring
      create_hidden_ring(n_hidden),

      # Weight2 radial ring (hidden -> output)
      create_weight_ring(n_output, n_hidden),

      # Output azimuthal ring
      create_output_ring(n_output)
    ]
  end

  defp create_log_ring do
    {:ok, ring} =
      Ash.Changeset.for_create(RuleRing, :new, %{rule: RuleRing.log_rule(), width: 30.0})
      |> Ash.create()

    ring
  end

  defp create_input_ring(n_input) do
    rule = Utils.new_rule(0, 1, 0.1, 0.5)
    shape = %{sliders: n_input}

    {:ok, ring} =
      Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 10.0})
      |> Ash.create()

    ring
  end

  defp create_weight_ring(n_groups, n_sliders_per_group) do
    rule = Utils.new_rule(-10, 10, 2, 10)
    shape = %{groups: n_groups, sliders_per_group: n_sliders_per_group}

    {:ok, ring} =
      Ash.Changeset.for_create(RadialRing, :new, %{shape: shape, rule: rule, width: 25.0})
      |> Ash.create()

    ring
  end

  defp create_hidden_ring(n_hidden) do
    rule = Utils.new_rule(0, 10, 1, 5)
    shape = %{sliders: n_hidden}

    {:ok, ring} =
      Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 10.0})
      |> Ash.create()

    ring
  end

  defp create_output_ring(n_output) do
    rule = Utils.new_rule(0, 1, 0.1, 0.5)
    shape = %{sliders: n_output}

    {:ok, ring} =
      Ash.Changeset.for_create(AzimuthalRing, :new, %{shape: shape, rule: rule, width: 10.0})
      |> Ash.create()

    ring
  end

  def validate!(apparatus) do
    Enum.each(apparatus.rings, fn ring ->
      case ring do
        %AzimuthalRing{} -> :ok
        %RadialRing{} -> :ok
        %RuleRing{} -> :ok
        _ -> raise "Invalid ring type"
      end
    end)
  end

  def render(apparatus) do
    %{size: size, rings: rings} = apparatus

    radius = size / 2
    radial_padding = 30
    center_space = 150
    svg_padding = 10

    # Calculate optimal ring widths with automatic spacing
    rings_with_widths = calculate_ring_widths(rings, radius, radial_padding, center_space)

    view_box =
      "-#{size / 2 + svg_padding} -#{size / 2 + svg_padding} #{size + 2 * svg_padding} #{size + 2 * svg_padding}"

    # Add the "board edge" circle
    board_edge =
      circle_element([
        {"class", "full"},
        {"cx", "0"},
        {"cy", "0"},
        {"r", to_string(radius)},
        {"stroke-width", "2"}
      ])

    {_, _, ring_elements} =
      rings_with_widths
      |> Enum.with_index()
      |> Enum.reduce(
        {radius - radial_padding, 1, []},
        fn {{ring, ring_width}, ring_index}, {current_radius, idx, elements_acc} ->
          # Determine if this should have a bottom channel (consecutive RuleRings)
          bottom_channel? =
            ring_index < length(rings_with_widths) - 1 &&
              match?(%RuleRing{}, ring) &&
              match?(%RuleRing{}, elem(Enum.at(rings_with_widths, ring_index + 1), 0))

          # Set context for the ring
          {:ok, ring_with_context} =
            ring
            |> Ash.Changeset.for_update(:set_context, %{
              context: %{
                radius: current_radius,
                layer_index: idx,
                ring_width: ring_width,
                outer_radius: current_radius,
                inner_radius: current_radius - ring_width
              }
            })
            |> Ash.update()

          # Create elements for this ring layer
          debug_outer =
            circle_element([
              {"class", "debug"},
              {"cx", "0"},
              {"cy", "0"},
              {"r", to_string(current_radius)},
              {"stroke-width", "1"}
            ])

          bottom_channel_elem =
            if bottom_channel? do
              bottom_rotating_channel_element(
                current_radius - ring_width - radial_padding / 2,
                2 * ring_width + 10
              )
            else
              nil
            end

          # Get ring content directly as tree structure
          ring_tree = Renderable.render(ring_with_context)

          debug_inner =
            circle_element([
              {"class", "debug"},
              {"cx", "0"},
              {"cy", "0"},
              {"r", to_string(current_radius - ring_width)},
              {"stroke-width", "1"}
            ])

          new_elements =
            ([debug_outer, bottom_channel_elem] ++ List.wrap(ring_tree) ++ [debug_inner])
            |> Enum.reject(&is_nil/1)
            |> List.flatten()

          {
            current_radius - ring_width - radial_padding,
            next_layer_index(ring, idx),
            elements_acc ++ new_elements
          }
        end
      )

    # Add QR code in center if qr_data is present
    qr_elements =
      if apparatus.qr_data do
        render_qr_code(apparatus.qr_data, center_space)
      else
        []
      end

    # Add fastener rings
    fastener_elements =
      create_fastener_rings(rings_with_widths, radius, radial_padding, center_space / 2)

    all_elements = [board_edge] ++ ring_elements ++ qr_elements ++ fastener_elements

    render_body_as_tree(all_elements, view_box)
  end

  defp calculate_ring_widths(rings, radius, radial_padding, center_space) do
    # Identify ring types
    radial_rings = Enum.filter(rings, &match?(%RadialRing{}, &1))
    fixed_rings = Enum.reject(rings, &match?(%RadialRing{}, &1))

    # Calculate fixed space usage
    fixed_widths_total = Enum.sum(Enum.map(fixed_rings, & &1.width))

    # Calculate padding: we need (n-1) gaps between n rings
    padding_total = radial_padding * (length(rings) - 1)

    # Calculate available space for radial rings
    available_for_radial = radius - center_space - fixed_widths_total - padding_total
    radial_count = length(radial_rings)

    # Ensure we have positive space available
    available_for_radial = max(available_for_radial, 0)

    # Distribute space evenly among radial rings
    radial_width = if radial_count > 0, do: available_for_radial / radial_count, else: 0

    # Map rings to their calculated widths
    Enum.map(rings, fn ring ->
      width =
        case ring do
          %RadialRing{} -> radial_width
          _ -> ring.width
        end

      {ring, width}
    end)
  end

  defp render_body_as_tree(elements, view_box) do
    style_content = build_style_content()
    style_elem = style_element(style_content)

    svg_root(view_box, [style_elem | List.flatten(elements)])
    |> tree_to_html()
  end

  defp build_style_content() do
    base_styles = """
    text {
      font-family: "Libertinus Sans";
      font-size: 12px;
    }
    .full {
      stroke-width: 1;
      stroke: #6ab04c;
    }
    .slider {
      stroke: #f0932b;
    }
    .top.slider {
      stroke-width: 3;
    }
    .bottom.slider {
      stroke-width: 8;
      opacity: 0.3;
    }
    .bottom.rotating {
      stroke: #f0932b;
      opacity: 0.3;
    }
    .etch {
      stroke-width: 0.5;
      stroke: black;
    }
    .etch.heavy {
      stroke-width: 1.5;
    }
    text {
      fill: black;
      stroke: none;
    }
    text.indices{
      font-size: 8px;
    }
    .debug {
      display: none;
      stroke: red;
      fill: transparent;
    }
    .qr-code {
      fill: #000000;
    }
    .fastener {
      fill: red;
      stroke: none;
    }
    """

    base_styles
  end

  defp next_layer_index(%RuleRing{}, idx), do: idx
  defp next_layer_index(_ring, idx), do: idx + 1

  defp bottom_rotating_channel_element(radius, width) do
    circle_element([
      {"class", "bottom rotating"},
      {"cx", "0"},
      {"cy", "0"},
      {"r", to_string(radius)},
      {"stroke-width", to_string(width)}
    ])
  end

  defp render_qr_code(data, center_space) do
    case QRCode.create(data) do
      {:ok, qr} ->
        # Create bounding box with padding
        padding = center_space * 0.05
        box_size = center_space * 0.8 + padding * 2
        box_offset = -box_size / 2
        corner_radius = box_size * 0.1

        # Create path for rectangle with three rounded corners (bottom-right non-rounded)
        x1 = box_offset
        y1 = box_offset
        x2 = box_offset + box_size
        y2 = box_offset + box_size
        r = corner_radius

        path_data = "M #{x1 + r},#{y1} " <>
                    "L #{x2 - r},#{y1} " <>
                    "Q #{x2},#{y1} #{x2},#{y1 + r} " <>
                    "L #{x2},#{y2} " <>
                    "L #{x1 + r},#{y2} " <>
                    "Q #{x1},#{y2} #{x1},#{y2 - r} " <>
                    "L #{x1},#{y1 + r} " <>
                    "Q #{x1},#{y1} #{x1 + r},#{y1} " <>
                    "Z"

        bounding_box = Utils.path_element([
          {"class", "full"},
          {"d", path_data},
          {"fill", "white"},
          {"stroke-width", "2"}
        ])

        # Use the QR matrix directly
        qr_elements = render_qr_matrix(qr.matrix, center_space)
        
        [bounding_box | qr_elements]

      {:error, _} ->
        []
    end
  end

  defp create_fastener_rings(rings_with_widths, radius, radial_padding, center_space) do
    # Calculate ring positions (same logic as in render function)
    {_, _, fastener_rings} =
      rings_with_widths
      |> Enum.with_index()
      |> Enum.reduce(
        {radius - radial_padding, 1, []},
        fn {{ring, ring_width}, ring_index}, {current_radius, idx, fasteners_acc} ->
          # Check if this is an azimuthal/radial ring pair boundary
          current_is_azimuthal = match?(%AzimuthalRing{}, ring)

          next_ring =
            if ring_index < length(rings_with_widths) - 1 do
              elem(Enum.at(rings_with_widths, ring_index + 1), 0)
            else
              nil
            end

          next_is_radial = match?(%RadialRing{}, next_ring)

          # Add fasteners between azimuthal and radial rings
          new_fasteners =
            if current_is_azimuthal && next_is_radial do
              # Place fasteners in the gap between rings
              fastener_radius = current_radius - ring_width - radial_padding / 2
              add_fasteners(fastener_radius, 6)
            else
              []
            end

          {
            current_radius - ring_width - radial_padding,
            next_layer_index(ring, idx),
            fasteners_acc ++ new_fasteners
          }
        end
      )

    # Add 3 fasteners underneath QR code
    qr_fasteners = add_fasteners(center_space * 0.6, 3)

    fastener_rings ++ qr_fasteners
  end

  defp render_qr_matrix(matrix, center_space) do
    # Calculate QR code dimensions
    matrix_size = length(matrix)
    # Use 80% of center space
    qr_size = center_space * 0.8
    cell_size = qr_size / matrix_size

    # Calculate offset to center the QR code
    offset = -qr_size / 2

    # Convert matrix to rectangles
    matrix
    |> Enum.with_index()
    |> Enum.flat_map(fn {row, y} ->
      row
      |> Enum.with_index()
      # Only render filled cells
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

  @doc """
  Creates n evenly spaced fastener holes (circles) at radius r.
  """
  def add_fasteners(r, n) do
    angle_step = 2 * :math.pi() / n

    0..(n - 1)
    |> Enum.map(fn i ->
      angle = i * angle_step
      x = r * :math.cos(angle)
      y = r * :math.sin(angle)

      circle_element([
        {"class", "fastener"},
        {"cx", to_string(x)},
        {"cy", to_string(y)},
        {"r", "3"},
        {"fill", "white"},
        {"stroke", "black"},
        {"stroke-width", "1"}
      ])
    end)
  end
end
