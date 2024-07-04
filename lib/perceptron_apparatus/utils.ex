defmodule PerceptronApparatus.Utils do
  @moduledoc """
  Some handy utilities.
  """
  def wrap_in_svg(body) do
    """
    <svg stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      svg {
        font-family: Garamond;
      }
      </style>
      #{body}
    </svg>
    """
  end

  def wrap_in_svg(body, view_box) do
    """
    <svg viewBox="#{view_box}" stroke="black" fill="transparent" stroke-width="1" xmlns="http://www.w3.org/2000/svg">
      <style>
      svg {
        font-family: Garamond;
      }
      </style>
      #{body}
    </svg>
    """
  end
end
