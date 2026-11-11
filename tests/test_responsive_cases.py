"""The Responsive layout, twice: the compositor's (compositor.responsive, Python) and the
cards' (integration/cards/src/responsive.ts). Both must give the same places for the same
space and limits, so both are checked against tests/responsive_cases.json.

A deliberate change to the solver: change both, then write the cases again from Python
with `.venv/bin/python tests/test_responsive_cases.py` and check the TypeScript agrees."""

import json
import subprocess
from pathlib import Path

import pytest

from casa_mia.modules.compositor.responsive import (
    DEFAULTS,
    EDGES,
    MAIN_SHAPE,
    responsive,
)
from test_layout_cases import CARDS, node_strips_types

CASES = Path(__file__).with_name("responsive_cases.json")

# Spaces a commander is given, in CSS pixels: the editor's size buttons, and a few more.
SPACES = [
    (1100, 560),
    (960, 600),
    (700, 600),
    (1100, 360),
    (520, 700),
    (393, 700),
    (852, 340),
    (1366, 769),
    (2560, 1600),
    (240, 160),
]


def inputs() -> list[dict]:
    """Every space with a spread of camera counts at the defaults, then each option and
    each fallback at a space or two."""
    out = [
        {"name": f"{w} x {h}, {n} cameras", "width": w, "height": h, "cameras": n}
        for w, h in SPACES
        for n in (1, 2, 3, 5, 9, 14, 20, 26, 32)
    ]

    def case(name: str, w: int, h: int, n: int, options: dict | None = None, **more):
        out.append(
            {
                "name": name,
                "width": w,
                "height": h,
                "cameras": n,
                "options": options or {},
                **more,
            }
        )

    for shape in ("3:2", "4:3", "1:1"):
        case(f"tiles {shape}", 1100, 560, 14, {"tile_shape": shape})
        case(f"tiles {shape}, tall", 393, 700, 9, {"tile_shape": shape})
    for loss in (0, 5, 30):
        case(f"a tile may lose {loss}%", 960, 600, 20, {"tile_loss": loss})
    for least, most in ((10, 30), (60, 90), (100, 100)):
        case(
            f"main camera {least}% to {most}%",
            1100,
            560,
            14,
            {"main_least": least, "main_most": most},
        )
    for small in (40, 200, 400):
        case(f"smallest tile {small} px", 1100, 560, 20, {"tile_min": small})
    for edges in (
        ["bottom"],
        ["right"],
        ["left"],
        ["top"],
        ["left", "bottom"],
        ["bottom", "left"],
        ["left", "right"],
        ["right", "left"],
        ["top", "bottom"],
        ["left", "right", "bottom"],
        ["bottom", "right", "left", "top"],
        ["top", "left", "right", "bottom"],
        [],
    ):
        name = ", ".join(edges) or "none"
        case(f"edges: {name}", 1100, 560, 14, {"edges": edges})
        case(f"edges: {name}; tall", 520, 700, 14, {"edges": edges})
    tall = {"edges": ["right"], "edges_tall": ["bottom"]}
    case("a second list for tall spaces: wide", 1100, 560, 14, tall)
    case("a second list for tall spaces: tall", 393, 700, 14, tall)
    case("a second list for tall spaces: square is not tall", 600, 600, 14, tall)

    # A main camera of another shape, at its own shape and at 4:3 and upright.
    for how in ("fill", "whole", "follow"):
        for shape in (16 / 9, 4 / 3, 9 / 16):
            case(
                f"main camera {shape:.2f}: {how}",
                1100,
                560,
                14,
                {"main_other": how},
                main_shape=shape,
            )

    # The limits can't all be met.
    case("too small: something is found", 200, 150, 12)
    case("too small: kept to", 200, 150, 12, {"cant_fit": "keep"})
    # A large main camera asked for in a phone's short wide strip (see STRIP below): the
    # edges tried and not needed are not kept; at a scale of 3; and upright it all fits.
    strip = {
        "main_least": 75,
        "main_most": 80,
        "tile_min": 60,
        "tile_shape": "3:2",
        "edges": ["right", "bottom"],
        "edges_tall": ["bottom"],
    }
    case("a phone's strip: the main camera gives way", 400, 225, 20, strip)
    case("a phone's strip, 3x", 1200, 675, 20, strip, gap=6, scale=3)
    case("a phone upright: its tall edges", 400, 720, 20, strip)
    case("a phone's strip: kept to", 400, 225, 20, {**strip, "cant_fit": "keep"})
    case(
        "one edge can't hold them: another is added", 393, 700, 12, {"edges": ["right"]}
    )
    case(
        "one edge can't hold them: kept to",
        393,
        700,
        12,
        {"edges": ["right"], "cant_fit": "keep"},
    )
    case("the main camera's least gives way", 300, 700, 30, {"main_least": 100})
    case("the smallest tile gives way", 300, 200, 30, {"tile_min": 200})

    # The gap, the margin and the scale (device pixels: the smallest tile grows with it).
    case("no gap", 1100, 560, 14, gap=0)
    case("a wide gap", 1100, 560, 14, gap=12)
    case("a margin", 1100, 560, 14, margin=24)
    case("twice the pixels", 2200, 1120, 14, gap=8, scale=2)
    case("three times the pixels, a phone", 1179, 2100, 20, gap=12, scale=3)
    return out


def result(c: dict) -> dict:
    return responsive(
        c["width"],
        c["height"],
        c.get("gap", 4),
        c.get("margin", 0),
        c["cameras"],
        c.get("options"),
        c.get("main_shape"),
        c.get("scale", 1),
    )


def test_python_engine_matches_the_cases():
    cases = json.loads(CASES.read_text())
    assert [c["name"] for c in cases] == [c["name"] for c in inputs()]
    for case in cases:
        assert result(case) == case["expect"], case["name"]


@pytest.mark.skipif(not node_strips_types(), reason="needs node 22.6+")
def test_typescript_engine_matches_the_cases():
    run = subprocess.run(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "--test",
            "src/responsive.test.ts",
        ],
        cwd=CARDS,
        capture_output=True,
        text=True,
    )
    assert run.returncode == 0, run.stdout + run.stderr


def laid(w: int, h: int, n: int, **options) -> dict:
    return responsive(w, h, 4, 0, n, options)


def rects(r: dict) -> list[list[int]]:
    return [r["main"], *r["tiles"], *([r["more"]] if r["more"] else [])]


@pytest.mark.parametrize("w,h", SPACES)
@pytest.mark.parametrize("n", [2, 7, 16, 32])
def test_every_place_is_in_the_space_and_none_overlap(w, h, n):
    r = laid(w, h, n)
    for x, y, rw, rh in rects(r):
        assert x >= 0 and y >= 0 and x + rw <= w and y + rh <= h and rw > 0 and rh > 0
    all_ = rects(r)
    for i, (ax, ay, aw, ah) in enumerate(all_):
        for bx, by, bw, bh in all_[i + 1 :]:
            assert ax + aw <= bx or bx + bw <= ax or ay + ah <= by or by + bh <= ay


@pytest.mark.parametrize("w,h", SPACES)
def test_tiles_are_one_size_and_never_taller_than_wide(w, h):
    r = laid(w, h, 20)
    sizes = {(t[2], t[3]) for t in [*r["tiles"], *([r["more"]] if r["more"] else [])]}
    assert len(sizes) == 1
    (tw, th), limit = next(iter(sizes)), 100 - DEFAULTS["tile_loss"]
    # within the tolerance of 16:9, so far from upright (a whole pixel's rounding apart)
    assert tw > th
    assert (tw + 1) * 9 * 100 >= th * 16 * limit and tw * 9 * limit <= (
        th + 1
    ) * 16 * 100


def test_every_camera_is_a_tile_or_in_more():
    for w, h in SPACES:
        for n in (2, 9, 20, 32):
            r = laid(w, h, n)
            assert len(r["tiles"]) + r["dropped"] == n
            assert (r["more"] is None) == (
                r["dropped"] == 0 or "main_alone" in r["gave"]
            )


def test_the_main_camera_loses_no_more_than_a_tile_may():
    for w, h in SPACES:
        for n in (2, 9, 20, 32):
            r = laid(w, h, n)
            if "main_alone" in r["gave"]:
                continue
            mw, mh = r["main"][2:]
            a, b = mw * 9, mh * 16
            assert 1000 - 1000 * min(a, b) // max(a, b) <= DEFAULTS["tile_loss"] * 10


def test_the_main_camera_keeps_its_least_unless_it_gave_way():
    for w, h in SPACES:
        for n in (2, 9, 20, 32):
            r = laid(w, h, n)
            if "main_least" in r["gave"] or "main_alone" in r["gave"]:
                continue
            p, q = MAIN_SHAPE
            biggest = min(w, h * p // q) * min(h, w * q // p)
            assert r["main"][2] * r["main"][3] * 100 >= DEFAULTS["main_least"] * biggest


def test_the_layout_does_not_depend_on_the_main_camera_unless_it_follows_it():
    for how in ("fill", "whole"):
        seen = {
            json.dumps(
                {
                    k: v
                    for k, v in responsive(
                        1100, 560, 4, 0, 14, {"main_other": how}, shape
                    ).items()
                    if k != "main_how"
                }
            )
            for shape in (None, 16 / 9, 4 / 3, 1.0, 9 / 16)
        }
        assert len(seen) == 1, how
    follow = {
        json.dumps(responsive(1100, 560, 4, 0, 14, {"main_other": "follow"}, s)["grid"])
        for s in (16 / 9, 9 / 16)
    }
    assert len(follow) == 2


def test_how_a_main_camera_of_another_shape_is_shown():
    def how(mode, shape):
        return responsive(1100, 560, 4, 0, 14, {"main_other": mode}, shape)["main_how"]

    assert how("fill", 4 / 3) == "cover" and how("fill", 9 / 16) == "cover"
    assert how("whole", 4 / 3) == "contain"
    # a camera within 5% of its block's shape is cropped: no hairline bars
    x, y, w, h = responsive(1100, 560, 4, 0, 14)["main"]
    assert how("whole", w / h) == "cover" and how("whole", w / h * 1.04) == "cover"
    assert how("whole", w / h * 1.08) == "contain"


def test_the_first_cameras_go_on_the_first_edge():
    def first(edges):
        r = laid(1100, 560, 14, edges=edges)
        (mx, my, mw, mh), (x, y, _, _) = r["main"], r["tiles"][0]
        return "bottom" if y >= my + mh else "right" if x >= mx + mw else "left"

    assert first(["bottom", "left"]) == "bottom"
    assert first(["left", "bottom"]) == "left"
    assert first(["right", "bottom"]) == "right"


def test_an_edge_in_the_list_is_used_and_one_not_in_it_is_not():
    r = laid(1100, 560, 14, edges=["left", "right"])
    mx, my, mw, mh = r["main"]
    xs = {t[0] for t in r["tiles"]}
    assert any(x < mx for x in xs) and any(x >= mx + mw for x in xs)  # both sides
    assert all(my <= t[1] < my + mh for t in r["tiles"])  # none above or below
    assert not r["gave"]


def test_too_many_cameras_go_into_more_from_the_end_of_the_list():
    r = laid(393, 700, 32)
    assert r["dropped"] > 0 and r["more"] and not r["gave"]
    assert len(r["tiles"]) == 32 - r["dropped"]
    # the list's order is the tiles' order: the first cameras are the ones shown
    assert r["tiles"] == laid(393, 700, 32)["tiles"]


def test_when_the_limits_cannot_be_met():
    found = laid(200, 150, 12)
    # (the listed edges still: other edges were tried at each step and found no fit)
    assert found["gave"] == ["main_least", "tile_min"] and found["tiles"]
    kept = laid(200, 150, 12, cant_fit="keep")
    assert kept["gave"] == ["main_alone"] and kept["tiles"] == []
    assert kept["main"] == [0, 0, 200, 150] and kept["dropped"] == 12
    # no edge to put a tile on: one is added, and only that gives way
    assert laid(1100, 560, 12, edges=[])["gave"] == ["edges"]
    # an edge that can't hold them all: the rest go into "+n more" before another is added
    crowded = laid(393, 700, 12, edges=["right"])
    assert crowded["gave"] == [] and crowded["dropped"] > 0


def test_one_camera_is_the_main_camera_alone_and_nothing_gave_way():
    r = laid(1100, 560, 1)
    assert r["main"] == [0, 0, 1100, 560] and r["tiles"] == [] and r["gave"] == []


def test_the_edges_are_the_ones_the_options_offer():
    assert set(DEFAULTS["edges"]) <= set(EDGES)


if __name__ == "__main__":
    CASES.write_text(
        json.dumps([{**c, "expect": result(c)} for c in inputs()], indent=1) + "\n"
    )
    print(f"wrote {len(inputs())} cases to {CASES.name}")


# --- what gives way, and that a concession that found nothing is not kept (2026.11.5-b13)

# A commander set for a wide tablet (a large main camera, tiles on the right and below),
# drawn in a phone's short wide strip: no tile fits beside a main camera that large.
STRIP = {
    "main_least": 75,
    "main_most": 80,
    "tile_min": 60,
    "tile_shape": "3:2",
    "edges": ["right", "bottom"],
}


def test_edges_that_found_no_fit_are_not_kept_when_the_main_camera_gives_way():
    r = responsive(400, 225, 2, 0, 20, STRIP)
    # Other edges were tried and found nothing, so they are not in what gave way, and
    # the layout is still the one asked for: tiles on the right and below only.
    assert r["gave"] == ["main_least"]
    x, y, w, h = r["main"]
    assert all(tx >= x + w or ty >= y + h for tx, ty, _, _ in r["tiles"])
    # (until b13 the edges stayed on: a small main camera with tiles all round it)
    assert not any(tx + tw <= x or ty + th <= y for tx, ty, tw, th in r["tiles"])


def test_other_edges_are_used_when_they_are_what_finds_a_fit():
    # No edge listed: any edge is a concession, and the first that fits is kept.
    r = responsive(1100, 560, 4, 0, 12, {"edges": []})
    assert r["gave"] == ["edges"] and r["dropped"] == 0


def test_what_gives_way_is_tried_in_order_the_listed_edges_first_each_time():
    # The limits as set, then the main camera's least, then the smallest tile; and at
    # each, the listed edges before any other.
    assert responsive(400, 225, 2, 0, 20, {**STRIP, "main_least": 20})["gave"] == []
    assert responsive(400, 225, 2, 0, 20, STRIP)["gave"] == ["main_least"]
    tiny = responsive(150, 90, 2, 0, 20, {**STRIP, "tile_min": 100})
    assert tiny["gave"] in (
        ["main_least", "tile_min"],
        ["edges", "main_least", "tile_min"],
    )
    assert "main_alone" not in tiny["gave"] and tiny["tiles"]


def test_keep_to_my_limits_is_the_main_camera_alone_in_that_strip():
    r = responsive(400, 225, 2, 0, 20, {**STRIP, "cant_fit": "keep"})
    assert r["gave"] == ["main_alone"] and r["main"] == [0, 0, 400, 225]


def test_the_same_commander_upright_on_a_phone_fits_with_nothing_given_way():
    # Given a phone's height (the card's, since b13), its tall edges hold every camera.
    r = responsive(400, 720, 2, 0, 20, {**STRIP, "edges_tall": ["bottom"]})
    assert r["gave"] == [] and r["dropped"] == 0 and len(r["tiles"]) == 20
    x, y, w, h = r["main"]
    assert all(ty >= y + h for _, ty, _, _ in r["tiles"])  # all below the main camera
