# Used by "mix format"
[
  plugins: [Spark.Formatter],
  inputs: ["create_board.exs", "{mix,.formatter}.exs", "{config,lib,test}/**/*.{ex,exs}"],
  import_deps: [:ash, :ash_ops]
]
