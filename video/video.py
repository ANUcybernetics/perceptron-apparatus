#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "typer>=0.15",
#   "loguru>=0.7",
#   "httpx>=0.27",
# ]
# ///
"""Build a video's voice, timing, music and renders.

    video/video.py script <slug>    # the spoken lines alone, for reading aloud -> out/<slug>/
    video/video.py voice <slug>     # ElevenLabs voice -> assets/voice.wav, timing.json, captions.vtt
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

Needs ELEVENLABS_API_KEY in the environment, and ffmpeg/ffprobe on PATH.
"""

import base64
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

import httpx
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
