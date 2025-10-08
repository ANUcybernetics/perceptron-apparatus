defmodule PerceptronApparatusTest do
  use ExUnit.Case
  doctest PerceptronApparatus

  @moduletag :svg

  test "domain module exists" do
    assert PerceptronApparatus.__info__(:module) == PerceptronApparatus
  end
end
