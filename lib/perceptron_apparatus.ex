defmodule PerceptronApparatus do
  use Ash.Domain,
    otp_app: :perceptron_apparatus,
    extensions: [AshOps]

  mix_tasks do
    create PerceptronApparatus.Board, :create_board, :create,
      description: "Creates a new perceptron apparatus board and generates SVG files."
  end

  resources do
    resource PerceptronApparatus.Board
    resource PerceptronApparatus.RuleRing
    resource PerceptronApparatus.RadialRing
    resource PerceptronApparatus.AzimuthalRing
  end
end
