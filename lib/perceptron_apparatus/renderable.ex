defprotocol PerceptronApparatus.Renderable do
  @spec render(t) :: list()
  def render(renderable)
end
