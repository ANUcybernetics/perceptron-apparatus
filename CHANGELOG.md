# Changelog

Design changes to the Perceptron Apparatus: the physical device, the trained
weights and the public interfaces of the code.

## Unreleased

The previous design is preserved at the `linear-weight-scale` tag.

### Weight scale

- Weight sliders (rings B and D) now carry a log scale of magnitude: a zero
  position at the outer end of the slot, then 0.02 to 5 with labels on the 1-2-5
  series. The first design had a linear scale from -5 to 5.
- Sign is no longer a position on the scale. A negative weight is shown by its
  marker, which the digital twin draws hollow. The physical marker for a
  negative weight is still to be designed.
- This changes the engraving on both weight rings, so an existing board needs
  those rings re-cut to use the new weights.

With the first design's MNIST weights, a 1% error in slider position cut test
accuracy from 45.8% to 35.4% on the linear scale. With the new weights on the
new scale the same error cuts it from 67.4% to 65.4%.

### Training

- Training uses softmax cross-entropy in place of mean squared error, which
  raises MNIST test accuracy at 6 hidden units from about 50% to about 70%.
- Output weights are non-negative by default, and every weight is perturbed by
  random noise on each training step so that the weights tolerate slider error.
- Exported weights are fitted to the slider ranges
  (`MLP.fit_weights_to_apparatus/2`, `fitWeightsToApparatus`) in place of being
  scaled to a maximum of 5. Hidden and output sliders now stay within their
  scales while accumulating, which the old scaling did not guarantee.
- Exported weight files are padded to the 36-input, 10-output board, and their
  `test_accuracy` is that of the weights as written.

### Tasks

- Added animal classification (UCI Zoo) and next-letter prediction, each with
  exported weights, an Elixir data module and a digital-twin input widget.
- Removed the poker hand task. Its weights predicted "nothing in hand" for
  almost every hand.

### Breaking changes to the code

- `mix perceptron.export_poker_weights` is gone, and
  `mix perceptron.export_weights` takes `--task mnist|zoo|letters`. Its
  `--scale` and `--target-max` options are replaced by `--no-fit`.
- `PerceptronApparatus.Poker` and `MLP.scale_weights_to_range/2` are removed.
  `MLP.write_weights_to_json/3` takes `:fit_to`, `:pad_to` and `:test_data` in
  place of `:scale_to_range` and `:target_max`.
- In the TypeScript package, `PokerInputWidget`, `encodeHand`,
  `POKER_HAND_NAMES` and `pokerWeights` are removed in favour of
  `ZooInputWidget`, `LettersInputWidget` and their weights. `scaleWeights` is
  replaced by `fitWeightsToApparatus`, and the `weightClamp` training option by
  `nonnegativeOutput` and `weightNoise`.
- `setSlider` on a weight slider positions it on the log scale and sets
  `data-sign` on the slider element.
