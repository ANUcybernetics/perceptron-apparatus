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
    %__MODULE__{width: 50.0, rule: rule}
  end

  # each rule should be a list of tuples {theta, label}, where label can be nil (for a minor tick with no label)
  def render(radius, {outer_rule, inner_rule}) do
    tick_length = 10

    outer_ticks =
      outer_rule
      |> Enum.map(fn {label, theta} ->
        """
          <g transform="rotate(#{-theta})" transform-origin="0 0">
            <text class="top etch" x="0" y="#{radius + 2.5 * tick_length}" text-anchor="middle" dominant-baseline="auto">#{label}</text>
            <line class="top etch #{label && "heavy"}" x1="0" y1="#{radius}" x2="0" y2="#{radius + tick_length}" />
          </g>
        """
      end)

    inner_ticks =
      inner_rule
      |> Enum.map(fn {label, theta} ->
        """
          <g transform="rotate(#{-theta})" transform-origin="0 0">
            <text class="top etch" x="0" y="#{radius - 1.5 * tick_length}" text-anchor="middle" dominant-baseline="auto">#{label}</text>
            <line class="top etch #{label && "heavy"}" x1="0" y1="#{radius}" x2="0" y2="#{radius - tick_length}" />
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
    rule =
      10..99
      |> Enum.map(fn x -> D.new(1, x, -1) end)
      |> Enum.map(fn val ->
        theta =
          (Math.log(D.to_float(val)) - Math.log(1.0)) / (Math.log(10.0) - Math.log(1.0)) * 360.0

        label = val |> D.normalize() |> D.to_string(:normal)

        cond do
          # this is all much more verbose than before, because Decimal
          D.lt?(val, 2) ->
            {label, theta}

          val |> D.rem(D.new(1, 2, -1)) |> D.equal?(0) && !D.gt?(val, 5) ->
            {label, theta}

          val |> D.rem(D.new(1, 5, -1)) |> D.equal?(0) && D.gt?(val, 5) ->
            {label, theta}

          true ->
            {nil, theta}
        end
      end)

    {rule, rule}
  end

  def relu_rule(max_value, delta_value) do
    # convert args to Decimal
    {:ok, max_value} = D.cast(max_value)
    {:ok, delta_value} = D.cast(delta_value)
    delta_theta = D.div(delta_value, max_value) |> D.mult(180) |> D.to_float()

    outer_positive =
      {D.new(0), 0.0}
      |> Stream.iterate(fn {val, theta} ->
        {D.add(val, delta_value), theta + delta_theta}
      end)
      |> Enum.take_while(fn {val, _theta} -> !D.gt?(val, max_value) end)

    outer_negative =
      outer_positive
      # remove first + last elements because that would overlap with the positive rule
      |> List.delete_at(0)
      |> List.delete_at(-1)
      |> Enum.map(fn {val, theta} -> {D.mult(val, -1), -theta} end)

    outer_rule =
      outer_negative
      |> Enum.reverse()
      |> Enum.concat(outer_positive)

    inner_rule =
      outer_rule
      |> Enum.map(fn {val, theta} ->
        if D.lt?(val, 0) do
          {D.new(0), theta}
        else
          {val, theta}
        end
      end)
      |> Enum.with_index(fn {val, theta}, idx ->
        label = val |> D.normalize() |> D.to_string(:normal)

        cond do
          D.integer?(val) && theta >= 0 -> {label, theta}
          D.integer?(val) && Integer.mod(idx, 4) == 3 -> {label, theta}
          true -> {nil, theta}
        end
      end)

    outer_rule =
      outer_rule
      |> Enum.map(fn {val, theta} ->
        label = val |> D.normalize() |> D.to_string(:normal)

        cond do
          D.integer?(val) -> {label, theta}
          true -> {nil, theta}
        end
      end)

    # reversal not strictly necessary, but nice to keep it ordered
    {outer_rule, inner_rule}
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.Rings.SlideRule do
  alias PerceptronApparatus.Rings.SlideRule

  def render(%SlideRule{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{rule: rule, context: {radius, _layer_index}} = ring

    SlideRule.render(radius - 26, rule)
  end
end
