"""Drawing: the commander's layout and picture, pure functions of the config and the images."""

from __future__ import annotations

import functools
import io
import logging
from collections.abc import Mapping
from datetime import datetime
from pathlib import Path
from typing import Any, NamedTuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from ... import swap
from .common import (
    EMPTY_COMMANDER,
    JPEG_QUALITY,
    LAYOUT,
    PANELS,
)
from .labels import look, name
from .responsive import responsive

_LOGGER = logging.getLogger(__name__)

# --- drawing: pure functions of the config and the images -----------------------------

FONT = ImageFont.load_default(size=20)


@functools.lru_cache(maxsize=64)
def _stand_in(path: Path, _mtime: int, size: tuple[int, int]) -> Image.Image:
    """A screenshot swap picture at a channel's size (filling it, the overflow cut)."""
    return ImageOps.fit(Image.open(path).convert("RGB"), size)


def encode(img: Image.Image, quality: int) -> bytes:
    """JPEG; or WebP when the picture has transparent gaps (RGBA), so a dashboard's own
    background shows through them. Both play in an <img>, single or streamed."""
    out = io.BytesIO()
    if img.mode == "RGBA":
        img.save(out, "WEBP", quality=quality, method=0)  # method 0: the fastest
    else:
        img.save(out, "JPEG", quality=quality)
    return out.getvalue()


def mime(data: bytes) -> str:
    return "image/webp" if data[:4] == b"RIFF" else "image/jpeg"


# --- the commander -------------------------------------------------------------------

Rect = tuple[int, int, int, int]
# A camera picture: a snapshot (JPEG, as HA gives it) or a frame of its stream.
Picture = bytes | Image.Image
# A place drawn from a channel: (picture, where, size, whole).
Use = tuple[str, str, tuple[int, int], bool]


def as_image(raw: Picture, size: tuple[int, int]) -> Image.Image:
    """A picture to draw at about that size: a JPEG decoded smaller where it is much
    larger (cheaply, by draft); a stream frame as it is."""
    if isinstance(raw, Image.Image):
        return raw
    src = Image.open(io.BytesIO(raw))
    src.draft("RGB", size)
    return src.convert("RGB")


def commander_cameras(cmd: dict) -> list[str]:
    """The commander's cameras, each once: panel by panel (left, top, right, bottom), or
    a Responsive commander's own list."""
    if cmd.get("mode") == "responsive":
        return list(dict.fromkeys((cmd.get("responsive") or {}).get("cameras", [])))
    return list(
        dict.fromkeys(e for p in PANELS for e in cmd.get(p, {}).get("cameras", []))
    )


def cameras_of(commanders: list[dict]) -> list[str]:
    """Every commander's cameras, each once, commander by commander."""
    return list(dict.fromkeys(e for c in commanders for e in commander_cameras(c)))


def _line(rect: Rect, n: int, down: bool, gap: int) -> list[Rect]:
    """n tiles in a line filling rect: down a column, or across a row."""
    x, y, w, h = rect
    span = h if down else w
    edges = [round(i * (span - (n - 1) * gap) / n + i * gap) for i in range(n + 1)]
    cells = [
        (edges[i], edges[i + 1] - edges[i] - (gap if i < n - 1 else 0))
        for i in range(n)
    ]
    cells[-1] = (cells[-1][0], span - cells[-1][0])
    return [(x, y + a, w, b) if down else (x + a, y, b, h) for a, b in cells]


def _stack(
    rect: Rect, shapes: list[float], down: bool, gap: int, place: str
) -> list[Rect]:
    """Tiles at their own shapes (width / height) in a line, edge to edge (`gap`
    apart): as wide as rect when they run down, as tall when across. `place`: they
    start at the top or left (stack), end at the bottom or right (reverse), or sit in
    the middle (centre). Too long for rect: all shrink by the same factor, centred
    across it."""
    x, y, w, h = rect
    across, span = (w, h) if down else (h, w)
    lengths = [across / a if down else across * a for a in shapes]
    room = span - gap * (len(shapes) - 1)
    scale = min(1.0, room / sum(lengths)) if sum(lengths) > 0 and room > 0 else 0.0
    side = int(across * scale)
    lengths = [int(n * scale) for n in lengths]  # down, so they never overrun
    total = sum(lengths) + gap * (len(shapes) - 1)
    at = {"reverse": span - total, "centre": (span - total) // 2}.get(place, 0)
    off = (across - side) // 2
    out = []
    for n in lengths:
        out.append((x + off, y + at, side, n) if down else (x + at, y + off, n, side))
        at += n + gap
    return out


def _lines(
    rect: Rect,
    n: int,
    lines: int,
    down: bool,
    gap: int,
    shapes: list[float] | None = None,
    place: str = "stack",
) -> list[Rect]:
    """n tiles in `lines` lines filling rect: columns side by side when the tiles run
    down (left, right), rows one above another when they run across (top, bottom). The
    cameras fill the lines in turn, the first lines taking one more when they don't
    share evenly; each line spreads its own across its length, or, given each camera's
    shape, stacks them (see `_stack`)."""
    lines = max(1, min(lines, n))
    strips = _line(rect, lines, not down, gap)
    out: list[Rect] = []
    first = 0
    for i, strip in enumerate(strips):
        count = n // lines + (1 if i < n % lines else 0)
        if shapes is None:
            out += _line(strip, count, down, gap)
        else:
            out += _stack(strip, shapes[first : first + count], down, gap, place)
        first += count
    return out


def _equal(
    rect: Rect, n: int, lines: int, down: bool, gap: int, spread: bool, cell: float
) -> list[Rect]:
    """n equal tiles of shape `cell` (width over height; 1: squares) in `lines` lines
    (columns when they run down, rows across), all one size: as thick as the line, or
    shorter when the fullest line's share of the length is less. They form a grid: every
    line uses the fullest line's slots from its start, so a short line leaves its last
    slots empty, and the tiles line up across lines. The slots sit `gap` apart in the
    middle of the length; spread, the spare room is shared evenly by the gaps and both
    ends (never less than `gap` between: with too little room, as in the middle)."""
    lines = max(1, min(lines, n))
    strips = _line(rect, lines, not down, gap)
    slots = -(-n // lines)  # the fullest line's count
    span = rect[3] if down else rect[2]
    thick = min(s[2] if down else s[3] for s in strips)
    stretch = 1 / cell if down else cell  # a tile's length over its thickness
    along = max(0, min(round(thick * stretch), (span - gap * (slots - 1)) // slots))
    across = min(thick, round(along / stretch))
    free = span - slots * along

    if spread and free >= gap * (slots + 1):
        starts = [round((i + 1) * free / (slots + 1)) + i * along for i in range(slots)]
    else:
        first = (free - gap * (slots - 1)) // 2
        starts = [first + i * (along + gap) for i in range(slots)]

    out: list[Rect] = []
    for i, (x, y, w, h) in enumerate(strips):
        count = n // lines + (1 if i < n % lines else 0)
        off = ((w if down else h) - across) // 2  # in the middle across its line
        out += [
            (x + off, y + a, across, along) if down else (x + a, y + off, along, across)
            for a in starts[:count]
        ]
    return out


STACKS = ("stack", "reverse", "centre")  # panel fits: each camera at its own shape
# panel fits: equal tiles of the panel's cell shape (see _equal); "squares" from when
# they were only square, kept so saved commanders still read
EQUAL = ("squares", "squares_spread")
# Panel fits whose cameras are cropped to fill their tiles.
CROPPED = ("cover", *EQUAL)
SIZED = ("own", "fixed")  # main camera fits that set its size, and the panels' sizes


def ratio(value: object) -> float:
    """A shape as a number: 1.78, "1.78", "16:9" or "16/9" (width over height)."""
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        number = float(value)
    else:
        text = str(value).strip().replace("/", ":")
        a, _, b = text.partition(":")
        number = float(a) / float(b) if b else float(a)
    if not number > 0:
        raise ValueError(f"not a shape: {value!r}")
    return number


def main_shape(cmd: dict, main: str | None) -> float | None:
    """The main camera's shape when it sets its own size (own, fixed), else None."""
    fit = cmd.get("main_fit", "fit")
    if fit == "fixed":
        return ratio(cmd.get("main_ratio", "16:9"))
    if fit == "own":
        return float((cmd.get("aspects") or {}).get(main or "") or 16 / 9)
    return None


def commander_layout(
    cmd: dict, main: str | None = None
) -> tuple[tuple[int, int], Rect, dict[str, list[Rect]]]:
    """Canvas size, the main camera's area, and each panel's tile rects. Top and bottom
    run to the view's edge at an anchored end (the side panel stops at them there), else
    stop at the side panel; the main camera fills what is left. An empty panel takes no
    room. With a sized main camera (own, fixed) it is main_width wide at its shape, and
    the panels share the room around it (so with own, the layout follows `main`).
    Shared with the dashboard generator, so its tap zones line up. A margin leaves that
    much clear all round: the layout is made inside it."""
    w, h, gap = cmd["width"], cmd["height"], cmd["gap"]
    m = max(0, min(int(cmd.get("margin", 0)), (min(w, h) - 1) // 2))
    if m:
        inside = {**cmd, "width": w - 2 * m, "height": h - 2 * m, "margin": 0}
        _, area, tiles = commander_layout(inside, main)

        def moved(r: Rect) -> Rect:
            return (r[0] + m, r[1] + m, r[2], r[3])

        return (
            (w, h),
            moved(area),
            {p: [moved(r) for r in rs] for p, rs in tiles.items()},
        )
    shape = main_shape(cmd, main)

    def size(panel: str, of: int) -> int:
        """Its width or height: % of the view's, or px (CSS px, grown by the scale, as
        the gap is) up to 45% of it, so a small screen still has a main camera."""
        pane = cmd[panel]
        if not pane["cameras"]:
            return 0
        if pane.get("unit") == "px":
            return min(round(pane["size"] * cmd.get("scale", 1)), of * 45 // 100)
        return round(of * pane["size"] / 100)

    def anchored(panel: str, end: str) -> bool:
        key = f"anchor_{end}"
        return bool(cmd[panel].get(key, EMPTY_COMMANDER[panel][key]))

    if shape is None:
        left, right, top, bottom = (
            size("left", w),
            size("right", w),
            size("top", h),
            size("bottom", h),
        )
    else:
        smallest = cmd.get("panel_min", 8)  # % a panel with cameras always keeps

        def kept(of: int, a: str, b: str) -> int:
            """The room the panels either side of the main camera keep, at the least."""
            n = bool(cmd[a]["cameras"]) + bool(cmd[b]["cameras"])
            return n * (round(of * smallest / 100) + gap)

        most_w, most_h = w - kept(w, "left", "right"), h - kept(h, "top", "bottom")
        mw = min(round(w * cmd.get("main_width", 70) / 100), most_w)
        mh = round(mw / shape)
        if mh > most_h:  # a tall camera (or a wide main width): smaller, same shape
            mh, mw = most_h, round(most_h * shape)

        def share(space: int, a: str, b: str) -> tuple[int, int]:
            """The room beside the main camera, to the panels either side of it."""
            ha, hb = bool(cmd[a]["cameras"]), bool(cmd[b]["cameras"])
            room = max(space - gap * (ha + hb), 0)
            if ha and hb:
                return room // 2, room - room // 2
            return (room, 0) if ha else (0, room) if hb else (0, 0)

        left, right = share(w - mw, "left", "right")
        top, bottom = share(h - mh, "top", "bottom")
    x0 = left + (gap if left else 0)  # the main camera's columns
    x1 = w - right - (gap if right else 0)
    y0 = top + (gap if top else 0)  # and rows
    y1 = h - bottom - (gap if bottom else 0)

    def across(panel: str, y: int, height: int) -> Rect:
        a = 0 if anchored(panel, "left") else x0
        b = w if anchored(panel, "right") else x1
        return (a, y, b - a, height)

    def down(x: int, width: int, end: str) -> Rect:
        a = y0 if top and anchored("top", end) else 0
        b = y1 if bottom and anchored("bottom", end) else h
        return (x, a, width, b - a)

    areas = {
        "top": across("top", 0, top),
        "bottom": across("bottom", h - bottom, bottom),
        "left": down(0, left, "left"),
        "right": down(w - right, right, "right"),
    }

    def shapes(panel: str) -> list[float] | None:
        """Each camera's own shape, for a panel that stacks them."""
        if cmd[panel].get("fit") not in STACKS:
            return None
        known = cmd.get("aspects") or {}
        return [float(known.get(e) or 16 / 9) for e in cmd[panel]["cameras"]]

    def tiled(p: str) -> list[Rect]:
        """Panel p's tiles: none when it is empty."""
        n, count = len(cmd[p]["cameras"]), int(cmd[p].get("lines", 1))
        fit, down = cmd[p].get("fit", "cover"), p in ("left", "right")
        if not n:
            return []
        if fit in EQUAL:
            cell = ratio(cmd[p].get("cell", LAYOUT["panel"]["cell"]["default"]))
            return _equal(areas[p], n, count, down, gap, fit == "squares_spread", cell)
        return _lines(areas[p], n, count, down, gap, shapes(p), fit)

    tiles = {p: tiled(p) for p in PANELS}
    main_area = (x0, y0, x1 - x0, y1 - y0)
    if shape is not None:  # exactly its size, centred where the panels left room
        mw, mh = min(mw, x1 - x0), min(mh, y1 - y0)
        main_area = (x0 + (x1 - x0 - mw) // 2, y0 + (y1 - y0 - mh) // 2, mw, mh)
    return (w, h), main_area, tiles


class Placed(NamedTuple):
    """Where everything in a commander's picture is, whichever way it is laid out."""

    size: tuple[int, int]
    main: Rect
    main_fit: str  # the main camera in its place: fit (whole), fill (stretched), crop
    # Each tile: where it is (its panel, or "tiles"), its camera, its place, and
    # whether the camera is shown whole in it (else cropped to fill).
    tiles: list[tuple[str, str, Rect, bool]]
    more: tuple[Rect, int] | None  # the "+n more" tile, and the cameras it stands for
    gave: list[str]  # the limits that gave way (Responsive: see `responsive`)


def placed(cmd: dict, main: str | None = None) -> Placed:
    """A commander laid out at its size, by its mode. What draws it, chooses its
    channels and lays its tap zones all read this, so none of them knows the modes."""
    if cmd.get("mode") != "responsive":
        size, area, rects = commander_layout(cmd, main)
        fit = cmd.get("main_fit", "fit")
        return Placed(
            size,
            area,
            fit if fit in ("fill", "crop") else "fit",
            [
                (p, e, rect, cmd[p].get("fit", "cover") not in CROPPED)
                for p in PANELS
                for e, rect in zip(cmd[p]["cameras"], rects[p], strict=True)
            ],
            None,
            [],
        )

    cameras = commander_cameras(cmd)
    laid = responsive(
        cmd["width"],
        cmd["height"],
        cmd["gap"],
        cmd.get("margin", 0),
        len(cameras),
        cmd.get("responsive"),
        (cmd.get("aspects") or {}).get(main or ""),
        float(cmd.get("scale", 1)),
    )
    return Placed(
        (cmd["width"], cmd["height"]),
        tuple(laid["main"]),
        "crop" if laid["main_how"] == "cover" else "fit",
        [("tiles", e, tuple(r), False) for e, r in zip(cameras, laid["tiles"])],
        (tuple(laid["more"]), laid["dropped"]) if laid["more"] else None,
        laid["gave"],
    )


def follows_main(cmd: dict) -> bool:
    """Whether the whole layout can change with the main camera: one sized to its own
    shape (fixed), or Re-lay out for its shape (Responsive)."""
    if cmd.get("mode") == "responsive":
        return (cmd.get("responsive") or {}).get("main_other") == "follow"
    return cmd.get("main_fit") == "own"


STALE = (245, 166, 35)  # the Stale mark: amber


def _stale_mark(
    draw: ImageDraw.ImageDraw, at: tuple[int, int], font: Any, scale: float = 1
) -> None:
    """ "Stale" in an amber pill, its right end at `at` (vertically centred there)."""
    box = draw.textbbox(at, "Stale", font=font, anchor="rm")
    x, y = round(6 * scale), round(3 * scale)
    draw.rounded_rectangle(
        (box[0] - x, box[1] - y, box[2] + x, box[3] + y), radius=x, fill=STALE
    )
    draw.text(at, "Stale", fill="black", font=font, anchor="rm")


SMALL_BAR = 22


@functools.lru_cache(maxsize=16)
def _fonts(scale: float) -> tuple[Any, Any, Any]:
    """The small, normal and big fonts, grown by `scale` (a screen's pixels per CSS
    pixel, for a picture drawn at a size asked for)."""
    return tuple(ImageFont.load_default(size=round(n * scale)) for n in (16, 20, 40))  # type: ignore[return-value]


def see_through(cmd: dict) -> bool:
    """Whether a commander's picture has clear parts, where the dashboard's background
    shows: its gaps, and the borders beside a main camera kept whole (fit, fixed, own).
    Decided by its settings, not each picture, so its stream keeps one format (WebP
    with clear parts, else JPEG) whichever camera is the main one."""
    if cmd.get("mode") == "responsive":
        return True  # its grid seldom reaches every edge of the space
    return bool(cmd["gap"] or cmd.get("margin")) or cmd.get("main_fit", "fit") in (
        "fit",
        "fixed",
        "own",
    )


def commander(
    cmd: dict,
    titles: dict[str, str],
    tiles: Mapping[str, Picture | None],
    main: str,
    main_image: Picture | None,
    changing: bool = False,
    stale: frozenset[str] = frozenset(),
    main_stale: bool = False,
) -> bytes:
    """Draw the commander: each panel's cameras (the main one framed), and the main camera
    in its natural shape, as large as fits its area, centred. `changing`: the picture
    shown the moment the main camera is switched, from stills already to hand: blurred,
    with "Changing to <camera>" over it, until the sharp one is ready. `stale`: the
    cameras whose tile picture is old (marked Stale); `main_stale`: the main picture is."""
    size, main_rect, main_fit, places, more, _ = placed(cmd, main)
    # Drawn at a size asked for (see `sized`), text, bars and margins grow by its scale.
    scale = float(cmd.get("scale", 1))
    seen = look(cmd)  # its labels' font, colours and style (labels.py)
    small, font, big = seen.small, seen.font, seen.big

    def u(n: float) -> int:
        return round(n * scale)

    # A tile's name bar: 22 px for a name of 16, and in step with it.
    bar = round(seen.tile_px * SMALL_BAR / 16)
    # Drawn solid, so the name bars and labels shade the picture under them; the gaps
    # are cut out at the end. (Drawn on a transparent canvas, a see-through bar would
    # replace the picture under it, and the dashboard's background would show through.)
    canvas = Image.new("RGB", size, "black")
    draw = ImageDraw.Draw(canvas, "RGBA")
    for _, entity, (x, y, w, h), whole in places:
        if w <= 0 or h <= 0:  # no room left beside a large main camera
            continue
        raw = tiles.get(entity)
        if raw:
            try:
                src = as_image(raw, (w, h))
                img = (
                    ImageOps.contain(src, (w, h))
                    if whole
                    else ImageOps.fit(src, (w, h))
                )
                canvas.paste(img, (x + (w - img.width) // 2, y + (h - img.height) // 2))
            except OSError:
                raw = None
        if not raw:
            draw.text(
                (x + w // 2, y + h // 2),
                "no signal",
                fill="white",
                font=small,
                anchor="mm",
            )
        name(
            draw,
            swap.out(str(titles.get(entity) or entity)),
            (x + u(6), y + h - bar // 2),
            small,
            seen,
            seen.tile_style,
            (x, y + h - bar, x + w, y + h),
            seen.tile_px,
            u(2),
        )
        if raw and entity in stale:
            _stale_mark(draw, (x + w - u(6), y + h - bar // 2), small, scale)
    if more:  # the cameras there is no room for, said on a tile of its own
        (x, y, w, h), count = more
        draw.rectangle((x, y, x + w - 1, y + h - 1), fill=(42, 49, 64))
        draw.text(
            (x + w // 2, y + h // 2),
            f"+{count} more",
            fill="white",
            font=small,
            anchor="mm",
        )
    x, y, w, h = main_rect
    shown = main_rect  # the main area that is solid: the camera's picture, once drawn
    if w > 0 and h > 0:
        # Fit: whole, as large as fits, centred (black borders); fill: stretched to the
        # area; crop: filling it, the overflow cut off. Its name and the time go along
        # the foot of the picture, clear of the camera's own caption at the top.
        px, py, pw, ph = x, y, w, h
        if main_image:
            try:
                src = as_image(main_image, (w, h))
                if main_fit == "fill":
                    img = src.resize((w, h))
                elif main_fit == "crop":
                    img = ImageOps.fit(src, (w, h))
                else:
                    img = ImageOps.contain(src, (w, h))
                px, py, pw, ph = (
                    x + (w - img.width) // 2,
                    y + (h - img.height) // 2,
                    img.width,
                    img.height,
                )
                canvas.paste(img, (px, py))
                shown = (px, py, pw, ph)
            except OSError:
                main_image = None
        if not main_image:
            draw.text(
                (x + w // 2, y + h // 2),
                "no signal",
                fill="white",
                font=font,
                anchor="mm",
            )
        label = swap.out(titles.get(main, main))
        if changing:
            area = (px, py, px + pw, py + ph)
            canvas.paste(
                canvas.crop(area).filter(ImageFilter.GaussianBlur(u(14))), area[:2]
            )
            text = f"Changing to {label}…"
            box = draw.textbbox(
                (px + pw // 2, py + ph // 2), text, font=big, anchor="mm"
            )
            draw.rounded_rectangle(
                (box[0] - u(18), box[1] - u(12), box[2] + u(18), box[3] + u(12)),
                radius=u(12),
                fill=(0, 0, 0, 170),
            )
            draw.text(
                (px + pw // 2, py + ph // 2),
                text,
                fill="white",
                font=big,
                anchor="mm",
            )
        live = bool(cmd.get("main_video"))  # the card's live video plays over it
        if main_image and main_stale and not live:
            _stale_mark(draw, (px + pw - u(10), py + u(22)), font, scale)
        # Its name's row: 18 px up from the foot for a name of 20, and in step with it.
        up = round(seen.main_px * 0.9)
        foot = py + ph - up
        if not live:  # (the card draws a live main camera's caption)
            name(
                draw,
                label,
                (px + u(10), foot),
                font,
                seen,
                seen.main_style,
                (px, foot - up, px + pw, py + ph),
                seen.main_px,
                u(6),
            )
            draw.text(
                (px + pw - u(10), foot),
                datetime.now().strftime("%H:%M:%S"),
                fill=seen.colour,
                font=font,
                anchor="rm",
            )
    if see_through(cmd):  # every tile and the main picture solid; the rest is clear
        mask = Image.new("L", size, 0)
        solid = ImageDraw.Draw(mask)
        for x, y, w, h in [
            shown,
            *(t[2] for t in places),
            *(m[0] for m in [more] if m),
        ]:
            if w > 0 and h > 0:
                solid.rectangle((x, y, x + w - 1, y + h - 1), fill=255)
        canvas.putalpha(mask)
    debug = {**EMPTY_COMMANDER["debug"], **(cmd.get("debug") or {})}
    if debug["on"]:
        canvas = _debug(canvas, cmd, debug, scale)
    return encode(canvas, JPEG_QUALITY)


def _debug(canvas: Image.Image, cmd: dict, debug: dict, scale: float) -> Image.Image:
    """The debug overlay (see EMPTY_COMMANDER["debug"]): everything dimmed (the clear
    parts stay clear), corner Ls and diagonals to show the picture's true edges, and
    its ID and draw time 30% down the middle, clear of the corners and the crossing."""
    w, h = canvas.size
    rgb = canvas.convert("RGB").point(lambda v: v * float(debug["dim"]) / 100)
    if canvas.mode == "RGBA":
        rgb.putalpha(canvas.getchannel("A"))
    canvas = rgb
    draw = ImageDraw.Draw(canvas)
    colour, lw = debug["colour"], max(1, round(float(debug["width"]) * scale))
    arm, edge = round(float(debug["corner"]) * scale), lw // 2
    for x, y, dx, dy in (
        (0, 0, 1, 1),
        (w - 1, 0, -1, 1),
        (0, h - 1, 1, -1),
        (w - 1, h - 1, -1, -1),
    ):
        cx, cy = x + dx * edge, y + dy * edge
        draw.line((cx, cy, cx + dx * arm, cy), fill=colour, width=lw)
        draw.line((cx, cy, cx, cy + dy * arm), fill=colour, width=lw)
    draw.line((0, 0, w - 1, h - 1), fill=colour, width=lw)
    draw.line((w - 1, 0, 0, h - 1), fill=colour, width=lw)
    font = _fonts(scale)[1]
    text = (
        f"{cmd['name']}  {w} x {h}  @{scale:g}x\n"
        f"drawn {datetime.now().strftime('%H:%M:%S.%f')[:-3]}"
    )
    at = (w // 2, round(h * 0.3))
    box = draw.multiline_textbbox(at, text, font=font, anchor="mm", align="center")
    pad = round(10 * scale)
    draw.rectangle(
        (box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad), fill=(0, 0, 0)
    )
    draw.multiline_text(at, text, fill=colour, font=font, anchor="mm", align="center")
    return canvas


# --- the service ----------------------------------------------------------------------


@functools.lru_cache(maxsize=16)
def waiting_picture(shape: float) -> Image.Image:
    """A channel's picture before its first comes: white, "(Waiting …)", at its shape
    (small: it is only ever drawn smaller or a little larger, and it is never its size)."""
    w = 640
    h = max(90, round(w / shape)) if shape > 0 else 360
    img = Image.new("RGB", (w, h), "white")
    ImageDraw.Draw(img).text(
        (w // 2, h // 2),
        "(Waiting …)",
        fill=(110, 110, 110),
        font=_fonts(2)[1],
        anchor="mm",
    )
    return img
