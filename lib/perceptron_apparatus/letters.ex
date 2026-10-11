defmodule PerceptronApparatus.Letters do
  @moduledoc """
  Next-letter prediction, as a task for the apparatus: a language model small
  enough to work by hand.

  The alphabet has 10 symbols, the nine letters "etaoinshr" and the space. The
  network sees the 3 previous symbols, each as a one-hot over the alphabet
  (30 inputs, oldest symbol first), and its 10 outputs score each symbol as the
  one that comes next.

  The corpus is two public-domain novels from Project Gutenberg, reduced to the
  words that can be spelt with the alphabet and joined by single spaces.

  ## Example usage

      {train_data, test_data} = PerceptronApparatus.Letters.load_data()
      model = PerceptronApparatus.MLP.create_model(30, 10)
      trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 10)
  """

  @alphabet "etaoinshr "
  @symbols String.graphemes(@alphabet)
  @letters MapSet.new(@symbols -- [" "])
  @context_length 3

  @books [
    {"alice-in-wonderland.txt", "https://www.gutenberg.org/files/11/11-0.txt"},
    {"pride-and-prejudice.txt", "https://www.gutenberg.org/files/1342/1342-0.txt"}
  ]

  def alphabet, do: @alphabet
  def n_input, do: @context_length * length(@symbols)
  def n_output, do: length(@symbols)

  @doc """
  Encodes a 3-symbol context as a list of 30 inputs, oldest symbol first.

  ## Example

      encode_context("the")
  """
  def encode_context(context) do
    symbols = String.graphemes(context)

    if length(symbols) != @context_length or not Enum.all?(symbols, &(&1 in @symbols)) do
      raise ArgumentError,
            "a context is #{@context_length} symbols from #{inspect(@alphabet)}, got: #{inspect(context)}"
    end

    Enum.flat_map(symbols, fn symbol ->
      for candidate <- @symbols, do: if(candidate == symbol, do: 1.0, else: 0.0)
    end)
  end

  @doc """
  Reduces text to the words that can be spelt with the alphabet, lower-cased
  and joined by single spaces. Apostrophes are dropped before splitting, and
  the only one-letter words kept are "a" and "i".

  ## Example

      corpus("She's in the garden; it is not hers.")
      # => "shes in the it is not hers"
  """
  def corpus(text) do
    text
    |> String.downcase()
    |> String.replace(["'", "’"], "")
    |> String.split(~r/[^[:alpha:]]+/u, trim: true)
    |> Enum.filter(&word?/1)
    |> Enum.join(" ")
  end

  defp word?(word) do
    graphemes = String.graphemes(word)

    Enum.all?(graphemes, &MapSet.member?(@letters, &1)) and
      case Enum.uniq(graphemes) do
        ["i"] -> word == "i"
        _ -> length(graphemes) > 1 or word == "a"
      end
  end

  @doc """
  Turns a corpus into `{contexts, next_symbols}`: every run of 3 symbols and the
  index (in the alphabet) of the symbol that follows it.
  """
  def examples(corpus) do
    corpus
    |> String.graphemes()
    |> Enum.chunk_every(@context_length + 1, 1, :discard)
    |> Enum.map(fn symbols ->
      {context, [next]} = Enum.split(symbols, @context_length)
      {Enum.join(context), Enum.find_index(@symbols, &(&1 == next))}
    end)
    |> Enum.unzip()
  end

  @doc """
  Downloads the books (cached in the system temp directory) and returns the corpus.
  """
  def download_corpus do
    :inets.start()
    :ssl.start()

    @books
    |> Enum.map(fn {filename, url} ->
      path = Path.join(System.tmp_dir!(), "perceptron-apparatus-#{filename}")

      unless File.exists?(path) do
        IO.puts("Downloading #{url}...")

        {:ok, {{_, 200, _}, _headers, body}} =
          :httpc.request(:get, {String.to_charlist(url), []}, [], body_format: :binary)

        File.write!(path, body)
      end

      File.read!(path)
    end)
    |> Enum.join(" ")
    |> corpus()
  end

  @doc """
  Loads the corpus as `{train_data, test_data}`, each `{inputs, one_hot_labels}`.
  The last tenth of the text is held out for testing.
  """
  def load_data do
    {contexts, next_symbols} = download_corpus() |> examples()
    split = div(length(contexts) * 9, 10)

    {train_contexts, test_contexts} = Enum.split(contexts, split)
    {train_next, test_next} = Enum.split(next_symbols, split)

    {to_tensors(train_contexts, train_next), to_tensors(test_contexts, test_next)}
  end

  defp to_tensors(contexts, next_symbols) do
    encodings = Map.new(Enum.uniq(contexts), &{&1, encode_context(&1)})
    inputs = contexts |> Enum.map(&Map.fetch!(encodings, &1)) |> Nx.tensor(type: :f32)

    labels =
      next_symbols
      |> Nx.tensor(type: :s64)
      |> Nx.new_axis(-1)
      |> Nx.equal(Nx.iota({1, n_output()}))
      |> Nx.as_type(:f32)

    {inputs, labels}
  end
end
