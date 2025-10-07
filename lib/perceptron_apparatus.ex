defmodule PerceptronApparatus do
  use Ash.Domain,
    otp_app: :perceptron_apparatus,
    extensions: [AshOps]

  resources do
    resource PerceptronApparatus.Board do
      define :create_board, action: :create, args: [:size, :n_input, :n_hidden, :n_output, {:optional, :qr_data}]
      define :write_svg, action: :write_svg, args: [:board, :filename, {:optional, :print_mode}]
    end

    resource PerceptronApparatus.RuleRing do
      define :create_rule_ring, action: :new, args: [:rule, {:optional, :width}]
    end

    resource PerceptronApparatus.RadialRing do
      define :create_radial_ring, action: :new, args: [:shape, :rule, {:optional, :width}]
    end

    resource PerceptronApparatus.AzimuthalRing do
      define :create_azimuthal_ring, action: :new, args: [:shape, :rule, {:optional, :width}]
    end
  end
end
