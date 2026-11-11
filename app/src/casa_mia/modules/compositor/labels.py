"""The cameras' name labels on a commander's picture: their font, size, colours and style,
set per commander (its `labels`; the options and their defaults are labels.json's).

The fonts are files, because a picture can only be drawn with a font the app holds. They
live once, in the casa_mia component's www/fonts, so the Camera Commander card and the
admin page show a name in the very font the compositor draws it in. "standard" is
Pillow's own built-in font, the only one there was before 2026.11.5-b10."""

from __future__ import annotations

import functools
import logging
from typing import Any, NamedTuple

from PIL import ImageDraw, ImageFont

from ...components import COMPONENTS
from .common import LABELS

_LOGGER = logging.getLogger(__name__)

OPTIONS: dict[str, dict[str, Any]] = LABELS["labels"]
DEFAULTS: dict[str, Any] = {k: o["default"] for k, o in OPTIONS.items()}
FILES: dict[str, str] = LABELS["fonts"]  # a font's name -> its file
FONTS = COMPONENTS / "casa_mia" / "www" / "fonts"

Colour = tuple[int, int, int, int]


@functools.lru_cache(maxsize=64)
def font(name: str, size: int) -> Any:
    """The font `name` at `size` px. One whose file can't be read is said in the log (once
    for each size, as the answer is kept) and drawn in the standard font: a label in
    another font is better than a commander with no picture."""
    if name in FILES:
        try:
            return ImageFont.truetype(str(FONTS / FILES[name]), size)
        except OSError as err:
            _LOGGER.error(
                "compositor: the label font %s (%s) can't be read: %s; "
                "drawing in the standard font",
                name,
                FONTS / FILES[name],
                err,
            )
    return ImageFont.load_default(size=size)


def rgba(colour: str, opacity: float = 100) -> Colour:
    """#rrggbb at an opacity (%), as Pillow's fill."""
    r, g, b = (int(colour[i : i + 2], 16) for i in (1, 3, 5))
    return r, g, b, round(255 * opacity / 100)


class Look(NamedTuple):
    """How a commander's labels are drawn, at its picture's scale."""

    small: Any  # a tile's name, and the notes on a tile
    font: Any  # the main camera's name and the clock
    big: Any  # "Changing to ..."
    tile_px: int
    main_px: int
    colour: Colour
    back: Colour
    tile_style: str  # bar, pill or none
    main_style: str


def look(cmd: dict) -> Look:
    """A commander's labels, each setting it lacks at its default, sized for its scale
    (a screen's device pixels to a CSS pixel, for a picture drawn at a size asked for)."""
    o = {**DEFAULTS, **(cmd.get("labels") or {})}
    scale = float(cmd.get("scale", 1))
    tile_px, main_px = round(o["tile_size"] * scale), round(o["main_size"] * scale)
    return Look(
        font(o["font"], tile_px),
        font(o["font"], main_px),
        font(o["font"], main_px * 2),
        tile_px,
        main_px,
        rgba(o["colour"]),
        rgba(o["tint"], o["opacity"]),
        o["tile_style"],
        o["main_style"],
    )


def name(
    draw: ImageDraw.ImageDraw,
    text: str,
    at: tuple[int, int],
    font: Any,
    seen: Look,
    style: str,
    bar: tuple[int, int, int, int],
    pad: tuple[int, int],
) -> None:
    """A camera's name, its left end at `at` (vertically centred there), in a style: on
    a bar (the rectangle `bar`), in a pill (its own size, `pad` round it), or none (not
    drawn at all)."""
    if style == "none":
        return
    if style == "bar":
        draw.rectangle(bar, fill=seen.back)
    else:
        box = draw.textbbox(at, text, font=font, anchor="lm")
        draw.rectangle(
            (box[0] - pad[0], box[1] - pad[1], box[2] + pad[0], box[3] + pad[1]),
            fill=seen.back,
        )
    draw.text(at, text, fill=seen.colour, font=font, anchor="lm")
