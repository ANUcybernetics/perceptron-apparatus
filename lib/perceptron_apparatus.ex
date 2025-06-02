defmodule PerceptronApparatus do
  use Ash.Domain,
    otp_app: :perceptron_apparatus,
    extensions: [AshOps]

  resources do
    resource PerceptronApparatus.Board do
      define :create_board, args: [:size, :n_input, :n_hidden, :n_output], action: :create
      define :write_svg, args: [:filename], action: :write_svg
    end

    resource PerceptronApparatus.RuleRing
    resource PerceptronApparatus.RadialRing
    resource PerceptronApparatus.AzimuthalRing
  end
end
