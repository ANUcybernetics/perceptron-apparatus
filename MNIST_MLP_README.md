# MNIST MLP Analysis with Parameter Range Tracking

This module provides a focused implementation of Multi-Layer Perceptron (MLP)
analysis using Axon on MNIST data, specifically designed to track parameter
ranges and activation values for a 36x6x10 network architecture.

## Features

- **Fixed Architecture**: 36 inputs → 6 hidden neurons (ReLU) → 10 outputs
  (softmax)
- **Real MNIST Data**: Automatically downloads and preprocesses MNIST dataset
- **Image Preprocessing**: Resizes 28x28 images to 6x6 pixels, then flattens to
  36 features
- **90/10 Train/Test Split**: Standard data splitting for evaluation
- **Parameter Range Tracking**: Analyzes min/max/mean values of all trained
  parameters
- **Activation Range Tracking**: Monitors activation values during inference
- **Clean Output**: Minimal logging for focused analysis

## Quick Start

### Run Complete Analysis

```elixir
# Run the full workflow with default settings
result = PerceptronApparatus.MLP.analyze_mnist_mlp()

# Or customize training parameters
result = PerceptronApparatus.MLP.analyze_mnist_mlp(
  epochs: 10,
  batch_size: 128,
  learning_rate: 0.001
)
```

### Run Individual Steps

```elixir
# 1. Load and preprocess MNIST data
{train_data, test_data} = PerceptronApparatus.MLP.load_mnist_data()

# 2. Create the fixed 36x6x10 model
model = PerceptronApparatus.MLP.create_model()

# 3. Train the model
trained_params = PerceptronApparatus.MLP.train_model(model, train_data, epochs: 5)

# 4. Inspect parameter ranges
PerceptronApparatus.MLP.inspect_parameters(trained_params)

# 5. Run inference with activation tracking
model_with_hooks = PerceptronApparatus.MLP.create_model_with_hooks()
{predictions, activations} = PerceptronApparatus.MLP.run_inference_with_tracking(
  model_with_hooks,
  trained_params,
  test_data
)
```

## Example Output

```
============================================================
MNIST MLP ANALYSIS (36x6x10)
============================================================
Loading and preprocessing MNIST data...
Data loaded: 54000 training samples, 6000 test samples
Creating 36x6x10 MLP model for MNIST classification
Training model on MNIST data...

Epoch: 0, Batch: 400, accuracy: 0.2844 loss: 2.0949
Epoch: 1, Batch: 400, accuracy: 0.5776 loss: 1.7360
...
Epoch: 7, Batch: 400, accuracy: 0.6699 loss: 1.1899

=== TRAINED PARAMETER RANGES ===

Layer: hidden
  bias: min=0.1095, max=0.7308, mean=0.4053
  kernel: min=-1.331, max=1.9416, mean=0.1676

Layer: output
  bias: min=-0.9384, max=0.9406, mean=-0.0016
  kernel: min=-2.2144, max=1.5916, mean=-0.1826

Running inference with activation tracking...

=== INFERENCE ACTIVATION RANGES ===
input: min=0.0, max=1.0, avg_mean=0.1458
hidden: min=0.0, max=7.4979, avg_mean=1.69
output: min=0.0, max=0.9985, avg_mean=0.1

Test accuracy: 57.0%
============================================================
```

## Architecture Details

### Network Structure

- **Input Layer**: 36 features (6x6 downsampled MNIST images)
- **Hidden Layer**: 6 neurons with ReLU activation
- **Output Layer**: 10 neurons with softmax activation (for digit
  classification)

### Data Preprocessing

1. Load MNIST dataset (60,000 training images)
2. Resize from 28x28 to 6x6 using simple downsampling (indices [0, 5, 9, 14, 18,
   23])
3. Flatten 6x6 images to 36-dimensional vectors
4. Normalize pixel values to [0, 1] range
5. Convert labels to one-hot encoding
6. Split into 90% training (54,000) and 10% test (6,000) sets

### Training Configuration

- **Loss Function**: Categorical cross-entropy
- **Optimizer**: Adam (default learning rate: 0.001)
- **Batch Size**: 128 (default)
- **Epochs**: 8 (default)
- **Metrics**: Accuracy

## Dependencies

```elixir
{:axon, "~> 0.7"},
{:nx, "~> 0.9"},
{:polaris, "~> 0.1"},
{:scidata, "~> 0.1"}
```

## Testing

Run the demonstration tests to see the functionality in action:

```bash
# Run all demo tests
mix test --only demo --timeout 300000

# Run specific demo
mix test test/perceptron_apparatus/mlp_test.exs:156 --timeout 180000
```

## Demo Script

A standalone demo script is available that doesn't require the full project
setup:

```bash
mix run demo.exs
```

This script uses `Mix.install/1` to automatically handle dependencies and
demonstrates the core functionality.

## Performance Notes

- Training time depends on system performance (typically 1-2 minutes for 8
  epochs)
- Without EXLA compilation, training uses Nx's binary backend (slower but more
  compatible)
- Batch size and epoch count can be adjusted for faster/slower but more/less
  accurate training
- The 6x6 downsampling significantly reduces computation while maintaining
  essential digit features

## Use Cases

This implementation is particularly useful for:

- Understanding parameter initialization and evolution during training
- Analyzing activation distributions in small networks
- Educational purposes for demonstrating MLP behavior
- Baseline comparisons for more complex architectures
- Debugging gradient flow and activation patterns
