defmodule PerceptronApparatus.MixProject do
  use Mix.Project

  def project do
    [
      app: :perceptron_apparatus,
      version: "0.1.0",
      elixir: "~> 1.17",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  # Run "mix help compile.app" to learn about applications.
  def application do
    [
      extra_applications: [:logger]
    ]
  end

  # Run "mix help deps" to learn about dependencies.
  defp deps do
    [
      {:kino, "~> 0.13.0"},
      {:math, "~> 0.7"},
      {:decimal, "~> 2.0"},
      {:roman, "~> 0.2"}
    ]
  end
end
