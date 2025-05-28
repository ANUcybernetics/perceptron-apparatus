defmodule PerceptronApparatus.RuleRing do
  @moduledoc """
  Documentation for `RuleRing`.
  """
  use Ash.Resource,
    otp_app: :perceptron_apparatus,
    domain: PerceptronApparatus

  alias Decimal, as: D

  attributes do
    uuid_primary_key :id
    attribute :width, :float, default: 50.0
    attribute :rule, :term, allow_nil?: false
    attribute :context, :term, allow_nil?: true
  end

  actions do
    defaults [:read]
    
    create :new do
      accept [:rule, :width]
    end

    update :set_context do
      accept [:context]
    end
  end

  @type t :: %__MODULE__{
          id: String.t(),
          # rule is a list of {outer_label, theta, inner_label} tuples
          rule: [{Decimal.t() | nil, float(), Decimal.t() | nil}],
          # ring width (fixed for slide rules)
          width: float(),
          # drawing context: {outer_radius, layer_index}
          context: {float(), integer()} | nil
        }

  # Legacy function for backwards compatibility
  def new(rule) do
    {:ok, rule_ring} = 
      Ash.Changeset.for_create(__MODULE__, :new, %{rule: rule})
      |> Ash.create()
    
    rule_ring
  end

  # each rule should be a list of tuples {theta, label}, where label can be nil (for a minor tick with no label)
  def render(radius, rule) do
    tick_length = 10

    labels =
      rule
      |> Enum.map(fn {outer_label, theta, inner_label} ->
        """
          <g transform="rotate(#{-theta})" >
            <line class="top etch #{outer_label && "heavy"}" x1="0" y1="#{radius - tick_length}" x2="0" y2="#{radius + tick_length}" />
            <text class="top etch heavy" x="0" y="#{radius + 2.5 * tick_length}" text-anchor="middle" dominant-baseline="auto">#{outer_label}</text>
            <text class="top etch heavy" x="0" y="#{radius - 1.5 * tick_length}" text-anchor="middle" dominant-baseline="auto">#{inner_label}</text>
          </g>
        """
      end)
      |> Enum.join()

    labels <> ~s|<circle class="top full" cx="0" cy="0" r="#{radius}" />|
  end

  # no params for log_rule, since it only really makes sense for rules which range from 1.0 - 9.9
  def log_rule do
    10..99
    |> Enum.map(fn x -> D.new(1, x, -1) end)
    |> Enum.map(fn val ->
      theta =
        (:math.log(D.to_float(val)) - :math.log(1.0)) / (:math.log(10.0) - :math.log(1.0)) * 360.0

      label = val |> D.normalize() |> D.to_string(:normal)

      cond do
        # this is all much more verbose than before, because Decimal
        D.lt?(val, 2) ->
          {label, theta, label}

        val |> D.rem(D.new(1, 2, -1)) |> D.equal?(0) && !D.gt?(val, 5) ->
          {label, theta, label}

        val |> D.rem(D.new(1, 5, -1)) |> D.equal?(0) && D.gt?(val, 5) ->
          {label, theta, label}

        true ->
          {nil, theta, nil}
      end
    end)
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

    outer_values =
      outer_negative
      |> Enum.reverse()
      |> Enum.concat(outer_positive)

    outer_values
    |> Enum.map(fn {val, theta} ->
      outer_label = val |> D.normalize() |> D.to_string(:normal)

      cond do
        D.integer?(val) ->
          {outer_label, theta, val |> D.max(0) |> D.normalize() |> D.to_string(:normal)}

        true ->
          {nil, theta, nil}
      end
    end)
  end
end

defimpl PerceptronApparatus.Renderable, for: PerceptronApparatus.RuleRing do
  alias PerceptronApparatus.RuleRing

  def render(%RuleRing{context: nil}) do
    raise "cannot render without context"
  end

  def render(ring) do
    %{rule: rule, width: width, context: %{radius: radius}} = ring

    RuleRing.render(radius - width / 2, rule)
  end
end
