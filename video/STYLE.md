# Perceptron Apparatus video style

The project half of the `styled-video` skill (in Ben's `ben` plugin): the skill
carries the method and the craft, this file carries what is particular to the
apparatus.

## Where things live

- `scripts/<slug>.md`: each video's key idea, its one example and its script,
  with a `_Visual:_` direction and a `_Reads:_` list per stretch of picture. Ben
  owns the script and approves the reads; a read still marked `(draft)` has not
  been approved. `video.py` skips `_Visual` and `_Reads` paragraphs.
  `[beat 1.2]` inside a spoken line is a held pause in seconds, and splits the
  line into caption segments.
- `<slug>/`: the HyperFrames project: `index.html`, `<slug>.js` (the
  composition), `timing.json` and `captions.vtt` (written by `video.py voice` or
  `video.py cut`), `cut.json` (which recorded take each line comes from),
  `assets/` (audio, not committed) and a `kit -> ../_kit` symlink.
- `_kit/`: `kit.css` (the stage, palette and type), `fonts/`, `photos/`,
  `socy-logo.svg`, `mnist-digits.json` (from `build-data.mjs`), and two
  symlinks: `motion ->` astromotion's `video/` engine in `video/node_modules`
  and `apparatus -> ../../js/dist`, the digital twin. Run `pnpm install` in
  `video/` first.
- `out/`: renders, stills and the TTS cache (gitignored).

`video.py`'s docstring lists the build commands.

## Sources of truth

- **The apparatus** is drawn by the digital twin (`js/`), never redrawn. A
  composition drives it as a pure function of time through `setSlider` and
  `setLogRingRotation`; the twin's own animator and CSS transitions are not used
  (a video frame must not depend on a clock).
- **Every number and slider position** comes from `computeTrace` on a real input
  with the bundled weights. Never pick a value because it reads better.
- **Palette**: `anu-colors` in `anu-typst-template` (gold `#be830e`); `kit.css`
  carries copies.
- **Type**: Public Sans, the ANU theme's face, from `_kit/fonts/`.

## The look

- **White line on black, gold accents.** The table is fine white linework on a
  black ground. Gold is for the brass sliders and for whatever the viewer should
  be looking at: a lit ring, a ringed slider, a result.
- **The view is from directly above the table.** The camera may push in and may
  walk round the table (rotate it) so that the labels in a close-up read
  upright. The drawing has no perspective.
- **Photographs open a video, and only that.** Andrew Meares's studio
  photographs (`_kit/photos/`, exported from the set in the `studio-photos`
  memory) show that the apparatus has been built. They run full-frame, behind
  the caption band too, under the scrim of the decks' hero slide (black, 20% at
  the top to 80% at the bottom), with the title block over them: the white ANU
  and School of Cybernetics logo, the title in white with a gold rule, the
  tagline and the byline.
- **Light type.** Display type is Public Sans at weight 300, as in the ANU
  theme; never a heavy weight for a title.
- **The left of the frame is the working-out**: the input grid, the sum, the
  counter. The table keeps the right. A close-up that would spill the table into
  the left is masked there (the composition's `shade`), or takes the whole frame
  with the left cleared.
- **Square corners**, as in the ANU theme.
- **Captions** sit in a 190 px band below the scene, one sentence at a time, and
  are always on: the display may be muted or the room loud.
- **It loops.** A video for the display beside the table starts and ends on
  black, with the sound faded to silence at the loop point.
- **It closes on the lockup.** After the table has returned to rest with the
  title and credits, the School of Cybernetics lockup (`_kit/socy-logo.svg`,
  from astro-theme-anu's `SocyLogo.astro`) animates as on the decks' closing
  slide: the rules grow, then the crest and wordmark fade in.
- **Stage** 1920×1080; masters 4K at 50 fps, drafts 1080p25.

## Sound

The voice is Ben's recording, assembled from the takes in `assets/` by
`video.py cut`; its docstring explains `cut.json`. The script's `[beat]` values
set every pause in the cut, so retiming a pause is one number and a rebuild.
`video.py voice` makes an ElevenLabs scratch voice for a video not yet recorded;
the voice and model are constants at the top of `video.py`.

The music is a track Ben supplies as `assets/music.mp3` (the explainer's is "QB"
by Sega Williams). `video.py mix` sets its level, ducks it under the voice and
fades it to silence at the loop point; `<slug>/music.json` lengthens a track
shorter than the video, as `video.py`'s docstring explains.
