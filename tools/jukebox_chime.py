#!/usr/bin/env python3
"""Make Jukebox's own chime: two falling notes, each struck and left to ring.

NEVER TEST THIS: run it after changing the sound, and listen to the result.

    .venv/bin/python tools/jukebox_chime.py

Writes integration/custom_components/casa_mia_jukebox/www/chime.wav (mono, 16 bit,
22.05 kHz, about 60 KB). Made here so that the sound is ours to ship.
"""

import math
import struct
import wave
from pathlib import Path

OUT = (
    Path(__file__).resolve().parents[1]
    / "integration/custom_components/casa_mia_jukebox/www/chime.wav"
)
RATE = 22050
SECONDS = 1.4
# Each note: when it is struck (s) and its pitch (Hz). E5 then C5.
NOTES = ((0.0, 659.25), (0.45, 523.25))
# A bell's overtones over its pitch, each quieter than the last.
PARTIALS = ((1, 1.0), (2, 0.35), (3, 0.12))


def sample(t: float) -> float:
    total = 0.0
    for start, pitch in NOTES:
        since = t - start
        if since < 0:
            continue
        # Struck over 5 ms so it doesn't click, then dying away.
        loudness = min(since / 0.005, 1.0) * math.exp(-since * 4.5)
        total += loudness * sum(
            gain * math.sin(2 * math.pi * pitch * times * since)
            for times, gain in PARTIALS
        )
    return total


def main() -> None:
    values = [sample(n / RATE) for n in range(round(RATE * SECONDS))]
    peak = max(abs(v) for v in values)
    frames = b"".join(struct.pack("<h", round(v / peak * 0.8 * 32767)) for v in values)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(RATE)
        out.writeframes(frames)
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
