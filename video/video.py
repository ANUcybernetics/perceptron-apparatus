#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "typer>=0.15",
#   "loguru>=0.7",
#   "httpx>=0.27",
#   "numpy>=2.0",
#   "pedalboard>=0.9",
#   "pyloudnorm>=0.1",
# ]
# ///
"""Build a video's voice, timing, music and renders.

    video/video.py script <slug>    # the spoken lines alone, for reading aloud -> out/<slug>/
    video/video.py voice <slug>     # ElevenLabs voice -> assets/voice.wav, timing.json, captions.vtt
    video/video.py cut <slug>       # recorded takes -> assets/voice.wav, timing.json, captions.vtt
    video/video.py music <slug>     # ElevenLabs music bed -> assets/music.mp3
    video/video.py mix <slug>       # voice + ducked music -> assets/mix.wav, data-duration synced
    video/video.py check <slug>     # HyperFrames check
    video/video.py render <slug>    # 1080p25 draft; --final for the 4K50 master
    video/video.py stills <slug>    # contact sheets from the draft

The script is video/scripts/<slug>.md: each `**VO:**` paragraph under
`## Script` is a spoken line; `_Visual:_` and `_Reads:_` paragraphs are
skipped. `[beat 1.2]` inside a line is a held pause (seconds) and splits the
line into caption segments; a trailing `[beat]` is the gap before the next
line. ElevenLabs returns character timings with the audio, so timing.json
comes straight from the synthesis, with no forced alignment.

`cut` builds the same three files from a recorded voice-over instead, as
<slug>/cut.json directs: `takes` names the recordings, `default` the take most
of the read comes from, and `segments` the exceptions, keyed by reading-copy
line ("9") or line and segment ("9.2"). Each segment is found in its take by
transcript (the last reading of it, so a re-read wins), and the script's
`[beat]` values set every pause between segments; the pauses inside a segment
stay as they were read.

Needs ELEVENLABS_API_KEY in the environment, and ffmpeg/ffprobe on PATH.
"""

import base64
import difflib
import hashlib
import itertools
import json
import math
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

import httpx
import numpy as np
import pedalboard
import pyloudnorm
import typer
from loguru import logger

VIDEO = Path(__file__).resolve().parent
OUT = VIDEO / "out"
CACHE = OUT / "_tts-cache"
API = "https://api.elevenlabs.io/v1"

VOICE_ID = "aRlmTYIQo6Tlg5SlulGC"  # Charlotte: Australian, warm and articulate
VOICE_MODEL = "eleven_multilingual_v2"
VOICE_SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "speed": 1.0}
RATE = 24000  # the highest PCM rate this ElevenLabs plan returns

MUSIC_PROMPT = (
    "Instrumental ambient underscore for a museum exhibit about a wooden calculating "
    "machine. Warm felt piano and soft marimba playing a slow, patient, repeating "
    "pattern over a gentle analogue synth pad. Curious and contemplative, quietly "
    "mechanical like a clock, no drums, no vocals, no build or climax, even dynamics "
    "throughout so it loops unobtrusively. 72 bpm."
)

CUT_RATE = 48000
LOUDNESS = -20.0  # LUFS, the level the mix's music and ducking are set against
# how much of the recording's own room is kept either side of a segment; the
# rest of a pause is room tone, which leaves out its clicks and rustles
HEAD = 0.35
TAIL = 0.3
FADE = 0.03

START_SILENCE = 1.0
END_SILENCE = 0.5
DEFAULT_BEAT = 0.8
DEFAULT_GAP = 0.7
BEAT_RE = re.compile(r"\s*\[beat(?:\s+([\d.]+))?\]\s*")
ENV = {**os.environ, "HYPERFRAMES_NO_TELEMETRY": "1", "HYPERFRAMES_SKIP_SKILLS": "1"}

app = typer.Typer(add_completion=False, no_args_is_help=True)


def project(slug: str) -> Path:
    d = VIDEO / slug
    if not (d / "index.html").is_file():
        sys.exit(f"no composition at {d}")
    return d


def api_key() -> str:
    return os.environ["ELEVENLABS_API_KEY"]


def parse_script(slug: str) -> list[dict]:
    """Spoken lines as [{segments: [text], pauses: [seconds after each segment]}]."""
    md = (VIDEO / "scripts" / f"{slug}.md").read_text()
    after = md.split("## Script", 1)[1]
    lines = []
    for para in (p.strip() for p in re.split(r"\n\s*\n", after) if p.strip()):
        if para.startswith(("_Visual", "_Reads")):
            continue
        joined = " ".join(s.strip() for s in para.splitlines())
        if not joined.startswith("**VO:**"):
            raise RuntimeError(f"{slug}: unrecognised paragraph: {joined[:80]!r}")
        bits = BEAT_RE.split(joined.removeprefix("**VO:**").strip())
        texts = [t.strip() for t in bits[0::2]]
        pauses = [float(d) if d else DEFAULT_BEAT for d in bits[1::2]]
        if texts[-1] == "":
            texts.pop()
        else:
            pauses.append(DEFAULT_GAP)
        lines.append({"segments": texts, "pauses": pauses})
    return lines


@app.command()
def script(slug: str) -> None:
    """Write the spoken lines alone, with their pauses, as a copy to record from.
    Edit the wording in scripts/<slug>.md, not in the copy."""
    parts = [f"{slug}: reading copy of video/scripts/{slug}.md\n"]
    for n, line in enumerate(parse_script(slug), 1):
        parts.append(f"\n{n}.")
        for text, pause in zip(line["segments"], line["pauses"]):
            parts.append(f"   {text}\n      (pause {pause:g} s)")
    out = OUT / slug / f"{slug}-script.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(parts) + "\n")
    print(out)


def synth(text: str, previous: str, following: str) -> dict:
    """One segment's PCM and character timings, cached by its request."""
    body = {
        "text": text,
        "model_id": VOICE_MODEL,
        "voice_settings": VOICE_SETTINGS,
        "previous_text": previous,
        "next_text": following,
        "seed": 7,
    }
    key = hashlib.sha256(
        json.dumps([VOICE_ID, body], sort_keys=True).encode()
    ).hexdigest()[:16]
    cached = CACHE / f"{key}.json"
    if cached.is_file():
        return json.loads(cached.read_text())
    logger.info(f"synthesising: {text}")
    r = httpx.post(
        f"{API}/text-to-speech/{VOICE_ID}/with-timestamps",
        params={"output_format": f"pcm_{RATE}"},
        headers={"xi-api-key": api_key()},
        json=body,
        timeout=120,
    )
    r.raise_for_status()
    data = r.json()
    out = {"text": text, "audio": data["audio_base64"], "alignment": data["alignment"]}
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(json.dumps(out))
    return out


def words_of(alignment: dict, offset: float) -> list[dict]:
    words, cur = [], None
    for ch, s, e in zip(
        alignment["characters"],
        alignment["character_start_times_seconds"],
        alignment["character_end_times_seconds"],
    ):
        if ch.isspace():
            cur = None
            continue
        if cur is None:
            cur = {"w": "", "start": round(offset + s, 3), "end": 0.0}
            words.append(cur)
        cur["w"] += ch
        cur["end"] = round(offset + e, 3)
    return words


def vtt_time(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


@app.command()
def voice(slug: str) -> None:
    """Synthesise the script and write voice.wav, timing.json and captions.vtt."""
    lines = parse_script(slug)
    flat = [t for line in lines for t in line["segments"]]
    pcm = bytearray(int(START_SILENCE * RATE) * 2)
    timing_lines = []
    n = 0
    for line in lines:
        segments, words = [], []
        for text, pause in zip(line["segments"], line["pauses"]):
            seg = synth(
                text, " ".join(flat[max(0, n - 2) : n]), " ".join(flat[n + 1 : n + 3])
            )
            n += 1
            offset = len(pcm) / 2 / RATE
            audio = base64.b64decode(seg["audio"])
            seg_words = words_of(seg["alignment"], offset)
            pcm += audio
            end = offset + len(audio) / 2 / RATE
            segments.append(
                {
                    "caption": text,
                    "start": round(seg_words[0]["start"], 3),
                    "end": round(min(end, seg_words[-1]["end"] + 0.25), 3),
                }
            )
            words += seg_words
            pcm += bytes(int(pause * RATE) * 2)
        timing_lines.append(
            {
                "caption": " ".join(line["segments"]),
                "start": segments[0]["start"],
                "end": segments[-1]["end"],
                "segments": segments,
                "words": words,
            }
        )
    pcm += bytes(int(END_SILENCE * RATE) * 2)
    duration = len(pcm) / 2 / RATE

    proj = project(slug)
    (proj / "assets").mkdir(exist_ok=True)
    with wave.open(str(proj / "assets" / "voice.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(pcm))
    write_timing(slug, timing_lines, duration)


def write_timing(slug: str, timing_lines: list[dict], duration: float) -> None:
    proj = project(slug)
    (proj / "timing.json").write_text(
        json.dumps({"duration": round(duration, 3), "lines": timing_lines}, indent=1)
        + "\n"
    )
    cues = [s for line in timing_lines for s in line["segments"]]
    (proj / "captions.vtt").write_text(
        "WEBVTT\n\n"
        + "\n".join(
            f"{vtt_time(c['start'])} --> {vtt_time(c['end'])}\n{c['caption']}\n"
            for c in cues
        )
    )
    logger.info(f"{slug}: {len(cues)} captions, {duration:.2f} s of voice")


def transcribe(audio: Path) -> list[dict]:
    """A recording's words as [{text, start, end}], cached by its contents."""
    key = hashlib.sha256(audio.read_bytes()).hexdigest()[:16]
    cached = OUT / "_stt-cache" / f"{key}.json"
    if not cached.is_file():
        logger.info(f"transcribing {audio.name}")
        with audio.open("rb") as f:
            r = httpx.post(
                f"{API}/speech-to-text",
                headers={"xi-api-key": api_key()},
                data={
                    "model_id": "scribe_v1",
                    "language_code": "en",
                    "timestamps_granularity": "word",
                    "tag_audio_events": "false",
                },
                files={"file": (audio.name, f)},
                timeout=600,
            )
        r.raise_for_status()
        cached.parent.mkdir(parents=True, exist_ok=True)
        cached.write_text(json.dumps(r.json()))
    return [w for w in json.loads(cached.read_text())["words"] if w["type"] == "word"]


ONES = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
]
TENS = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def spoken(n: int) -> list[str]:
    """A number below a thousand as it is read aloud: 216 is two hundred and sixteen."""
    if n >= 100:
        rest = ["and", *spoken(n % 100)] if n % 100 else []
        return [ONES[n // 100], "hundred", *rest]
    if n >= 20:
        return [TENS[n // 10 - 2], *([ONES[n % 10]] if n % 10 else [])]
    return [ONES[n]]


def tokens(text: str) -> list[str]:
    """Words as they compare between script and transcript: "yes-or-no" is
    three, and the transcript's "36" is thirty, six."""
    found = re.findall(r"[a-z0-9]+", text.lower().replace("'", ""))
    return [w for t in found for w in (spoken(int(t)) if t.isdigit() else [t])]


def same_word(a: str, b: str) -> bool:
    """Equal, or a spelling of the same word (centre and center)."""
    return a == b or difflib.SequenceMatcher(None, a, b).ratio() >= 0.8


def locate(segments: list[str], heard: list[dict]) -> list[tuple[int, int] | None]:
    """Where each script segment is read in a take, as (first, last) indices
    into its words, or None if the take never reads it as written. Works
    backwards from the end, so of two readings the later one is found."""
    flat = [(t, n) for n, w in enumerate(heard) for t in tokens(w["text"])]
    found: list[tuple[int, int] | None] = [None] * len(segments)
    bound = len(flat)
    for n in reversed(range(len(segments))):
        want = tokens(segments[n])
        for j in range(bound - len(want), -1, -1):
            if all(same_word(a, b[0]) for a, b in zip(want, flat[j : j + len(want)])):
                found[n] = (flat[j][1], flat[j + len(want) - 1][1])
                bound = j
                break
    return found


def level(x: np.ndarray, t: float) -> float:
    """RMS level in dB of the 10 ms of x at t."""
    i = int(t * CUT_RATE)
    w = x[max(0, i) : i + CUT_RATE // 100]
    return 20 * math.log10(math.sqrt(float(np.mean(w**2))) + 1e-9) if len(w) else -180.0


def snap(
    x: np.ndarray, t: float, step: float, limit: float, inside: bool = False
) -> float:
    """A word boundary the transcript put inside speech (it does this to
    numbers and single letters), walked outwards (`step` is +-10 ms) to where
    the sound stops, and no further than `limit`. Speech dips for a moment
    between syllables, so it has stopped once it has been quiet for 150 ms."""

    def beyond(u: float) -> float:
        return level(x, u if step > 0 else u + step)

    if not inside and beyond(t) < -35:
        return t
    edge = t
    while (limit - t) * step > 0 and abs(t - edge) < 0.15:
        t += step
        if beyond(t - step) > -45:
            edge = t
    return edge


def quietest(x: np.ndarray, a: float, b: float) -> float:
    """The middle of the quietest 60 ms between a and b: where to cut a pause."""
    width = 0.06
    starts = np.arange(a, max(a + 0.001, b - width), 0.01)
    rms = [
        float(np.mean(x[int(t * CUT_RATE) : int((t + width) * CUT_RATE)] ** 2))
        for t in starts
    ]
    return min(b, float(starts[int(np.argmin(rms))]) + width / 2)


def faded(x: np.ndarray, start: float = FADE, end: float = FADE) -> np.ndarray:
    """x with its ends faded over `start` and `end` seconds."""
    y = x.copy()
    for seconds, ends in ((start, slice(None)), (end, slice(None, None, -1))):
        n = min(int(seconds * CUT_RATE), len(y) // 2)
        if n:
            y[ends][:n] *= np.linspace(0.0, 1.0, n)
    return y


def room_tone(x: np.ndarray, heard: list[dict]) -> np.ndarray:
    """The quietest 0.8 s between words in a take: what silence sounds like there."""
    n = int(0.8 * CUT_RATE)
    best = None
    for a, b in itertools.pairwise(heard):
        for i in range(
            int(a["end"] * CUT_RATE), int(b["start"] * CUT_RATE) - n, n // 4
        ):
            peak = float(np.abs(x[i : i + n]).max())
            if best is None or peak < best[0]:
                best = (peak, i)
    if best is None:
        raise RuntimeError("no pause long enough to take room tone from")
    return x[best[1] : best[1] + n]


def silence(tone: np.ndarray, seconds: float) -> np.ndarray:
    """Room tone for a held pause: the sample, tiled forwards and backwards so
    its joins are continuous."""
    n = max(0, round(seconds * CUT_RATE))
    lap = np.concatenate([tone, tone[::-1]])
    return faded(np.tile(lap, n // len(lap) + 1)[:n])


@app.command()
def cut(slug: str) -> None:
    """Assemble the recorded takes and write voice.wav, timing.json and captions.vtt."""
    proj = project(slug)
    plan = json.loads((proj / "cut.json").read_text())
    lines = parse_script(slug)
    index = [
        (i, k) for i, line in enumerate(lines) for k in range(len(line["segments"]))
    ]
    texts = [lines[i]["segments"][k] for i, k in index]
    pauses = [lines[i]["pauses"][k] for i, k in index]

    audio, heard, where = {}, {}, {}
    meter = pyloudnorm.Meter(CUT_RATE)
    for name, rel in plan["takes"].items():
        wav = subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-i", str(proj / rel), "-ac", "1"]
            + ["-ar", str(CUT_RATE), "-f", "f32le", "-"],
            check=True,
            capture_output=True,
        ).stdout
        x = np.frombuffer(wav, dtype=np.float32).astype(np.float64)
        # every take at one speaking level, so a change of take isn't a change of volume
        audio[name] = x * 10 ** ((LOUDNESS - meter.integrated_loudness(x)) / 20)
        heard[name] = transcribe(proj / rel)
        # a number comes back as one word ("216") timed from its last part:
        # its start is where the sound begins after the word before
        for prev, w in itertools.pairwise(heard[name]):
            if any(c.isdigit() for c in w["text"]):
                w["start"] = snap(
                    audio[name], w["start"], -0.01, prev["end"], inside=True
                )
        where[name] = locate(texts, heard[name])
    tone = room_tone(audio[plan["default"]], heard[plan["default"]])

    # each segment's clip: its words, plus the room either side up to the neighbouring word
    clips = []
    for n, (i, k) in enumerate(index):
        choice = plan.get("segments", {})
        name = choice.get(f"{i + 1}.{k + 1}", choice.get(f"{i + 1}", plan["default"]))
        span = where[name][n]
        if span is None:
            said = " | ".join(
                " ".join(w["text"] for w in heard[name][j : j + 12])
                for j, w in enumerate(heard[name])
                if tokens(w["text"])[:1] == tokens(texts[n])[:1]
            )
            raise RuntimeError(
                f"{slug} {i + 1}.{k + 1}: take {name} doesn't read {texts[n]!r}; it has: {said}"
            )
        x, ws = audio[name], heard[name]
        first, last = span
        before = ws[first - 1]["end"] if first else 0.0
        after = ws[last + 1]["start"] if last + 1 < len(ws) else len(x) / CUT_RATE
        on = snap(x, ws[first]["start"], -0.01, before)
        off = snap(x, ws[last]["end"], 0.01, after)
        clips.append(
            {
                "take": name,
                "span": span,
                "on": on,
                "off": off,
                # the room kept either side, cut where the take is quietest
                "head": on - quietest(x, max(before, on - HEAD), on),
                "tail": quietest(x, off, min(after, off + TAIL)) - off,
                "read": None,
            }
        )
    # where the take carries straight on into the next segment, the pause
    # between them is the one that was read, cut once at its quietest point
    for clip, nxt in itertools.pairwise(clips):
        if nxt["take"] == clip["take"] and nxt["span"][0] == clip["span"][1] + 1:
            split = quietest(audio[clip["take"]], clip["off"], nxt["on"])
            clip["read"] = nxt["on"] - clip["off"]
            clip["tail"] = min(TAIL, split - clip["off"])
            nxt["head"] = min(HEAD, nxt["on"] - split)

    parts = [silence(tone, START_SILENCE - clips[0]["head"])]
    at = len(parts[0]) / CUT_RATE
    timing_lines: list[dict] = []
    for n, ((i, k), clip) in enumerate(zip(index, clips)):
        x, ws = audio[clip["take"]], heard[clip["take"]]
        first, last = clip["span"]
        gap = pauses[n]
        if n + 1 < len(clips):
            # the pause is this clip's tail, room tone, and the next clip's head
            nxt = clips[n + 1]
            room = clip["tail"] + nxt["head"]
            if room > gap:
                clip["tail"], nxt["head"] = (
                    v * gap / room for v in (clip["tail"], nxt["head"])
                )
            fill = gap - clip["tail"] - nxt["head"]
        else:
            fill = gap + END_SILENCE - clip["tail"]
        a = int((clip["on"] - clip["head"]) * CUT_RATE)
        b = int((clip["off"] + clip["tail"]) * CUT_RATE)
        shift = at - a / CUT_RATE
        parts += [
            faded(x[a:b], min(FADE, clip["head"]), min(FADE, clip["tail"])),
            silence(tone, fill),
        ]
        at += (b - a) / CUT_RATE + len(parts[-1]) / CUT_RATE

        # the script's words, each timed by the transcript word it is (part of);
        # where one transcript word ("216") is several of the script's, they
        # share its time out by length
        flat = [m for m in range(first, last + 1) for _ in tokens(ws[m]["text"])]
        spans, t = [], 0
        for w in texts[n].split():
            m = flat[t : t + len(tokens(w))]
            t += len(m)
            if m:  # not punctuation standing alone
                spans.append((w, m[0], m[-1]))
        words = []
        for j, (w, m0, m1) in enumerate(spans):
            start = clip["on"] if m0 == first else ws[m0]["start"]
            end = clip["off"] if m1 == last else ws[m1]["end"]
            sharing = [v for v, a, b in spans if (a, b) == (m0, m1)]
            if m0 == m1 and len(sharing) > 1:
                before = sum(len(v) for v, a, b in spans[:j] if (a, b) == (m0, m1))
                total = sum(len(v) for v in sharing)
                start, end = (
                    start + (end - start) * before / total,
                    start + (end - start) * (before + len(w)) / total,
                )
            words.append(
                {"w": w, "start": round(start + shift, 3), "end": round(end + shift, 3)}
            )
        segment = {
            "caption": texts[n],
            "start": words[0]["start"],
            "end": round(words[-1]["end"] + min(0.25, gap / 2), 3),
        }
        if k == 0:
            timing_lines.append(
                {
                    "caption": " ".join(lines[i]["segments"]),
                    "start": segment["start"],
                    "end": 0.0,
                    "segments": [],
                    "words": [],
                }
            )
        line = timing_lines[-1]
        line["segments"].append(segment)
        line["words"] += words
        line["end"] = segment["end"]
        read = "" if clip["read"] is None else f", read with {clip['read']:.2f}"
        logger.info(
            f"{i + 1}.{k + 1} take {clip['take']} {clip['on']:7.2f}-{clip['off']:7.2f}"
            f"  pause {gap:.2f}{read}  {texts[n]}"
        )

    dry = np.concatenate(parts).astype(np.float32)
    duration = len(dry) / CUT_RATE
    # a rumble filter, breaths and clicks eased down, gentle levelling and a
    # little room; stereo, so the room has width
    board = pedalboard.Pedalboard(
        [
            pedalboard.HighpassFilter(cutoff_frequency_hz=80),
            pedalboard.NoiseGate(
                threshold_db=-42, ratio=2, attack_ms=2, release_ms=120
            ),
            pedalboard.Compressor(
                threshold_db=-24, ratio=2.5, attack_ms=8, release_ms=150
            ),
            pedalboard.Reverb(
                room_size=0.18, damping=0.6, wet_level=0.07, dry_level=1.0, width=1.0
            ),
        ]
    )
    wet = board(np.stack([dry, dry]), CUT_RATE)
    wet *= 10 ** ((LOUDNESS - meter.integrated_loudness(wet.T)) / 20)
    (proj / "assets").mkdir(exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(CUT_RATE)]
        + [
            "-ac",
            "2",
            "-i",
            "-",
            "-af",
            "alimiter=limit=0.84:attack=5:release=80:level=false",
        ]
        + ["-c:a", "pcm_s24le", str(proj / "assets" / "voice.wav")],
        input=wet.T.astype(np.float32).tobytes(),
        check=True,
    )
    write_timing(slug, timing_lines, duration)


def tail(slug: str) -> float:
    m = re.search(r'data-tail="([0-9.]+)"', (project(slug) / "index.html").read_text())
    return float(m.group(1)) if m else 0.0


def total(slug: str) -> float:
    voice_len = json.loads((project(slug) / "timing.json").read_text())["duration"]
    return math.ceil((voice_len + tail(slug)) * 100) / 100


@app.command()
def music(slug: str, seconds: float = 0.0) -> None:
    """Compose the music bed, as long as the video."""
    length = seconds or total(slug)
    logger.info(f"composing {length:.0f} s of music")
    r = httpx.post(
        f"{API}/music",
        params={"output_format": "mp3_44100_128"},
        headers={"xi-api-key": api_key()},
        json={
            "prompt": MUSIC_PROMPT,
            "music_length_ms": int(length * 1000),
            "model_id": "music_v1",
            "force_instrumental": True,
        },
        timeout=600,
    )
    r.raise_for_status()
    (project(slug) / "assets" / "music.mp3").write_bytes(r.content)


@app.command()
def mix(slug: str) -> None:
    """Voice over the music bed (ducked under speech, faded at both ends so
    the loop point is silent) -> assets/mix.wav, and sync data-duration.
    Without assets/music.mp3 the mix is the voice alone."""
    proj = project(slug)
    dur = total(slug)
    voice_in = f"[0:a]aresample=44100,apad=whole_dur={dur}"
    inputs = ["-i", "assets/voice.wav"]
    if (proj / "assets" / "music.mp3").is_file():
        inputs += ["-i", "assets/music.mp3"]
        graph = (
            f"{voice_in},asplit=2[v][key];"
            f"[1:a]aresample=44100,atrim=0:{dur},volume=0.5,"
            f"afade=t=in:d=1.5,afade=t=out:st={dur - 2.5}:d=2.5[m];"
            "[m][key]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=700[duck];"
            "[v][duck]amix=inputs=2:normalize=0,alimiter=limit=0.95[out]"
        )
    else:
        logger.warning(f"{slug}: no assets/music.mp3, mixing the voice alone")
        graph = f"{voice_in}[out]"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", graph]
        + ["-map", "[out]", "-ac", "2", "-t", f"{dur}", "assets/mix.wav"],
        cwd=proj,
        check=True,
    )
    html = proj / "index.html"
    src = html.read_text()
    new = re.sub(r'data-duration="[0-9.]+"', f'data-duration="{dur:.2f}"', src)
    if new != src:
        html.write_text(new)
    logger.info(f"{slug}: {dur:.2f} s")


def npm(slug: str, *args: str) -> None:
    subprocess.run(["npm", "run", *args], cwd=project(slug), env=ENV, check=True)


@app.command()
def check(slug: str) -> None:
    """Run the HyperFrames check."""
    npm(slug, "check")


@app.command()
def render(slug: str, final: bool = False) -> None:
    """Render a 1080p25 draft, or with --final the 4K50 master."""
    out = OUT / slug
    out.mkdir(parents=True, exist_ok=True)
    if final:
        opts = ["--resolution", "landscape-4k", "--fps", "50", "--quality", "high"]
        target = out / f"{slug}.mp4"
    else:
        opts = ["--quality", "draft", "--fps", "25"]
        target = out / f"{slug}-draft.mp4"
    npm(slug, "render", "--", *opts, "--quiet", "--output", str(target))
    print(target)


@app.command()
def stills(slug: str, video: str = "") -> None:
    """A still at the start and middle of every caption, as contact sheets."""
    src = Path(video) if video else OUT / slug / f"{slug}-draft.mp4"
    out = OUT / slug / "stills"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.png"):
        old.unlink()
    t = json.loads((project(slug) / "timing.json").read_text())
    times: list[float] = []
    for line in t["lines"]:
        for seg in line["segments"]:
            times += [
                seg["start"] + 0.3,
                (seg["start"] + seg["end"]) / 2,
                seg["end"] + 0.3,
            ]
    times += [t["duration"] + x for x in (1.0, 3.0, tail(slug) - 0.2)]
    frames = []
    for at in times:
        f = out / f"{at:07.2f}.png"
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", str(src)]
            + ["-frames:v", "1", "-vf", "scale=960:-1", str(f)],
            check=True,
        )
        frames.append(f)
    for i in range(0, len(frames), 9):
        sheet = out / f"sheet-{i // 9 + 1:02d}.png"
        subprocess.run(
            ["montage", *map(str, frames[i : i + 9]), "-tile", "3x3"]
            + ["-geometry", "960x540+4+4", "-background", "#333", str(sheet)],
            check=True,
        )
        print(sheet)


if __name__ == "__main__":
    app()
