---
id: TASK-12
title: >-
  Re-cut the explainer video to Ben's recorded voice-over and render the 4K
  master
status: In Progress
assignee: []
created_date: '2026-10-12 00:45'
updated_date: '2026-10-12 06:57'
labels:
  - video
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The explainer (video/explainer, script in video/scripts/explainer.md) is timed to an ElevenLabs scratch voice. Ben is recording the real voice-over from the reading copy and will supply the audio file. The video then needs retiming to that recording and a final 4K render for the display beside the apparatus.

Context for whoever picks this up:
- video/video.py voice writes assets/voice.wav, timing.json and captions.vtt from ElevenLabs character timings. There is no path yet for a supplied recording: it needs word timings from a transcript (the styled-video skill's scripts/transcribe.py, faster-whisper) aligned to the script's lines and [beat] segments, written in the same timing.json shape.
- The composition takes every cue from timing.json by line index, segment index and word (T.word, seg). If the recording departs from the script, update the script to what was said, then re-point any cue whose word changed.
- Pauses in the recording replace the script's [beat] values; several animations run inside a pause (the 216-step run, the weight glides, the two fast passes), so check each has enough time and adjust the animation, not the audio.
- There is no music bed (no assets/music.mp3); video.py music composes one at the video's length via ElevenLabs. Ask Ben whether he wants it before generating.
- The script's reads are still marked (draft); Ben approves them by deleting the marker.
- Follow video/STYLE.md and the ben:styled-video skill.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The video's voice is Ben's recording, with no synthesised speech left in the mix
- [x] #2 timing.json and captions.vtt come from the recording, and every caption matches what is said
- [x] #3 Each animation cue lands on the word that names it, checked on stills around every cue and by watching the draft at speed with sound
- [x] #4 No animation that runs inside a pause is cut short or left waiting
- [x] #5 video.py check passes, and the script matches the recording word for word
- [ ] #6 A 4K 50 fps master is rendered and its first and last frames checked for missing fonts or assets
- [ ] #7 Ben has confirmed the music decision (bed or none) and the master reflects it
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Voice path built: video.py cut assembles the takes named in video/explainer/cut.json (take 2 throughout, take 1 for reading-copy lines 9 and 11, where take 2 ran straight through a pause an animation needs, or departed from the script). The script's [beat] values now hold the pauses of the cut: Ben's own take-2 pauses wherever an animation doesn't need longer. Script updated to what was said ("a mammal", "It's multiplying"). Cues checked on stills; #3 still needs the draft watched at speed with sound, which is Ben's to do. Master (#6) waits on the music bed (#7), which Ben is organising.

2026-10-12: Ben has watched the draft with sound and is happy with the cut in general. Next: Ben chooses the background music (he is supplying a track, not generating one with video.py music) and puts it at video/explainer/assets/music.mp3. Then: video.py mix, a 1080p draft for Ben to hear, check whether the music swells too much in the 2-3 s animation pauses (if so slow the sidechain release or reduce the ducking in mix), listen at the two take changes (reading-copy lines 9 and 11), then video.py render --final for the 4K50 master and check its first and last frames. The takes are not in git: they are in video/explainer/assets/ on this machine and in ~/Downloads on daysy.
<!-- SECTION:NOTES:END -->
