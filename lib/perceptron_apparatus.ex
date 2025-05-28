defmodule PerceptronApparatus do
  use Ash.Domain,
    otp_app: :perceptron_apparatus

  resources do
    resource PerceptronApparatus.Board
    resource PerceptronApparatus.RuleRing
    resource PerceptronApparatus.RadialRing
    resource PerceptronApparatus.AzimuthalRing
  end
end
