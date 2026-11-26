"""The cameras' name labels on a commander's picture: their font, size, colours and style,
set per commander (its `labels`; the options and their defaults are labels.json's).

The fonts are files, because a picture can only be drawn with a font the app holds. They
live once, in the casa_mia component's www/fonts, so the Camera Commander card and the
admin page show a name in the very font the compositor draws it in. "standard" is
Pillow's own built-in font, the only one there was before 2026.11.5-b10."""

from __future__ import annotations

import functools
import logging
import math
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

KEEP: dict[str, Any] = LABELS["picture"]["main_keep"]  # the part of a cropped main kept
NAME: dict[str, int] = LABELS["name"]  # a name's least and most, in CSS px


def name_px(which: str, setting: float, side: float, scale: float = 1) -> int:
    """A name's height, in the picture's own pixels (`scale` of them to a CSS px), for
    a place whose shorter side is `side` of them. A tile's: `setting` % of that side,
    between its floor and its cap. The main camera's (`setting` % of it): 0.9 x the
    square root of the side in CSS px, between its floor and its cap (owner, 2026-11-27,
    from a phone, two wall tablets and a Mac: a straight share made it 30 px over a
    desktop's large main camera, where 13 to 15 were wanted). The card's is the same sum,
    and on a device with a mouse a fixed size the compositor can't know of
    (integration/cards/src/labels.ts: nameSize)."""
    if which == "tile":
        css = min(
            NAME["tile_cap"], max(NAME["tile_floor"], setting * side / scale / 100)
        )
    else:
        root = NAME["main_root"] * math.sqrt(side / scale)
        css = min(NAME["main_cap"], max(NAME["main_floor"], root)) * setting / 100
    return int(css * scale + 0.5)


@functools.lru_cache(maxsize=1024)
def fitted(text: str, font: Any, room: int) -> str:
    """`text` as it fits in `room` px: whole, or cut short with … at its end, or
    nothing when not even two letters and the … fit. Kept, as the same names are drawn
    in the same tiles every couple of seconds."""
    if font.getlength(text) <= room:
        return text
    for end in range(len(text) - 1, 1, -1):
        short = text[:end].rstrip() + "…"
        if font.getlength(short) <= room:
            return short
    return ""


def keep(cmd: dict) -> tuple[float, float]:
    """Where a commander's main camera is cropped about (its `main_keep`), as Pillow's
    centering: 0 keeps the left or the top, 1 the right or the foot, 0.5 the middle."""
    part = str(cmd.get("main_keep") or KEEP["default"])
    across = 0.0 if "left" in part else 1.0 if "right" in part else 0.5
    down = 0.0 if "top" in part else 1.0 if "bottom" in part else 0.5
    return across, down


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


def look(cmd: dict, tile_side: float, main_side: float) -> Look:
    """A commander's labels, each setting it lacks at its default, sized for the picture
    being drawn: a tile's name from the shorter side of its smallest tile (`tile_side`,
    so every tile's name is one size), the main camera's from the shorter side of its
    place (`main_side`), both in the picture's own pixels."""
    o = {**DEFAULTS, **(cmd.get("labels") or {})}
    scale = float(cmd.get("scale", 1))
    tile_px = name_px("tile", o["tile_share"], tile_side, scale)
    main_px = name_px("main", o["main_scale"], main_side, scale)
    # A card being tuned (its debug on, compositor.sized): the sizes it asked for.
    tuned = cmd.get("tuned") or {}
    tile_px = round(tuned["tile"] * scale) if tuned.get("tile") else tile_px
    main_px = round(tuned["main"] * scale) if tuned.get("main") else main_px
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
    a pill's padding is in step with it, wide enough that its curve clears the text.
    A name too long for the bar's width is cut short (`fitted`), never drawn over the
    next tile; one with no room at all is left out, and so is its pill."""
    if style == "none":
        return
    pad, half = round(px * 0.5), round(px * 0.7)
    # as far in from the right as from the left
    left = at[0] if style == "bar" else bar[0] + inset + pad
    text = fitted(text, font, bar[2] - left - (left - bar[0]))
    if style == "bar":
        draw.rectangle(bar, fill=seen.back)
    elif not text:
        return
    else:
        # Its height is the size's, not the text's: a name with no tails ("Mill") would
        # otherwise get a shorter pill than one with ("Piggery").
        at = (left, at[1])
        box = draw.textbbox(at, text, font=font, anchor="lm")
        ends = (box[0] - pad, at[1] - half, box[2] + pad, at[1] + half)
        draw.rounded_rectangle(ends, radius=half, fill=seen.back)
    draw.text(at, text, fill=seen.colour, font=font, anchor="lm")
