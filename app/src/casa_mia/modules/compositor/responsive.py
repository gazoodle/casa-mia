"""The Camera Commander's Responsive layout: worked out for the space it is given, from
how many cameras there are and a few limits (docs/design/commander-responsive-layout.md).

The picture is a grid of equal cells, each near the tile shape. Every camera is one cell
and the main camera is a block of whole cells. Every grid the limits allow is scored, on
the space that shows no camera and on what cropping costs, and the best is used.

The cards' engine is this one line for line (integration/cards/src/responsive.ts), and
both are checked against tests/responsive_cases.json: change one, change the other, and
write the cases again from Python. So the arithmetic here is whole numbers throughout,
with every comparison exact and every tie broken by a fixed order. A score in floating
point could round one way here and the other way in the browser, and the card's tap zones
would then sit over a different grid from the picture."""

from __future__ import annotations

from functools import lru_cache
from typing import Any

from .common import LAYOUT

Rect = tuple[int, int, int, int]
Shape = tuple[int, int]  # width : height

OPTIONS: dict[str, dict[str, Any]] = LAYOUT["responsive"]
DEFAULTS: dict[str, Any] = {k: o["default"] for k, o in OPTIONS.items()}
# Every edge, in the order they are added when the ones listed can't hold the cameras.
EDGES = ("bottom", "right", "left", "top")
# The shape the grid gives the main camera's block, unless it follows the camera's own.
MAIN_SHAPE: Shape = (16, 9)
# Show whole: a main camera that would lose no more than this (per mille) is cropped
# instead, so one in a block of nearly its own shape gets no hairline bars.
WHOLE_OVER = 50
# The most cells along a side. The smallest tile stops the search long before, except
# when that limit has been given up.
MOST_LINES = 24


def shape_of(value: Any) -> Shape:
    """A shape as whole numbers: "16:9", or a number (1.333 is 1333 : 1000)."""
    if isinstance(value, str) and ":" in value:
        a, b = value.split(":")
        return int(a), int(b)
    return round(float(value) * 1000), 1000


def _lost(w: int, h: int, shape: Shape) -> int:
    """How much of a picture of `shape` is cut off to fill w x h, per mille."""
    a, b = w * shape[1], h * shape[0]
    return 1000 - 1000 * min(a, b) // max(a, b)


def _whole(w: int, h: int, shape: Shape) -> int:
    """The area a picture of `shape` takes, shown whole in w x h."""
    return min(w, h * shape[0] // shape[1]) * min(h, w * shape[1] // shape[0])


def _before(free: int, first: str, last: str, edges: tuple[str, ...]) -> int | None:
    """How many of the `free` lines beside the block go before it (on its `first` side:
    left, or top), the rest going after. An edge in the list is used whenever there are
    lines for it: both listed, they share the lines, the odd one going to the edge that
    is earlier in the list. None: there are lines and neither edge may hold tiles."""
    if not free:
        return 0
    if first in edges and last in edges:
        return (free + 1) // 2 if edges.index(first) < edges.index(last) else free // 2
    if first in edges:
        return free
    return 0 if last in edges else None


@lru_cache(maxsize=512)
def _best(
    w: int,
    h: int,
    gap: int,
    tiles: int,
    tile: Shape,
    main: Shape,
    loss: int,
    tile_min: int,
    least: int,
    most: int,
    edges: tuple[str, ...],
) -> tuple[int, ...] | None:
    """The best grid for a space w x h: (columns, rows, the block's columns and rows, its
    column and row, a cell's width and height), or None when the limits allow none."""
    biggest = _whole(w, h, main)  # the main camera's limits are shares of this
    found: tuple[tuple[int, ...], tuple[int, ...]] | None = None

    for cols in range(1, MOST_LINES + 1):
        wide = (w - (cols - 1) * gap) // cols
        if wide < tile_min:
            break  # more columns are narrower still
        for rows in range(1, MOST_LINES + 1):
            cw, ch = wide, (h - (rows - 1) * gap) // rows
            if ch < 1:
                break
            # A cell is held within `loss` of the tile shape: one too wide is narrowed,
            # one too tall shortened, and the grid then leaves room at its sides.
            if cw * tile[1] * (100 - loss) > ch * tile[0] * 100:
                cw = ch * tile[0] * 100 // (tile[1] * (100 - loss))
            elif cw * tile[1] * 100 < ch * tile[0] * (100 - loss):
                ch = cw * tile[1] * 100 // (tile[0] * (100 - loss))
            if cw < tile_min or ch < 1:
                continue
            tile_lost = _lost(cw, ch, tile)

            # The block is at least two cells each way: a main camera no bigger than a
            # tile is a list of cameras, not a commander.
            for mc in range(2, cols + 1):
                left = _before(cols - mc, "left", "right", edges)
                if left is None:
                    continue
                for mr in range(2, rows + 1):
                    top = _before(rows - mr, "top", "bottom", edges)
                    room = cols * rows - mc * mr  # cells for tiles
                    if top is None or not room:
                        continue
                    bw, bh = mc * cw + (mc - 1) * gap, mr * ch + (mr - 1) * gap
                    # The block is held as near the main camera's shape as a cell is to
                    # the tile shape, so the main camera loses no more than a tile may.
                    # (Within WHOLE_OVER always passes: gaps alone put a block of exact
                    # cells a little off, and no grid would pass a limit of nothing.)
                    lost = _lost(bw, bh, main)
                    shown = bw * bh
                    if (
                        lost > max(loss * 10, WHOLE_OVER)
                        or shown * 100 < least * biggest
                    ):
                        continue

                    # Cameras that don't fit go into "+n more", which takes a cell.
                    dropped = 0 if room >= tiles else tiles - (room - 1)
                    used = min(tiles, room)
                    unused = w * h - used * cw * ch - shown
                    # The cost, in millionths of the space: what shows no camera; half
                    # of what cropping loses; and nine tenths of the main camera's room
                    # beyond its most. So room beyond its most is worth almost nothing
                    # to the main camera: it goes to bigger tiles where there are tiles
                    # to take it, and to the main camera only when the choice is that
                    # or leaving it empty. (At twice the weight, two cameras in a tall
                    # space got a small main camera and four fifths of the space empty;
                    # at half, eight cameras got a huge one and tiles too small to see.)
                    over = max(0, shown * 100 - most * biggest)
                    cost = (
                        unused * 1_000_000 // (w * h)
                        + 500 * tile_lost
                        + 500 * lost
                        + over * 9_000 // (w * h)
                    )
                    # Fewest cameras dropped, then the lowest cost, then the biggest
                    # tiles, then the fewest cells: an order with no ties.
                    key = (dropped, cost, -cw * ch, cols, rows, mc, mr)
                    if found is None or key < found[0]:
                        found = (key, (cols, rows, mc, mr, left, top, cw, ch))
    return found[1] if found else None


def _cells(grid: tuple[int, ...], edges: tuple[str, ...]) -> list[tuple[int, int]]:
    """The tiles' cells in the order they fill: an edge at a time in the list's order,
    each across then down. A cell where two edges meet is the later edge's, so the
    last edge runs through the corner and any cells to spare are at its end, in the
    picture's corner. (The earlier edge's, to begin with: the spare cells were then
    in the crook of the L, between the two strips.)"""
    cols, rows, mc, mr, left, top = grid[:6]
    on = {
        "left": lambda c, r: c < left,
        "right": lambda c, r: c >= left + mc,
        "top": lambda c, r: r < top,
        "bottom": lambda c, r: r >= top + mr,
    }
    out: list[tuple[int, int]] = []
    for i, edge in enumerate(edges):
        later = [on[e] for e in edges[i + 1 :]]
        out += [
            (c, r)
            for r in range(rows)
            for c in range(cols)
            if on[edge](c, r) and not any(theirs(c, r) for theirs in later)
        ]
    return out


def responsive(
    width: int,
    height: int,
    gap: int,
    margin: int,
    cameras: int,
    options: dict[str, Any] | None = None,
    main_shape: float | None = None,
    scale: float = 1.0,
) -> dict[str, Any]:
    """A commander of `cameras` cameras laid out in width x height: the main camera's
    place and how it is put there (cover: cropped to fill; contain: whole), each tile's
    place in the cameras' order, the "+n more" tile's place and how many cameras it
    stands for, and which limits gave way (`gave`). The main camera keeps its own tile,
    so nothing moves when it changes. `main_shape` is the main camera's own shape, and
    `scale` grows the smallest tile as it grows the gap (a CSS pixel in device pixels)."""
    o = {**DEFAULTS, **(options or {})}
    m = max(0, min(int(margin), (min(width, height) - 1) // 2))
    w, h = width - 2 * m, height - 2 * m
    tall = o["edges_tall"] if h > w and o["edges_tall"] is not None else o["edges"]
    edges = tuple(dict.fromkeys(e for e in tall if e in EDGES))
    own = shape_of(main_shape) if main_shape else MAIN_SHAPE
    main = own if o["main_other"] == "follow" else MAIN_SHAPE
    tiles = cameras if cameras > 1 else 0  # one camera needs no tile of itself
    tile_min = max(1, round(o["tile_min"] * scale))

    def solve(edges: tuple[str, ...], least: int, tile_min: int) -> tuple | None:
        return _best(
            w,
            h,
            gap,
            tiles,
            shape_of(o["tile_shape"]),
            main,
            int(o["tile_loss"]),
            tile_min,
            least,
            int(o["main_most"]),
            edges,
        )

    # The limits as set; then, to find something that fits, they give way in a fixed
    # order: the main camera's least, then the smallest tile too. At each, the listed
    # edges are tried first, then other edges added one at a time; edges that find no
    # fit are taken off again. (Until 2026.11.5-b13 they stayed on while the main camera
    # gave way: a commander set for tiles on the right and below, in a phone's short
    # wide strip, came out as a small main camera with tiles all round it.)
    listed, gave = edges, []
    grid = solve(edges, int(o["main_least"]), tile_min) if tiles else None
    if grid is None and tiles and o["cant_fit"] == "find":
        for least, smallest, given in (
            (int(o["main_least"]), tile_min, []),
            (0, tile_min, ["main_least"]),
            (0, 1, ["main_least", "tile_min"]),
        ):
            edges, gave = listed, given
            if grid := solve(edges, least, smallest):
                break
            for edge in (e for e in EDGES if e not in listed):
                edges, gave = (*edges, edge), ["edges", *given]
                if grid := solve(edges, least, smallest):
                    break
            if grid:
                break

    if grid is None:  # the main camera alone: it always fits
        how = "cover" if _lost(w, h, own) <= WHOLE_OVER else "contain"
        return {
            "size": [width, height],
            "main": [m, m, w, h],
            "main_how": how,
            "tiles": [],
            "more": None,
            "dropped": tiles,
            "gave": [*gave, "main_alone"] if tiles else [],
            "grid": [1, 1, 1, 1],
        }

    cols, rows, mc, mr, left, top, cw, ch = grid
    x0 = m + (w - (cols * cw + (cols - 1) * gap)) // 2
    y0 = m + (h - (rows * ch + (rows - 1) * gap)) // 2
    bw, bh = mc * cw + (mc - 1) * gap, mr * ch + (mr - 1) * gap
    places = [
        [x0 + c * (cw + gap), y0 + r * (ch + gap), cw, ch]
        for c, r in _cells(grid, edges)
    ]
    dropped = 0 if len(places) >= tiles else tiles - (len(places) - 1)
    shown = tiles - dropped

    # How the main camera sits in its block. The block is made for the main shape, so only
    # Show whole ever leaves bars, for a camera whose own shape is not the block's.
    whole = o["main_other"] == "whole" and _lost(bw, bh, own) > WHOLE_OVER
    return {
        "size": [width, height],
        "main": [x0 + left * (cw + gap), y0 + top * (ch + gap), bw, bh],
        "main_how": "contain" if whole else "cover",
        "tiles": places[:shown],
        "more": places[shown] if dropped else None,
        "dropped": dropped,
        "gave": gave,
        "grid": [cols, rows, mc, mr],
    }
