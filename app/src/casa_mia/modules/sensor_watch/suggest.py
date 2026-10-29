"""Suggested records from a sensor's history: plain statistics, nothing from Home
Assistant here (history.py fetches the samples).

The history is assumed to be mostly normal. Samples further than OUTLIER standard
deviations from the mean are set aside and listed (they may be incidents worth a look);
the rest give the nominal band, rounded outwards to a tidy step, with a warning band
either side (MARGIN of its width) and error beyond. The user confirms before saving."""

from __future__ import annotations

import math
import statistics
from typing import Any

OUTLIER = 3.0  # standard deviations
MARGIN = 0.25  # each warning band, as a share of the nominal band's width
MAX_OUTLIERS = 20  # listed
MAX_SEEN = 12  # states listed with their time, for exact states


def tidy_step(width: float) -> float:
    """A round step a tenth of the width's order: 37 -> 1, 0.42 -> 0.01."""
    return 10 ** math.floor(math.log10(width)) / 10 if width > 0 else 1.0


def _round(value: float, step: float) -> float:
    digits = max(0, -math.floor(math.log10(step)))
    return round(value, digits)


def numeric(samples: list[float]) -> dict[str, Any] | None:
    """Statistics of the samples and suggested bands; None with no samples."""
    if not samples:
        return None
    mean = statistics.fmean(samples)
    std = statistics.pstdev(samples)
    far = lambda x: std > 0 and abs(x - mean) > OUTLIER * std  # noqa: E731
    keep = [x for x in samples if not far(x)]
    outliers = sorted({x for x in samples if far(x)}, key=lambda x: -abs(x - mean))
    low, high = min(keep), max(keep)
    step = tidy_step(high - low or abs(high) * 0.1 or 1.0)
    low = _round(math.floor(low / step) * step, step)
    high_n = math.ceil(high / step) * step
    if high_n <= high:  # bands end before `to`: the highest normal value must be inside
        high_n += step
    high = _round(high_n, step)
    margin = _round(max(step, math.ceil((high - low) * MARGIN / step) * step), step)
    below, above = _round(low - margin, step), _round(high + margin, step)
    return {
        "count": len(samples),
        "mean": mean,
        "std": std,
        "min": min(samples),
        "max": max(samples),
        "outliers": outliers[:MAX_OUTLIERS],
        "outlier_count": len(outliers),
        # How many are low (the rest are high): the page says "31 low, down to 216.1"
        # rather than list ordinary dips (an outlier on a side is its min or max).
        "outliers_below": sum(1 for x in outliers if x < mean),
        "bands": [
            {"from": None, "to": below, "level": "error", "message": ""},
            {"from": below, "to": low, "level": "warning", "message": ""},
            {"from": low, "to": high, "level": "nominal", "message": ""},
            {"from": high, "to": above, "level": "warning", "message": ""},
            {"from": above, "to": None, "level": "error", "message": ""},
        ],
    }


def binary(seconds: dict[str, float]) -> dict[str, Any] | None:
    """The state it spends most of its time in is nominal; None with no time seen."""
    shares = {s: t for s, t in seconds.items() if s in ("on", "off") and t > 0}
    total = sum(shares.values())
    if not total:
        return None
    nominal = max(shares, key=lambda s: shares[s])
    return {
        "nominal": nominal,
        "share": shares[nominal] / total,
        "seconds": shares,
        "other": "warning",
    }


def states(seconds: dict[str, float]) -> dict[str, Any] | None:
    """Exact states: the one it spends most of its time in is nominal (unavailable and
    unknown aside); None with no time seen."""
    shares = {
        s: t
        for s, t in seconds.items()
        if s not in ("unavailable", "unknown") and t > 0
    }
    total = sum(shares.values())
    if not total:
        return None
    nominal = max(shares, key=lambda s: shares[s])
    return {
        "states": [nominal],
        "share": shares[nominal] / total,
        "seconds": dict(sorted(shares.items(), key=lambda kv: -kv[1])[:MAX_SEEN]),
        "other": "error",
    }
