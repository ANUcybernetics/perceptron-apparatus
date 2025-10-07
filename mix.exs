defmodule PerceptronApparatus.MixProject do
  use Mix.Project

  def project do
    [
      app: :perceptron_apparatus,
      version: "0.1.0",
      elixir: "~> 1.18",
      start_permanent: Mix.env() == :prod,
      consolidate_protocols: Mix.env() != :dev,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:axon, "~> 0.7"},
      {:nx, "~> 0.10"},
      {:exla, "~> 0.10"},
      {:polaris, "~> 0.1"},
      {:scidata, "~> 0.1"},
      {:stb_image, "~> 0.6"},
      {:qr_code, "~> 3.2"},
      {:usage_rules, "~> 0.1.24", only: [:dev]},
      {:decimal, "~> 2.3"},
      {:sourceror, "~> 1.10", only: [:dev, :test]},
      {:ash, "~> 3.5.43"},
      {:igniter, "~> 0.6.30", only: [:dev, :test]},
      {:lazy_html, "~> 0.1.8"}
    ]
  end
end
