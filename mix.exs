defmodule PerceptronApparatus.MixProject do
  use Mix.Project

  def project do
    [
      app: :perceptron_apparatus,
      version: "0.1.0",
      elixir: "~> 1.18",
      start_permanent: Mix.env() == :prod,
      consolidate_protocols: Mix.env() != :dev,
      deps: deps(),
      usage_rules: usage_rules()
    ]
  end

  def application do
    [
      extra_applications: [:logger]
    ]
  end

  # `mix usage_rules.sync` writes these into .claude/skills, which is gitignored
  defp usage_rules do
    [
      file: "AGENTS.md",
      skills: [
        location: ".claude/skills",
        build: [
          "ash-framework": [
            description:
              "Load before changing or debugging anything in lib/perceptron_apparatus/ (modules that use Ash.Resource or Ash.Domain): the Board and ring resources, actions, calculations, changes or an Ash.Error.* in test output.",
            usage_rules: [:ash]
          ]
        ]
      ]
    ]
  end

  defp deps do
    [
      {:axon, "~> 0.8"},
      {:nx, "~> 1.0"},
      {:exla, "~> 1.0"},
      {:polaris, "~> 0.1"},
      {:scidata, "~> 0.1"},
      {:stb_image, "~> 1.0"},
      {:qr_code, "~> 3.2"},
      {:usage_rules, "~> 1.3", only: [:dev]},
      {:decimal, "~> 3.0"},
      {:sourceror, "~> 1.10", only: [:dev, :test]},
      {:ash, "~> 3.29"},
      {:igniter, "~> 0.8", only: [:dev, :test]},
      {:lazy_html, "~> 0.1.8"}
    ]
  end
end
