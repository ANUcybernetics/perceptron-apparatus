defmodule PerceptronApparatus.LettersTest do
  use ExUnit.Case, async: true

  alias PerceptronApparatus.Letters

  describe "encode_context/1" do
    test "one-hot encodes each symbol, oldest first" do
      inputs = Letters.encode_context("the")

      assert length(inputs) == 30

      # in "etaoinshr ", t is the 2nd symbol, h the 8th and e the 1st
      assert Enum.slice(inputs, 0, 10) == [0, 1, 0, 0, 0, 0, 0, 0, 0, 0]
      assert Enum.slice(inputs, 10, 10) == [0, 0, 0, 0, 0, 0, 0, 1, 0, 0]
      assert Enum.slice(inputs, 20, 10) == [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    end

    test "encodes a space as the last symbol" do
      assert "e a" |> Letters.encode_context() |> Enum.slice(10, 10) ==
               [0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
    end

    test "rejects contexts of the wrong length or alphabet" do
      assert_raise ArgumentError, fn -> Letters.encode_context("th") end
      assert_raise ArgumentError, fn -> Letters.encode_context("thx") end
    end
  end

  describe "corpus/1" do
    test "keeps only the words that can be spelt with the alphabet" do
      assert Letters.corpus("She's in the garden; it is not hers.") ==
               "shes in the it is not hers"
    end

    test "keeps a and i but no other single letters or runs of i" do
      assert Letters.corpus("I saw a tree. Chapter II: t, s, iii") == "i a tree"
    end
  end

  describe "examples/1" do
    test "pairs every 3-symbol context with the symbol that follows it" do
      assert Letters.examples("the tea") ==
               {["the", "he ", "e t", " te"], [9, 1, 0, 2]}
    end
  end
end
