defmodule PerceptronApparatus.Rings.SlideRule do
  @moduledoc """
  Documentation for `SlideRule`.
  """
  alias Decimal, as: D

  defstruct [:width, :rule, :context]

  @type t :: %__MODULE__{
          # rule consists of {outer_rule, inner_rule}
          # each rule is a list of {value, theta} tuples
          rule: {[{Decimal.t() | nil, float()}], [{Decimal.t() | nil, float()}]},
          # ring width (fixed for slide rules)
          width: float(),
          # drawing context: {outer_radius, layer_index}
          context: {float(), integer()}
        }

  def new(rule) do
    %__MODULE__{width: 20.0, rule: rule}
  end

  # each rule should be a list of tuples {theta, label}, where label can be nil (for a minor tick with no label)
  def render(radius, {outer_rule, inner_rule}) do
    outer_ticks =
      outer_rule
      |> Enum.map(fn {theta, val} ->
        %{label: label, tick_length: tick_length, stroke_width: stroke_width} =
          ticks_and_labels(val)

        """
          <g transform="rotate(#{-theta})" transform-origin="0 0">
            <text class="top etch" x="0" y="#{radius + 2 * tick_length}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="auto">#{label}</text>
            <line class="top etch" x1="0" y1="#{radius}" x2="0" y2="#{radius + tick_length}" stroke_width="#{stroke_width}" />
          </g>
        """
      end)

    inner_ticks =
      inner_rule
      |> Enum.map(fn {theta, label} ->
        """
          <g transform="rotate(#{-theta})" transform-origin="0 0">
            <text x="0" y="#{radius - 20}" style="font-size: 12px;" fill="black" stroke="none" text-anchor="middle" dominant-baseline="hanging">#{label}</text>
            <line x1="0" y1="#{if label != "", do: radius - 8, else: radius - 4}" x2="0" y2="#{radius}" />
          </g>
        """
      end)

    Enum.join([
      outer_ticks,
      ~s|<circle class="top full" cx="0" cy="0" r="#{radius}" />|,
      inner_ticks
    ])
  end

  # no params for log_rule, since it only really makes sense for rules which range from 1.0 - 9.9
  def log_rule do
    10..99
    |> Enum.map(fn x -> D.new(1, x, -1) end)
    |> Enum.map(fn val ->
      theta =
        (Math.log(D.to_float(val)) - Math.log(1.0)) / (Math.log(10.0) - Math.log(1.0)) * 360.0

      cond do
        # this is all much more verbose than before, because Decimal
        D.lt?(val, 2) ->
          {val, theta}

        val |> D.rem(D.new(1, 2, -1)) |> D.equal?(0) && !D.gt?(val, 5) ->
          {val, theta}

        val |> D.rem(D.new(1, 5, -1)) |> D.equal?(0) && D.gt?(val, 5) ->
          {val, theta}

        true ->
          {nil, theta}
      end
    end)
  end

  def relu_rule(max_value, delta_value) do
    # convert args to Decimal
    {:ok, max_value} = D.cast(max_value)
    {:ok, delta_value} = D.cast(delta_value)
    delta_theta = D.div(delta_value, max_value) |> D.mult(180)

    outer_positive =
      {D.new(0), D.new(0)}
      |> Stream.iterate(fn {val, theta} ->
        {D.add(val, delta_value), D.add(theta, delta_theta)}
      end)
      |> Enum.take_while(fn {val, _theta} -> D.lt?(val, max_value) end)

    outer_negative =
      outer_positive
      # remove first + last elements because that would overlap with the positive rule
      |> List.delete_at(0)
      |> List.delete_at(-1)
      |> Enum.map(fn {val, theta} -> {D.mult(val, -1), D.mult(theta, -1)} end)

    outer_rule = Enum.reverse(outer_negative) ++ outer_positive

    inner_rule =
      outer_rule
      |> Enum.map(fn {val, theta} ->
        if D.lt?(val, 0) do
          {D.new(0), theta}
        else
          {val, theta}
        end
      end)
      |> Enum.map(fn {val, theta} ->
        cond do
          D.integer?(val) -> {val, theta}
          true -> {nil, theta}
        end
      end)

    # reversal not strictly necessary, but nice to keep it ordered
    {outer_rule, inner_rule}
  end

  # this is a bit different this time - the (potentially) non-linear nature of the ticks/values means that
  # we rely on the rule to tell us when to have a label + major/minor tick, so this fun is pretty simple
  defp ticks_and_labels(val) do
    case val do
      nil ->
        %{label: nil, tick_length: 10, stroke_width: "0.5"}

      _ ->
        %{label: val |> D.normalize() |> D.to_string(), tick_length: 10, stroke_width: "1.0"}
    end
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.SlideRule do
  alias PerceptronApparatus.Rings.SlideRule

  def render(%SlideRule{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{rule: rule, context: {radius, _layer_index}} = ring

    SlideRule.render(radius, rule)
  end
end
