defprotocol PerceptronApparatus.Ring do
  @spec render(t) :: String.t()
  def render(ring)
end
