# Used by "mix format"
[
  plugins: [Spark.Formatter],
  inputs: ["{mix,.formatter}.exs", "{config,lib,test}/**/*.{ex,exs}"],
  import_deps: [:ash, :ash_ops]
]
