# Example: Training a model and exporting weights to JSON
#
# This example demonstrates how to train a 36x6x10 MLP on MNIST data
# and export the trained weights to a JSON file that can be used in
# other tools like Typst.

alias PerceptronApparatus.MLP

IO.puts("Training MNIST model and exporting weights...\n")

IO.puts("Step 1: Loading MNIST data")
{train_data, _test_data} = MLP.load_mnist_data()

IO.puts("Step 2: Creating model")
model = MLP.create_model()

IO.puts("Step 3: Training model (5 epochs)")
trained_params = MLP.train_model(model, train_data, epochs: 5, batch_size: 128)

IO.puts("\nStep 4: Exporting weights to JSON (with scaling)")
output_file = "mnist_weights.json"
MLP.write_weights_to_json(trained_params, output_file, scale_to_range: true)

IO.puts("\nDone! Weights exported to #{output_file}")
IO.puts("\nYou can now use these weights in Typst:")
IO.puts("""

  #let weights = json("#{output_file}")

  // Display the B matrix (input->hidden) as a table
  #table(
    columns: 6,
    ..weights.B.flatten()
  )

  // Access individual weights
  #weights.B.at(0).at(0)  // First weight in B matrix
  #weights.D.at(0).at(0)  // First weight in D matrix
""")
