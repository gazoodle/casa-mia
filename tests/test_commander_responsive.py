"""A commander in the Responsive mode, through everything that reads where its cameras
are: its picture, its dashboard page's tap zones, and the checks on what is saved.
(The solver itself: tests/test_responsive_cases.py.)"""

import io
import json

from PIL import Image

from casa_mia.modules.auto_dashboards import build_dashboard, with_defaults
from casa_mia.modules.auto_dashboards import problems as dashboard_problems
from casa_mia.modules.commander.checks import MOST_CAMERAS, problems
from casa_mia.modules.compositor import (
    EMPTY_COMMANDER,
    PANELS,
    commander,
    commander_cameras,
    commander_layout,
    follows_main,
    placed,
    see_through,
    sized,
)
from casa_mia.modules.compositor.responsive import responsive
from test_auto_dashboards import STORE
from test_compositor import alpha, jpeg

CAMS = [f"camera.c{i}" for i in range(14)]


def cmd(n: int = 14, **options) -> dict:
    """A Responsive commander of n cameras, 1100 x 560, its panels holding two others
    (the settings of the mode not in use are kept)."""
    out = json.loads(json.dumps(EMPTY_COMMANDER))
    out |= {"width": 1100, "height": 560, "mode": "responsive"}
    out["responsive"] |= {"cameras": CAMS[:n], **options}
    out["left"]["cameras"] = ["camera.kept0", "camera.kept1"]
    return out


def test_its_cameras_are_its_own_list_not_its_panels():
    assert commander_cameras(cmd()) == CAMS
    assert commander_cameras({**cmd(), "mode": "fixed"}) == [
        "camera.kept0",
        "camera.kept1",
    ]


def test_placed_is_the_solver_with_the_cameras_put_to_its_tiles():
    c = cmd()
    laid, want = placed(c, CAMS[3]), responsive(1100, 560, c["gap"], 0, 14)
    assert laid.size == (1100, 560) and laid.main == tuple(want["main"])
    assert [(e, list(r)) for _, e, r, _ in laid.tiles] == list(zip(CAMS, want["tiles"]))
    assert all(where == "tiles" and not whole for where, _, _, whole in laid.tiles)
    assert laid.main_fit == "crop" and laid.more is None and laid.gave == []
    # the main camera keeps its own tile, so nothing moves when it changes
    assert placed(c, CAMS[0]) == placed(c, CAMS[9])


def test_placed_for_a_fixed_commander_is_its_panels_as_before():
    c = json.loads(json.dumps(EMPTY_COMMANDER))
    c["left"] |= {"cameras": ["camera.a", "camera.b"], "fit": "contain"}
    c["bottom"]["cameras"] = ["camera.c"]
    size, main, rects = commander_layout(c, "camera.a")
    laid = placed(c, "camera.a")
    assert (laid.size, laid.main, laid.main_fit) == (size, main, "fit")
    assert laid.tiles == [
        ("left", "camera.a", rects["left"][0], True),
        ("left", "camera.b", rects["left"][1], True),
        ("bottom", "camera.c", rects["bottom"][0], False),
    ]
    assert laid.more is None and not follows_main(c)
    assert follows_main({**c, "main_fit": "own"})


def test_cameras_there_is_no_room_for_are_in_more():
    c = {**cmd(32), "width": 393, "height": 700}
    c["responsive"]["cameras"] = [f"camera.c{i}" for i in range(32)]
    laid = placed(c)
    assert laid.more and laid.more[1] == 32 - len(laid.tiles) > 0
    assert [e for _, e, _, _ in laid.tiles] == c["responsive"]["cameras"][
        : len(laid.tiles)
    ]


def test_at_a_size_asked_for_the_smallest_tile_grows_with_the_scale():
    # twice the pixels: the same grid, every place twice the size (to a pixel's rounding)
    one, two = placed(cmd()), placed(sized(cmd(), (2200, 1120, 2.0)))
    assert len(one.tiles) == len(two.tiles)
    for (_, _, a, _), (_, _, b, _) in zip(one.tiles, two.tiles):
        assert all(abs(2 * p - q) <= 4 for p, q in zip(a, b))


def test_only_re_lay_out_follows_the_main_camera():
    assert not follows_main(cmd()) and not follows_main(cmd(main_other="whole"))
    assert follows_main(cmd(main_other="follow"))


def rgba(pic: Image.Image, xy: tuple[int, int]) -> tuple[int, int, int, int]:
    """One pixel of an RGBA picture."""
    value = pic.getpixel(xy)
    assert isinstance(value, tuple) and len(value) == 4
    return value


def picture(c: dict, main: str, tiles: dict | None = None) -> Image.Image:
    data = commander(c, {}, tiles or {e: jpeg() for e in CAMS}, main, jpeg("blue"))
    pic = Image.open(io.BytesIO(data))
    assert pic.format == "WEBP" and pic.size == (c["width"], c["height"])
    return pic.convert("RGBA")


def test_its_picture_has_every_tile_and_the_main_camera_and_clear_gaps():
    c = cmd()
    laid, pic = placed(c, CAMS[0]), picture(c, CAMS[0])
    assert see_through(c)
    for _, _, (x, y, w, h), _ in laid.tiles:
        r, g, b, a = rgba(pic, (x + w // 2, y + h // 3))
        assert a == 255 and r > 200 and g < 60 and b < 60  # the camera's picture: red
    x, y, w, h = laid.main
    r, g, b, a = rgba(pic, (x + w // 2, y + h // 3))
    assert a == 255 and b > 200 and r < 60  # the main camera's: blue, filling its place
    assert rgba(pic, (x + 2, y + 2))[2] > 200  # cropped to fill: no bars
    # between the main camera and the tiles beside it: clear
    assert alpha(pic, (x + w + c["gap"] // 2, y + h // 2)) == 0


def test_a_main_camera_shown_whole_has_bars_that_are_clear():
    c = cmd(main_other="whole")
    c["aspects"] = {CAMS[0]: 4 / 3}
    laid = placed(c, CAMS[0])
    assert laid.main_fit == "fit"
    x, y, w, h = laid.main
    pic = Image.open(
        io.BytesIO(
            commander(
                c,
                {},
                {},
                CAMS[0],
                Image.new("RGB", (400, 300), "blue"),
            )
        )
    ).convert("RGBA")
    assert alpha(pic, (x + 2, y + h // 2)) == 0  # beside it
    assert rgba(pic, (x + w // 2, y + h // 2))[2] > 200  # the camera, whole


def test_the_more_tile_is_drawn_and_solid():
    c = {**cmd(), "width": 393, "height": 700}
    c["responsive"]["cameras"] = [f"camera.c{i}" for i in range(32)]
    laid = placed(c, "camera.c0")
    assert laid.more
    (x, y, w, h), _ = laid.more
    pic = Image.open(
        io.BytesIO(commander(c, {}, {}, "camera.c0", jpeg("blue")))
    ).convert("RGBA")
    r, g, b, a = rgba(pic, (x + 3, y + 3))
    # its own dark blue-grey (WebP shifts a colour a shade), and solid
    assert a == 255 and all(abs(p - q) <= 6 for p, q in zip((r, g, b), (42, 49, 64)))


def responsive_store(**options) -> dict:
    store = with_defaults(STORE)
    c = store["commanders"][0]
    c["mode"] = "responsive"
    c["responsive"] = {
        **EMPTY_COMMANDER["responsive"],
        "cameras": ["camera.b", "camera.a_low"],
        **options,
    }
    for p in PANELS:
        c[p]["cameras"] = []
    return store


def zones(view: dict) -> list[dict]:
    """Every tap zone and mark on a commander's dashboard page, however nested."""
    found: list[dict] = []

    def walk(node):
        if isinstance(node, dict):
            if "style" in node and "left" in node.get("style", {}):
                found.append(node)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(view)
    return found


def test_its_dashboard_page_has_a_zone_over_each_tile():
    store = responsive_store()
    assert dashboard_problems(store) == []
    view = build_dashboard(store, "http://h:8099", "dashboard-cams")["views"][0]
    c = store["commanders"][0]
    laid = placed({**EMPTY_COMMANDER, **c})
    assert len(laid.tiles) == 2

    def pct(value: object) -> float:
        return float(str(value).rstrip("%"))

    # a zone is placed by its centre, in % of the picture
    got = [(pct(z["style"]["left"]), pct(z["style"]["top"])) for z in zones(view)]
    for _, _, (x, y, w, h), _ in laid.tiles:
        cx, cy = 100 * (x + w / 2) / laid.size[0], 100 * (y + h / 2) / laid.size[1]
        assert any(abs(cx - gx) < 0.1 and abs(cy - gy) < 0.1 for gx, gy in got)
    # taps choose by the cameras' titles, in its own list's order
    text = json.dumps(view)
    assert '"option": "Tablet"' in text and '"option": "Bay"' in text


def test_what_is_wrong_with_responsive_settings_is_said():
    def wrong(**over) -> list[str]:
        c = cmd(2)
        c["responsive"] |= over
        return problems(
            {
                "commanders": [c],
                "cameras": {e: {} for e in [*CAMS, "camera.kept0", "camera.kept1"]},
            }
        )

    assert wrong() == []
    assert any("at least" in p for p in wrong(main_least=5))
    assert any("smallest tile" in p for p in wrong(tile_min="big"))
    assert any("tile shape" in p for p in wrong(tile_shape="7:3"))
    assert any("edges must be from" in p for p in wrong(edges=["bottom", "middle"]))
    assert any("edge twice" in p for p in wrong(edges_tall=["top", "top"]))
    assert wrong(edges_tall=None) == [] and wrong(edges=[]) == []
    assert any("not one of the cameras" in p for p in wrong(cameras=["camera.gone"]))
    assert any("camera twice" in p for p in wrong(cameras=[CAMS[0], CAMS[0]]))
    assert any("no more than its most" in p for p in wrong(main_least=80, main_most=50))
    assert any("has no cameras: give it some" in p for p in wrong(cameras=[]))
    many = [f"camera.m{i}" for i in range(MOST_CAMERAS + 1)]
    c = cmd(2)
    c["responsive"]["cameras"] = many
    said = problems(
        {
            "commanders": [c],
            "cameras": {e: {} for e in [*many, "camera.kept0", "camera.kept1"]},
        }
    )
    assert any(f"more than {MOST_CAMERAS}" in p for p in said)


def test_a_mode_must_be_one_of_the_two():
    c = {**cmd(2), "mode": "auto"}
    said = problems(
        {
            "commanders": [c],
            "cameras": {e: {} for e in [*CAMS, "camera.kept0", "camera.kept1"]},
        }
    )
    assert any("fixed or responsive" in p for p in said)
