# Poker hand MLP analysis

This module provides an implementation of Multi-Layer Perceptron (MLP) analysis
using Axon on UCI Poker Hand data, specifically designed for a 36x6x10 network
architecture compatible with the physical perceptron apparatus.

## Features

- **Fixed architecture**: 36 inputs → 6 hidden neurons (ReLU) → 10 outputs (no
  softmax)
- **UCI Poker Hand dataset**: automatically downloads and preprocesses poker
  hand classification data
- **Feature encoding**: encodes 5-card poker hands into 36-dimensional vectors
- **Training/test split**: 25,010 training samples, 10,000 test samples (subset)
- **10 poker hand classes**: from high card (0) to royal flush (9)
- **Parameter range tracking**: analyzes min/max/mean values of all trained
  parameters
- **Weight export**: export trained weights to JSON for use in other tools (e.g.
  Typst)

## Quick start

### Using mix tasks

The easiest way to use this functionality is via mix tasks:

```bash
# Train and export weights to JSON (default: poker-weights.json)
mix perceptron.export_poker_weights

# Custom training parameters
mix perceptron.export_poker_weights --epochs 10 --batch-size 256 --learning-rate 0.01

# Save to specific file with scaling to apparatus range
mix perceptron.export_poker_weights --output poker-weights.json --scale --target-max 5.0

# Show help
mix perceptron.export_poker_weights --help
```

### Programmatic usage

Run complete analysis:

```elixir
# Run the full workflow with default settings
result = PerceptronApparatus.Poker.analyze_poker_mlp()

# Or customise training parameters
result = PerceptronApparatus.Poker.analyze_poker_mlp(
  epochs: 10,
  batch_size: 128,
  learning_rate: 0.005
)
```

Run individual steps:

```elixir
# 1. Load and preprocess poker hand data
{train_data, test_data} = PerceptronApparatus.Poker.load_poker_data()

# 2. Create the fixed 36x6x10 model
model = PerceptronApparatus.Poker.create_model()

# 3. Train the model
trained_params = PerceptronApparatus.Poker.train_model(model, train_data, epochs: 5)

# 4. Inspect parameter ranges
PerceptronApparatus.Poker.inspect_parameters(trained_params)

# 5. Export weights to JSON
PerceptronApparatus.Poker.write_weights_to_json(trained_params, "poker-weights.json")
```

## Example output

### Mix task output

```
Training poker hand classification model and exporting weights...

Step 1: Loading poker hand data
Downloading poker training data...
Parsing poker hand data...
Step 2: Creating model
Step 3: Training model (5 epochs)

Epoch: 0, Batch: 195, accuracy: 0.5123 loss: 1.8234
Epoch: 1, Batch: 195, accuracy: 0.6891 loss: 1.3456
...
Epoch: 4, Batch: 195, accuracy: 0.7234 loss: 1.0123

Step 4: Exporting weights to JSON (with scaling)

Weight scaling applied:
  B: max 1.7234 -> 5.0000 (factor: 2.9012)
  D: max 2.0123 -> 5.0000 (factor: 2.4847)

Weights written to poker-weights.json

Done! Weights exported to poker-weights.json

You can now use these weights in Typst:

  #let weights = json("poker-weights.json")

  // Display the B matrix (input->hidden) as a table
  #table(
    columns: 6,
    ..weights.B.flatten()
  )

  // Access individual weights
  #weights.B.at(0).at(0)  // First weight in B matrix
  #weights.D.at(0).at(0)  // First weight in D matrix
```

## Dataset details

### Source

UCI Machine Learning Repository: Poker Hand Dataset

- URL: https://archive.ics.uci.edu/ml/datasets/Poker+Hand
- Training set: 25,010 instances
- Test set: 1,000,000 instances (we use 10,000 for efficiency)

### Poker hand classes

The dataset classifies poker hands into 10 categories (ordered by strength):

0. Nothing/High card
1. One pair
2. Two pairs
3. Three of a kind
4. Straight
5. Flush
6. Full house
7. Four of a kind
8. Straight flush
9. Royal flush

### Raw format

Each instance contains 10 features:

- Card 1: suit (1-4), rank (1-13)
- Card 2: suit (1-4), rank (1-13)
- Card 3: suit (1-4), rank (1-13)
- Card 4: suit (1-4), rank (1-13)
- Card 5: suit (1-4), rank (1-13)

Suits: 1=Hearts, 2=Spades, 3=Diamonds, 4=Clubs

Ranks: 1=Ace, 2-10=numeric, 11=Jack, 12=Queen, 13=King

Note: In the encoding process, Ace (rank 1) is remapped to 14 to be treated as the highest card.

## Feature encoding

To fit the 36-input architecture, each poker hand is encoded as follows:

### Encoding scheme

**Per card (7 features)**:

- Suit: 4 one-hot indicators (1.0 for the card's suit, 0.0 for others)
- Rank: 3 binned indicators based on rank ranges (after remapping Ace to 14):
  - Low (ranks 2-5): [1.0, 0.0, 0.0]
  - Mid (ranks 6-9): [0.0, 1.0, 0.0]
  - High (ranks 10-14): [0.0, 0.0, 1.0]

**Total encoding**:

- 5 cards × 7 features = 35 dimensions
- Plus 1 padding dimension = 36 total

### Encoding limitations

**Important**: This binned rank encoding loses precise rank information. The network cannot directly detect hands that require specific rank sequences (straights) or exact rank matching (full houses, four of a kind). Instead, it learns to classify based on statistical patterns in the training data.

Hands the network can potentially learn:
- High card (via high/mid/low distribution)
- One pair, two pairs (via statistical patterns, not exact matching)
- Flush (via suit distribution)
- Three of a kind (via statistical patterns)

Hands that are difficult for this encoding:
- Straights (requires knowing exact rank sequence)
- Full house (requires precise rank counting)
- Four of a kind (requires precise rank counting)
- Straight flush (combines both problems)
- Royal flush (combines both problems)

This limitation is acceptable for a demonstration apparatus, where the focus is on showing that a physical analog computer can learn to classify symbolic data, even if not perfectly. The small network size (6 hidden neurons) also limits classification performance regardless of encoding.

### Example

For the hand: King of Hearts (suit=1, rank=13), 3 of Spades (suit=2, rank=3),
...

```
Card 1 (K♥): [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]  // Hearts, High rank (13->10-14)
Card 2 (3♠): [0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0]  // Spades, Low rank (3->2-5)
... (3 more cards)
Padding: [0.0]
```

## Architecture details

### Network structure

- **Input layer**: 36 features (encoded poker hand)
- **Hidden layer**: 6 neurons with ReLU activation (no bias)
- **Output layer**: 10 neurons (no activation, no bias) for hand classification

### Training configuration

- **Loss function**: mean squared error (MSE)
- **Optimizer**: Adam (default learning rate: 0.005)
- **Batch size**: 128 (default)
- **Epochs**: 5 (default for mix task), 10 (default for programmatic usage)
- **Metrics**: accuracy
- **Weight initialisation**: Glorot uniform

### Weight export

Trained weights are exported in a JSON format compatible with Typst:

```json
{
  "B": [[...], ...],  // 36x6 matrix (input->hidden weights)
  "D": [[...], ...]   // 6x10 matrix (hidden->output weights)
}
```

Optional scaling ensures weights fit within the physical apparatus range
(default target: ±5.0).

## Using the apparatus with poker hands

### Physical interaction workflow

1. **Deal 5 physical playing cards** or choose a test hand
2. **Encode the hand manually** using the encoding scheme:
   - For each card, identify its suit and rank bin
   - Set the corresponding input sliders on ring A
   - Card 1 uses sliders 1-7, Card 2 uses sliders 8-14, etc.
3. **Set weight rings** B and D according to exported weights
4. **Turn the apparatus** through its calculation phases
5. **Read the output** from ring G to see which poker hand class is predicted

### Example: Setting a hand on the apparatus

Hand: K♥, 3♠, 7♦, J♣, 2♥

**Ring A (inputs)**:

- Sliders 1-7 (Card 1, K♥): [1, 0, 0, 0, 0, 0, 1] (Hearts, High: rank 13)
- Sliders 8-14 (Card 2, 3♠): [0, 1, 0, 0, 1, 0, 0] (Spades, Low: rank 3)
- Sliders 15-21 (Card 3, 7♦): [0, 0, 1, 0, 0, 1, 0] (Diamonds, Mid: rank 7)
- Sliders 22-28 (Card 4, J♣): [0, 0, 0, 1, 0, 0, 1] (Clubs, High: rank 11)
- Sliders 29-35 (Card 5, 2♥): [1, 0, 0, 0, 1, 0, 0] (Hearts, Low: rank 2)
- Slider 36: [0] (padding)

**Ring B (input→hidden weights)**: Set according to exported B matrix **Ring D
(hidden→output weights)**: Set according to exported D matrix

**Ring G (outputs)**: After turning, read which of the 10 sliders has highest
value to see predicted hand class

## Why poker hands work well for the apparatus

### Interpretability

Unlike image pixels, each input slider has clear semantic meaning:

- "Card 3 is a Diamond" (slider 17 = 1)
- "Card 5 has a low rank" (slider 33 = 1)

Viewers can understand exactly what they're setting.

### Interactive demonstration

People can test the apparatus with real playing cards, making it a tangible,
engaging experience. Someone could play actual poker and use the apparatus as a
"hand strength calculator".

### Non-visual machine learning

Demonstrates that the apparatus isn't limited to image recognition---it's a
general-purpose neural network computer capable of symbolic reasoning.

### Accessible problem domain

Everyone understands poker hands, even without ML knowledge. This makes the
apparatus more approachable than abstract image classification tasks.

## Performance notes

- Training time: typically 30-60 seconds for 5 epochs
- With EXLA backend (configured in `config/config.exs`), training is significantly faster
- The poker dataset is smaller than MNIST (25K vs 60K samples), so training is quicker
- Test accuracy typically reaches 50-60% with 5-10 epochs (compared to random baseline of 10%)
- Lower accuracy than MNIST due to:
  - Binned rank encoding loses critical information for straights and exact rank matching
  - Small network size (6 hidden neurons) limits learning capacity
  - 10 classes with imbalanced distribution in the dataset
- The network performs best on high card, flush, and pair-based hands
- Performance on straights, full houses, and four-of-a-kind is limited by the encoding

## Use cases

This implementation is particularly useful for:

- exporting trained weights for use in the physical perceptron apparatus
- demonstrating ML on non-visual, symbolic data
- interactive educational demonstrations with real playing cards
- comparing network behaviour across different problem domains (vs MNIST)
- showing that neural networks can learn structured, rule-based classifications
