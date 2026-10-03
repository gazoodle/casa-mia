"""QR codes in the house style of the printed guest cards: a square black tile holding a
white card with rounded corners, black modules on the card."""

from __future__ import annotations

import io

import segno
from PIL import Image, ImageDraw

SIZE = 600  # PNG pixels; the printed cards were 300px, this is the same at 2x
FRAME = 0.04  # black border around the white card, as a share of the image
RADIUS = 0.07  # the white card's corner radius
PAD = 0.06  # white space between the card's edge and the modules


def _matrix(text: str) -> list[list[bool]]:
    return [
        [bool(m) for m in row]
        for row in segno.make(text, error="m", boost_error=False).matrix
    ]


def png(text: str, size: int = SIZE) -> bytes:
    rows = _matrix(text)
    img = Image.new("RGB", (size, size), "black")
    draw = ImageDraw.Draw(img)
    stroke = round(size * FRAME)
    draw.rounded_rectangle(
        (stroke, stroke, size - 1 - stroke, size - 1 - stroke),
        radius=round(size * RADIUS),
        fill="white",
    )
    inner = size - 2 * (stroke + round(size * PAD))
    cell = inner // len(rows)
    origin = (size - cell * len(rows)) // 2
    for y, row in enumerate(rows):
        for x, on in enumerate(row):
            if on:
                x0, y0 = origin + x * cell, origin + y * cell
                draw.rectangle((x0, y0, x0 + cell - 1, y0 + cell - 1), fill="black")
    out = io.BytesIO()
    img.save(out, "PNG", optimize=True)
    return out.getvalue()


def svg(text: str) -> bytes:
    rows = _matrix(text)
    n = len(rows)
    stroke, pad = SIZE * FRAME, SIZE * PAD
    cell = (SIZE - 2 * (stroke + pad)) / n
    origin = (SIZE - cell * n) / 2
    path = "".join(
        f"M{origin + x * cell:.2f} {origin + y * cell:.2f}h{cell:.2f}v{cell:.2f}h-{cell:.2f}z"
        for y, row in enumerate(rows)
        for x, on in enumerate(row)
        if on
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}">'
        f'<rect width="{SIZE}" height="{SIZE}" fill="#000"/>'
        f'<rect x="{stroke}" y="{stroke}" width="{SIZE - 2 * stroke}" '
        f'height="{SIZE - 2 * stroke}" rx="{SIZE * RADIUS}" fill="#fff"/>'
        f'<path d="{path}" fill="#000" shape-rendering="crispEdges"/></svg>'
    ).encode()
