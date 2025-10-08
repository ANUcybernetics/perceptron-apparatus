# MNIST MLP analysis

This module provides an implementation of Multi-Layer Perceptron (MLP) analysis using Axon on MNIST data, specifically designed for a 36x6x10 network architecture compatible with the physical perceptron apparatus.

## Features

- **Fixed architecture**: 36 inputs → 6 hidden neurons (ReLU) → 10 outputs (no softmax)
- **Real MNIST data**: automatically downloads and preprocesses MNIST dataset
- **Image preprocessing**: resizes 28×28 images to 6×6 pixels, then flattens to 36 features
- **90/10 train/test split**: standard data splitting for evaluation
- **Parameter range tracking**: analyzes min/max/mean values of all trained parameters
- **Activation range tracking**: monitors activation values during inference
- **Weight export**: export trained weights to JSON for use in other tools (e.g. Typst)
- **Clean output**: minimal logging for focused analysis

## Quick start

### Using mix tasks

The easiest way to use this functionality is via mix tasks:

```bash
# Train and export weights to JSON (default: mnist-weights.json)
mix perceptron.export_weights

# Custom training parameters
mix perceptron.export_weights --epochs 10 --batch-size 256 --learning-rate 0.01

# Save to specific file with scaling to apparatus range
mix perceptron.export_weights --output mnist-weights.json --scale --target-max 5.0

# Show help
mix perceptron.export_weights --help
```

### Programmatic usage

Run complete analysis:

```elixir
# Run the full workflow with default settings
result = PerceptronApparatus.MLP.analyze_mnist_mlp()

# Or customise training parameters
result = PerceptronApparatus.MLP.analyze_mnist_mlp(
  epochs: 10,
  batch_size: 128,
  learning_rate: 0.005
)
```

Run individual steps:

```elixir
# 1. Load and preprocess MNIST data
{train_data, test_data} = PerceptronApparatus.MLP.load_mnist_data()

# 2. Create the fixed 36x6x10 model
model = PerceptronApparatus.MLP.create_model()

# 3. Train the model
trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 5)

# 4. Inspect parameter ranges
PerceptronApparatus.MLP.inspect_parameters(trained_params)

# 5. Export weights to JSON
PerceptronApparatus.MLP.write_weights_to_json(trained_params, "mnist-weights.json")

# 6. Run inference with activation tracking (optional)
model_with_hooks = PerceptronApparatus.MLP.create_model_with_hooks()
{predictions, activations} = PerceptronApparatus.MLP.run_inference_with_tracking(
  model_with_hooks,
  trained_params,
  test_data
)
```

## Example output

### Mix task output

```
Training MNIST model and exporting weights...

Step 1: Loading MNIST data
Step 2: Creating model
Step 3: Training model (5 epochs)

Epoch: 0, Batch: 400, accuracy: 0.2844 loss: 2.0949
Epoch: 1, Batch: 400, accuracy: 0.5776 loss: 1.7360
...
Epoch: 4, Batch: 400, accuracy: 0.6699 loss: 1.1899

Step 4: Exporting weights to JSON (with scaling)

Weight scaling applied:
  B: max 1.8234 -> 5.0000 (factor: 2.7421)
  D: max 2.1245 -> 5.0000 (factor: 2.3534)

Weights written to mnist-weights.json

Done! Weights exported to mnist-weights.json

You can now use these weights in Typst:

  #let weights = json("mnist-weights.json")

  // Display the B matrix (input->hidden) as a table
  #table(
    columns: 6,
    ..weights.B.flatten()
  )

  // Access individual weights
  #weights.B.at(0).at(0)  // First weight in B matrix
  #weights.D.at(0).at(0)  // First weight in D matrix
```

### Analysis function output

```
Loading and preprocessing MNIST data...
Creating 36x6x10 MLP model for MNIST classification
Training model on MNIST data...

Epoch: 0, Batch: 400, accuracy: 0.2844 loss: 2.0949
Epoch: 1, Batch: 400, accuracy: 0.5776 loss: 1.7360
...
Epoch: 7, Batch: 400, accuracy: 0.6699 loss: 1.1899

=== TRAINED PARAMETER RANGES ===

Layer: hidden
  kernel: min=-1.331, max=1.9416, mean=0.1676

Layer: output
  kernel: min=-2.2144, max=1.5916, mean=-0.1826

Running inference with activation tracking...

=== INFERENCE ACTIVATION RANGES ===
input: min=0.0, max=1.0, avg_mean=0.1458
hidden: min=0.0, max=7.4979, avg_mean=1.69
output: min=-3.2, max=4.8, avg_mean=0.1

Test accuracy: 57.0%
```

## Dataset details

### Source

MNIST: Modified National Institute of Standards and Technology database
- Training set: 60,000 handwritten digit images
- Test set: 10,000 images
- We use a 90/10 split of the training set: 54,000 train, 6,000 test

### Classes

10 digit classes: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9

### Original format

- Images: 28×28 grayscale pixels
- Pixel values: 0-255 (0=white, 255=black)
- Labels: integer 0-9

## Image preprocessing

To fit the 36-input architecture, images are downsampled and normalised:

### Downsampling: 28×28 → 6×6

Simple downsampling using specific pixel indices:
- Row/column indices: [0, 5, 9, 14, 18, 23]
- This gives a 6×6 grid that captures the essential structure of each digit
- Flattened to 36-dimensional vector

### Normalisation

- Pixel values divided by 255 to get range [0, 1]
- No mean subtraction or standardisation

### Label encoding

- One-hot encoding: digit 7 becomes [0, 0, 0, 0, 0, 0, 0, 1, 0, 0]

### Example

Original 28×28 digit "3":
```
[0, 0, 0, ..., 0]    (784 pixels)
```

After downsampling to 6×6:
```
[0.0, 0.1, 0.8, 0.9, 0.2, 0.0,
 0.0, 0.3, 0.1, 0.7, 0.6, 0.0,
 0.0, 0.0, 0.2, 0.9, 0.8, 0.0,
 0.0, 0.2, 0.1, 0.8, 0.7, 0.0,
 0.0, 0.5, 0.9, 0.9, 0.3, 0.0,
 0.0, 0.0, 0.1, 0.2, 0.0, 0.0]
```

## Architecture details

### Network structure

- **Input layer**: 36 features (6×6 downsampled MNIST images)
- **Hidden layer**: 6 neurons with ReLU activation (no bias)
- **Output layer**: 10 neurons (no activation, no bias) for digit classification

### Training configuration

- **Loss function**: mean squared error (MSE)
- **Optimizer**: Adam (default learning rate: 0.005)
- **Batch size**: 128 (default)
- **Epochs**:
  - 5 (default for `mix perceptron.export_weights`)
  - 10 (default for `PerceptronApparatus.MLP.train_model/3`)
  - 8 (default for `PerceptronApparatus.MLP.analyze_mnist_mlp/1`)
- **Metrics**: accuracy
- **Weight initialisation**: Glorot uniform (for standard models)

### Weight export

Trained weights are exported in a JSON format compatible with Typst:

```json
{
  "B": [[...], ...],  // 36x6 matrix (input->hidden weights)
  "D": [[...], ...]   // 6x10 matrix (hidden->output weights)
}
```

Optional scaling ensures weights fit within the physical apparatus range (default target: ±5.0).

## Using the apparatus with MNIST

### Physical interaction workflow

1. **Select a digit image** from the MNIST dataset (or draw your own)
2. **Downsample to 6×6** manually or using software
3. **Set the input sliders** on ring A according to the 36 pixel values
4. **Set weight rings** B and D according to exported weights
5. **Turn the apparatus** through its calculation phases
6. **Read the output** from ring G to see which digit (0-9) is predicted

### Example: Setting a digit on the apparatus

Digit: handwritten "7"

After downsampling to 6×6 and normalising:
```
[0.9, 0.9, 0.8, 0.7, 0.2, 0.0,
 0.1, 0.2, 0.3, 0.7, 0.1, 0.0,
 0.0, 0.0, 0.1, 0.6, 0.0, 0.0,
 0.0, 0.0, 0.3, 0.5, 0.0, 0.0,
 0.0, 0.1, 0.6, 0.3, 0.0, 0.0,
 0.0, 0.3, 0.8, 0.1, 0.0, 0.0]
```

**Ring A (inputs)**:
- Set slider 1 to 0.9
- Set slider 2 to 0.9
- Set slider 3 to 0.8
- ... (continue for all 36 sliders)

**Ring B (input→hidden weights)**: Set according to exported B matrix
**Ring D (hidden→output weights)**: Set according to exported D matrix

**Ring G (outputs)**: After turning, slider 7 (corresponding to digit "7") should have the highest value

## Why MNIST works well for the apparatus

### Visual and tangible

People can see the digit, understand what it represents, and observe how the physical apparatus computes the classification.

### Educational value

MNIST is the "hello world" of machine learning. Using it demonstrates that the apparatus can perform real ML tasks.

### Intuitive encoding

The 6×6 downsampling preserves enough visual structure that digits remain recognisable, making the connection between input and output clear.

### Benchmark problem

MNIST is well-understood, so apparatus performance can be compared to digital implementations.

## Model variants

### Non-negative output weights

For iterative apparatus computation where negative accumulation is problematic:

```bash
mix perceptron.export_weights --nonnegative-output
```

This constrains the output layer (ring D) to have only non-negative weights, ensuring all accumulations move in a positive direction.

### Bounded initialisation

For tighter control over parameter and activation ranges:

```elixir
result = PerceptronApparatus.MLP.analyze_bounded_initialization(epochs: 3)
```

This uses custom initialisers to keep parameters grouped in similar ranges, targeting specific activation ranges (hidden: [0, 1.5], output: [-1.5, 1.5]).

## Dependencies

```elixir
{:axon, "~> 0.7"},
{:nx, "~> 0.9"},
{:exla, "~> 0.9"},  # Optional but recommended for performance
{:polaris, "~> 0.1"},
{:scidata, "~> 0.1"},
{:jason, "~> 1.4"}  # For JSON export
```

## Testing

Run the tests to see the functionality in action:

```bash
# Run all MLP tests
mix test test/perceptron_apparatus/mlp_test.exs

# Run with extended timeout for training tests
mix test test/perceptron_apparatus/mlp_test.exs --timeout 180000
```

## Performance notes

- Training time depends on system performance (typically 1-2 minutes for 5-10 epochs)
- With EXLA backend (configured in `config/config.exs`), training is significantly faster
- Batch size and epoch count can be adjusted for faster/slower but more/less accurate training
- The 6×6 downsampling significantly reduces computation while maintaining essential digit features
- Test accuracy typically reaches 55-65% with 5-10 epochs
- This is lower than state-of-the-art (99%+) due to:
  - Aggressive downsampling (36 vs 784 inputs)
  - Tiny hidden layer (6 vs hundreds of neurons)
  - No bias terms
  - No softmax activation

## Use cases

This implementation is particularly useful for:

- exporting trained weights for use in the physical perceptron apparatus
- understanding parameter initialisation and evolution during training
- analysing activation distributions in small networks
- educational purposes for demonstrating MLP behaviour on a classic dataset
- baseline comparisons for more complex architectures
- debugging gradient flow and activation patterns
- demonstrating that ML can work with extremely limited computational resources
