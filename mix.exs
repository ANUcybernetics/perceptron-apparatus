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
      {:nx, "~> 0.9"},
      {:polaris, "~> 0.1"},
      {:scidata, "~> 0.1"},
      {:stb_image, "~> 0.6"},
      {:qr_code, "~> 3.0"},
      {:usage_rules, "~> 0.1", only: [:dev]},
      {:decimal, "~> 2.0"},
      {:sourceror, "~> 1.8", only: [:dev, :test]},
      {:ash, "~> 3.0"},
      {:igniter, "~> 0.6", only: [:dev, :test]},
      {:lazy_html, "~> 0.1.1"}
    ]
  end
end
