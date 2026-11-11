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
    px: int,
    inset: int,
) -> None:
    """A camera's name, vertically centred on `at`, in a style: on a bar (the rectangle
    `bar`), its left end at `at`; in a pill with rounded ends, as wide as the name and
    `inset` in from the bar's left; or none (not drawn at all). `px` is the name's size:
    a pill's padding is in step with it, wide enough that its curve clears the text."""
    if style == "none":
        return
    if style == "bar":
        draw.rectangle(bar, fill=seen.back)
    else:
        # Its height is the size's, not the text's: a name with no tails ("Mill") would
        # otherwise get a shorter pill than one with ("Piggery").
        pad, half = round(px * 0.5), round(px * 0.7)
        at = (bar[0] + inset + pad, at[1])
        box = draw.textbbox(at, text, font=font, anchor="lm")
        ends = (box[0] - pad, at[1] - half, box[2] + pad, at[1] + half)
        draw.rounded_rectangle(ends, radius=half, fill=seen.back)
    draw.text(at, text, fill=seen.colour, font=font, anchor="lm")
