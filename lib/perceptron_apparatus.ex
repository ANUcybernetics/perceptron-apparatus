defmodule PerceptronApparatus do
  use Ash.Domain,
    otp_app: :perceptron_apparatus,
    extensions: [AshOps]

  mix_tasks do
    create PerceptronApparatus.Board, :create_board, :create,
      description: "Creates a new perceptron apparatus board and generates SVG files."
  end

  resources do
    resource PerceptronApparatus.Board do
      define :create_board, args: [:size, :n_input, :n_hidden, :n_output], action: :create
    end

    resource PerceptronApparatus.RuleRing
    resource PerceptronApparatus.RadialRing
    resource PerceptronApparatus.AzimuthalRing
  end
end
