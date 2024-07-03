defprotocol PerceptronApparatus.Renderable do
  @spec render(t) :: String.t()
  def render(component)
end
