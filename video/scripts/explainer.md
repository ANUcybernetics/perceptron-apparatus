# Explainer

Plays on a loop, with sound, on a large display beside the apparatus, for
visitors and passers-by when nobody who knows the apparatus is around.

## Key idea

This table is a working neural network: the same multiply-and-add that underpins
modern AI, slowed down and scaled up until you can watch every step.

## One example

A handwritten 7 (`sampleDigits` in `js/src/widgets/sample-digits.ts`) through
the bundled MNIST weights. Every slider position and every number on screen
comes from `computeTrace`; the network really does answer 7 (E7 = 0.92, next
highest 0.11).

## Script

**VO:** This table is a computer. [beat 0.5] No electricity, no chips: just
plywood, brass sliders and a circular slide rule. [beat 0.9]

_Visual:_ the apparatus at rest, top-down, white line on black with its sliders
in gold; the title beside it. The sliders glint on "brass sliders"; the outer
log ring turns on "slide rule".

_Reads (draft):_ 1. the drawing is the table beside you; 2. the gold marks are
its sliders; 3. the outer ring turns, and it is a slide rule.

**VO:** It runs a neural network, the same arithmetic that underpins modern AI.
[beat 1.0]

_Visual:_ a conventional network diagram (36, 6 and 10 nodes, joined) draws on
beside the apparatus; each column lights in gold together with its ring.

_Reads (draft):_ 1. a neural network is layers of numbers joined by
connections; 2. each layer is one ring of the table.

**VO:** Start with a handwritten digit, [beat 0.4] shrunk to thirty-six squares.
[beat 0.8] Each square sets one slider on the outer ring: [beat 0.5] the more
ink, the further it slides. [beat 1.2]

_Visual:_ a 7 is written, then becomes its 6×6 grid of ink values. The squares
light in turn as their sliders on ring A slide out. The camera walks round the
table and pushes in on three neighbouring sliders, which slide in turn as their
three squares light: dark, bright, mid.

_Reads (draft):_ 1. the digit becomes 36 squares; 2. each square owns one
slider; 3. a darker square pushes its slider further.

**VO:** The next ring holds the weights: numbers the network learned from
thousands of handwritten digits. [beat 0.8] They are everything it knows. [beat
1.0]

_Visual:_ ring B lights; a mosaic of real training digits flickers past while
the 216 weight sliders settle into their trained positions, then hold.

_Reads (draft):_ 1. the second ring is the weights; 2. they came from many
example digits; 3. they are now fixed.

**VO:** Now the work. [beat 0.5] Take an input, [beat 0.7] take its weight,
[beat 0.7] and multiply them on the slide rule. [beat 1.6] Add the answer to a
slider in the hidden ring. [beat 1.6]

_Visual:_ push in on one part of the table. One input slider and its weight
slider are ringed in gold and their values written out as a sum beside the
table. The log ring turns to make the product, which is written in; the hidden
slider it belongs to moves by that much (down: the weight is negative).

_Reads (draft):_ 1. one input value; 2. one weight value; 3. the slide rule
gives their product; 4. the product moves a hidden-ring slider.

**VO:** Then do it again. [beat 0.5] Two hundred and sixteen times. [beat 3.2]

_Visual:_ the same step repeats, accelerating, round the whole table: a counter
runs to 216 while the six hidden sliders accumulate.

_Reads (draft):_ 1. the step is the same every time; 2. there are 216 of
them; 3. the hidden sliders end up somewhere.

**VO:** Anything that ends up below zero goes back to zero. [beat 1.4]

_Visual:_ push in on the hidden ring; the three sliders sitting below zero are
marked, then slide back to zero.

_Reads (draft):_ 1. some hidden sliders are below zero; 2. those return to zero,
the others stay.

**VO:** One more ring of weights, sixty more multiplications, [beat 2.4] and the
ten inner sliders hold the answer. [beat 0.8] The one that has travelled
furthest wins. [beat 0.9] It's a seven. [beat 2.2]

_Visual:_ ring D lights and its sixty steps run to the counter; push in on the
inner ring, its ten sliders labelled 0 to 9. Slider 7 has gone furthest; it
turns gold and a 7 lands in the centre of the table.

_Reads (draft):_ 1. a second set of weights, 60 more steps; 2. ten sliders, one
per digit; 3. slider 7 is furthest; 4. the answer is 7, the digit that went in.

**VO:** By hand, that takes the best part of an hour. [beat 1.0] A chip in a
data centre does the same sums trillions of times a second. [beat 1.2]

_Visual:_ a clock hand sweeps most of the way round the table's rim. Then the
table shrinks, logarithmically, into one of thousands of identical tiny tables
packed inside the outline of a chip.

_Reads (draft):_ 1. one pass takes most of an hour; 2. a chip is the same thing,
tiny and vastly multiplied.

**VO:** But nothing different is happening in there. [beat 0.5] It is
multiplying and adding, all the way down. [beat 1.2] Here, you can watch every
step. [beat 1.5]

_Visual:_ push back in through the chip to the one table, its answer still
standing. Hold.

_Reads (draft):_ 1. inside the chip is this same table; 2. this one is the one
you can see.
