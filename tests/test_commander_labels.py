"""How a commander's camera names are drawn (compositor/labels.py): the font, the size,
the colours, and a bar, a pill or nothing, on the tiles and on the main camera."""

import io
import logging

import pytest
from PIL import Image, ImageDraw

from casa_mia.modules.commander.checks import problems
from casa_mia.modules.compositor import EMPTY_COMMANDER, placed
from casa_mia.modules.compositor import labels as L
from test_commander_responsive import CAMS, cmd, picture, rgba

# A background nothing else in the picture has (the cameras are red, the main one blue).
GREEN = {"tint": "#00ff00", "opacity": 100}


def labelled(**labels) -> dict:
    c = cmd(6)
    c["labels"] = {**c["labels"], **GREEN, **labels}
    return c


def green(pic, xy) -> bool:
    r, g, b, _ = rgba(pic, xy)
    return g > 200 and r < 80 and b < 80


def tile_foot(c: dict) -> tuple[int, int, int, int]:
    """The first tile, and the row its name is on."""
    x, y, w, h = placed(c, CAMS[1]).tiles[0][2]
    return x, y + h - 4, w, h


def test_every_setting_has_a_default_and_a_commander_starts_with_them():
    assert EMPTY_COMMANDER["labels"] == L.DEFAULTS
    assert L.DEFAULTS["font"] == "standard" and L.DEFAULTS["tile_style"] == "bar"


@pytest.mark.parametrize("font", sorted(L.FILES))
def test_each_font_is_a_file_the_app_holds(font):
    assert (L.FONTS / L.FILES[font]).is_file()
    assert L.font(font, 16).getname()[0].startswith("DejaVu")


def test_a_font_that_cant_be_read_is_said_and_the_standard_one_drawn(
    monkeypatch, tmp_path, caplog
):
    # A name no machine has: for a path that isn't there, Pillow looks among the system's
    # fonts for a file of that name, and a Linux box has DejaVuSansMono.ttf.
    monkeypatch.setattr(L, "FONTS", tmp_path)
    monkeypatch.setitem(L.FILES, "mono", "casa-mia-no-such-font.ttf")
    L.font.cache_clear()
    with caplog.at_level(logging.ERROR):
        drawn = L.font("mono", 16)
    L.font.cache_clear()  # (the standard one is not kept as mono's)
    assert drawn.getname()[0] == "Aileron"
    assert "can't be read" in caplog.text and "mono" in caplog.text


def test_a_tiles_name_is_on_a_bar_across_it():
    c = labelled(tile_style="bar")
    pic, (x, row, w, _) = picture(c, CAMS[1]), tile_foot(c)
    assert green(pic, (x + w - 3, row)) and green(pic, (x + 1, row))


def test_a_pill_is_only_as_wide_as_the_name():
    c = labelled(tile_style="pill")
    pic, (x, row, w, _) = picture(c, CAMS[1]), tile_foot(c)
    assert not green(pic, (x + w - 3, row))  # the far end of the tile: the camera
    assert any(green(pic, (x + dx, row - 4)) for dx in range(2, 12))  # by the name


def test_a_pill_has_rounded_ends():
    c = labelled(main_style="pill", main_scale=200)
    pic, (x, y, _, h) = picture(c, CAMS[1]), placed(c, CAMS[1]).main
    # the pill's rows, and where it starts on each: further in at its top than half-way
    rows = [
        r
        for r in range(y + h - 80, y + h)
        if any(green(pic, (x + d, r)) for d in range(60))
    ]
    start = {r: next(d for d in range(60) if green(pic, (x + d, r))) for r in rows}
    assert start[rows[0]] > start[rows[len(rows) // 2]] + 5
    assert start[rows[-1]] > start[rows[len(rows) // 2]] + 5


def test_none_draws_no_name():
    c = labelled(tile_style="none", main_style="none")
    pic, (x, row, w, _) = picture(c, CAMS[1]), tile_foot(c)
    assert not any(green(pic, (x + dx, row - dy)) for dx in range(w) for dy in (0, 6))


def test_the_main_cameras_name_takes_its_own_style():
    c = labelled(main_style="bar")
    x, y, w, h = placed(c, CAMS[1]).main
    assert green(picture(c, CAMS[1]), (x + w // 2, y + h - 3))  # the bar, mid-way along
    c = labelled(main_style="pill")
    assert not green(picture(c, CAMS[1]), (x + w // 2, y + h - 3))


def test_a_bigger_name_has_a_taller_bar():
    c = labelled(tile_share=25)
    pic, (x, row, w, h) = picture(c, CAMS[1]), tile_foot(c)
    px = L.name_px("tile", 25, min(w, h))
    high = px * 22 // 16 - 8  # near the top of its bar: 22 px of bar for a name of 16
    assert px > 20 and green(pic, (x + w - 3, row - high))
    assert not green(picture(labelled(), CAMS[1]), (x + w - 3, row - high))


def test_a_name_is_a_share_of_its_place_between_a_floor_and_a_cap():
    assert L.name_px("tile", 11, 144) == 16  # a tablet's, as before
    # the main camera's: the owner's devices (2026-11-27), as the cards' test has them
    assert [L.name_px("main", 100, side) for side in (206, 582, 628, 1062)] == [
        13,
        22,
        23,
        29,
    ]
    assert L.name_px("main", 50, 206) == 7  # % of the size worked out
    assert L.name_px("main", 100, 412, scale=2) == 26  # in the picture's own pixels
    assert L.name_px("tile", 11, 180) == 20  # a larger tile, a larger name
    # a phone's tile: the least that can be read; a very large one: only a little more
    assert L.name_px("tile", 11, 60) == 11 and L.name_px("tile", 11, 5000) == 22
    assert L.name_px("main", 100, 200) == 13 and L.name_px("main", 100, 5000) == 30
    assert L.name_px("tile", 11, 60, scale=2) == 22  # in the picture's own pixels


def test_a_name_too_long_for_its_tile_is_cut_short_not_drawn_over_the_next():
    font = L.font("sans", 16)
    assert L.fitted("Gate", font, 200) == "Gate"
    short = L.fitted("The far end of the long drive", font, 100)
    assert short.endswith("…") and font.getlength(short) <= 100
    assert L.fitted("The far end of the long drive", font, 12) == ""  # no room at all


def test_a_size_saved_in_px_is_read_as_the_share_it_was_on_a_tablet():
    from casa_mia.modules.compositor.common import commanders_of

    old = {"labels": {"tile_size": 16, "main_size": 20, "font": "sans"}}
    (c,) = commanders_of({"commanders": [old]})
    assert c["labels"] == {"font": "sans", "tile_share": 11, "main_scale": 100}
    # a share already set is kept, and one out of range is held within it
    kept = {"labels": {"tile_size": 40, "tile_share": 9, "main_size": 60}}
    (c,) = commanders_of({"commanders": [kept]})
    assert c["labels"] == {"tile_share": 9, "main_scale": 200}
    # the main camera's share of b8 and b9: the default is 100%, and in step from it
    for share, scale in ((4, 100), (4.0, 100), (5, 125), (2, 50)):
        (c,) = commanders_of({"commanders": [{"labels": {"main_share": share}}]})
        assert c["labels"] == {"main_scale": scale}


def test_the_background_is_see_through_at_its_opacity():
    c = labelled(opacity=50)
    pic, (x, row, w, _) = picture(c, CAMS[1]), tile_foot(c)
    r, g, _, _ = rgba(pic, (x + w - 3, row))
    assert 90 < r < 170 and 90 < g < 170  # half the camera's red, half the green


def test_what_is_wrong_with_labels_is_said():
    def wrong(**over) -> list[str]:
        c = cmd(2)
        c["labels"] = {**c["labels"], **over}
        return problems(
            {
                "commanders": [c],
                "cameras": {e: {} for e in [*CAMS, "camera.kept0", "camera.kept1"]},
            }
        )

    assert wrong() == []
    assert any("font is not one" in p for p in wrong(font="comic"))
    assert any("tile name size must be 4-25" in p for p in wrong(tile_share=2))
    assert wrong(main_share=4.5) == []  # a share takes halves
    assert any("nudge across must be" in p for p in wrong(talk_status_x=1.5))
    assert any("text colour must be like" in p for p in wrong(colour="white"))
    assert any("call status at is not one" in p for p in wrong(talk_status="middle"))
    assert any(
        "call status, nudge down must be -300-300" in p
        for p in wrong(talk_status_y=900)
    )


def banded() -> bytes:
    """A 4:3 picture: a red band along the top, a green one along the foot, blue between."""
    img = Image.new("RGB", (160, 120), "blue")
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 160, 19), fill="red")
    draw.rectangle((0, 100, 160, 120), fill="lime")
    out = io.BytesIO()
    img.save(out, "JPEG", quality=95)
    return out.getvalue()


@pytest.mark.parametrize(
    ("part", "top", "foot"),
    [
        ("center", "blue", "blue"),  # cropped about its middle: most of each band lost
        ("top-left", "red", "blue"),  # the top kept whole: all the crop off the foot
        ("bottom", "blue", "green"),
    ],
)
def test_a_cropped_main_camera_keeps_the_part_asked_for(part, top, foot):
    from casa_mia.modules.compositor import commander

    c = cmd(6)
    c["labels"] = {**c["labels"], "main_style": "none"}
    c["main_keep"] = part
    data = commander(c, {}, {}, CAMS[1], banded())
    pic = Image.open(io.BytesIO(data)).convert("RGBA")
    x, y, w, h = placed(c, CAMS[1]).main

    def colour(xy) -> str:
        r, g, b, _ = rgba(pic, xy)
        return (
            "red" if r > 150 and g < 100 else "green" if g > 150 and r < 100 else "blue"
        )

    # a tenth of the way in from the top and the foot (and clear of the clock)
    assert colour((x + w // 3, y + h // 10)) == top
    assert colour((x + w // 3, y + h - h // 10)) == foot


def test_the_part_to_keep_must_be_one_of_the_nine():
    c = cmd(2)
    c["main_keep"] = "middle"
    said = problems(
        {
            "commanders": [c],
            "cameras": {e: {} for e in [*CAMS, "camera.kept0", "camera.kept1"]},
        }
    )
    assert any("part of the main camera to keep" in p for p in said)


def test_a_card_being_tuned_gets_its_names_sizes_only_while_debug_is_on():
    from casa_mia.modules.compositor import EMPTY_COMMANDER, asked_size, sized, view_key
    from casa_mia.modules.compositor.labels import look

    size = asked_size({"w": "1280", "h": "800", "dpr": "1", "tile": "14", "name": "19"})
    assert size == (1280, 800, 1.0, 14, 19)
    assert asked_size({"w": "1280", "h": "800", "tile": "200"}) is None  # out of bounds
    # its own picture, so a tuned card changes no other device's
    assert view_key("cams", size).endswith("~t14n19")
    assert view_key("cams", (1280, 800, 1.0, 0, 0)) == "cams@1280x800x1"

    on = {**EMPTY_COMMANDER, "debug": {**EMPTY_COMMANDER["debug"], "on": True}}
    drawn = look(sized(on, (1280, 800, 2.0, 14, 19)), 80, 400)
    assert (drawn.tile_px, drawn.main_px) == (28, 38)  # in the picture's own pixels
    off = look(sized(EMPTY_COMMANDER, (1280, 800, 2.0, 14, 19)), 80, 400)
    assert (off.tile_px, off.main_px) == (22, 26)  # debug off: the rules'
