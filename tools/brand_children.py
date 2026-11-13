#!/usr/bin/env python3
"""Draw the brand images of Casa Mia's children: the Casa Mia house, with what each child
does drawn in front of it in Casa Mia's colours.

NEVER TEST THIS: run it after changing a design, and look at the results.

    .venv/bin/python tools/brand_children.py

- Camera Commander: a security camera on a wall bracket.
- Dash-Bored: a bored face on a dashboard tile.
- Guest Login: a QR code (a drawing of one, not a real code).
- Intercom: an intercom panel.
- Love it or Loathe it: a heart on the left and a vomiting face on the right.
- Protect Talkback: UniFi Protect's camera (branding/unifiprotect-icon.png, from
  brands.home-assistant.io), taken off its blue background and drawn small.

Writes each component's brand/ folder (icon, logo and dark_logo, each with @2x) at the
sizes Casa Mia's own uses. Drawn at 4x on a 512 grid and scaled down, which smooths the
edges. Needs Pillow in the venv, and macOS's Avenir Next.
"""

from collections.abc import Callable
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = ROOT / "integration" / "custom_components"
FONT = "/System/Library/Fonts/Avenir Next.ttc"  # index 0 is Bold, 2 Demi Bold
SUPERSAMPLE = 4

# Casa Mia's colours (branding/).
TERRACOTTA = (196, 86, 50, 255)
CREAM = (247, 232, 211, 255)
GREEN = (30, 74, 56, 255)
DARK_LENS = (18, 42, 33, 255)
LIGHT_TERRACOTTA = (233, 132, 96, 255)
VOMIT = (139, 178, 84, 255)  # Love it or Loathe it's face only

Box = Callable[[float, float, float, float], tuple[float, float, float, float]]


def _boxer(s: float, x: float, y: float, k: float) -> Box:
    """Boxes on the 512 grid, for a drawing k times its own size with its origin at (x, y)."""
    return lambda left, top, right, bottom: (
        (x + left * k) * s,
        (y + top * k) * s,
        (x + right * k) * s,
        (y + bottom * k) * s,
    )


def _panel(draw: ImageDraw.ImageDraw, s: float) -> None:
    """The intercom panel (the old Intercom talkback brand's), 160 x 320 in its own units."""
    k = 0.82
    box = _boxer(s, 340, 222, k)
    # A cream outline lifts it off the house behind.
    draw.rounded_rectangle(box(-10, -10, 170, 330), radius=52 * k * s, fill=CREAM)
    draw.rounded_rectangle(box(0, 0, 160, 320), radius=44 * k * s, fill=TERRACOTTA)
    draw.rounded_rectangle(box(18, 20, 142, 300), radius=32 * k * s, fill=CREAM)
    # Camera lens, with a glint.
    draw.ellipse(box(50, 46, 110, 106), fill=GREEN)
    draw.ellipse(box(66, 62, 94, 90), fill=DARK_LENS)
    draw.ellipse(box(68, 64, 78, 74), fill=CREAM)
    # Speaker grille, then the bell button, ringed.
    for top in (129, 151, 173):
        draw.rounded_rectangle(
            box(44, top, 116, top + 10), radius=5 * k * s, fill=TERRACOTTA
        )
    draw.ellipse(box(48, 210, 112, 274), fill=TERRACOTTA)
    draw.ellipse(box(62, 224, 98, 260), outline=CREAM, width=round(6 * k * s))


def _camera(draw: ImageDraw.ImageDraw, s: float) -> None:
    """A security camera on a wall bracket, looking left, 220 x 190 in its own units."""
    k = 0.95
    box = _boxer(s, 262, 290, k)
    # Wall plate, and the arm from it to the back of the body, behind the body.
    draw.rounded_rectangle(box(180, 0, 224, 130), radius=14 * k * s, fill=CREAM)
    draw.rounded_rectangle(box(189, 9, 215, 121), radius=8 * k * s, fill=GREEN)
    draw.rounded_rectangle(box(140, 42, 200, 72), radius=8 * k * s, fill=CREAM)
    draw.rounded_rectangle(box(146, 48, 194, 66), radius=5 * k * s, fill=GREEN)
    # The body: cream outline, terracotta housing, green hood over the top.
    draw.rounded_rectangle(box(-10, 0, 170, 100), radius=30 * k * s, fill=CREAM)
    draw.rounded_rectangle(box(0, 22, 160, 90), radius=22 * k * s, fill=TERRACOTTA)
    draw.rounded_rectangle(box(-4, 8, 164, 34), radius=12 * k * s, fill=GREEN)
    # The lens at the front, with a glint.
    draw.ellipse(box(8, 34, 58, 84), fill=CREAM)
    draw.ellipse(box(16, 42, 50, 76), fill=GREEN)
    draw.ellipse(box(25, 51, 41, 67), fill=DARK_LENS)
    draw.ellipse(box(27, 52, 34, 59), fill=CREAM)
    # A status light.
    draw.ellipse(box(132, 48, 146, 62), fill=CREAM)


# A drawn QR code's modules, row by row on a 9 x 9 grid between the three finders: it
# looks like a code and is not one.
QR_MODULES = [
    "....#.#..",
    "...##.#..",
    "....#..#.",
    "#.##.#.##",
    ".#..##.#.",
    "##.#..#.#",
    "....#.##.",
    "....##..#",
    "....#.#.#",
]


def _qr(draw: ImageDraw.ImageDraw, s: float) -> None:
    """A QR code on a cream card with a terracotta edge, 200 x 200 in its own units."""
    k = 0.92
    box = _boxer(s, 300, 268, k)
    draw.rounded_rectangle(box(-10, -10, 210, 210), radius=34 * k * s, fill=CREAM)
    draw.rounded_rectangle(box(0, 0, 200, 200), radius=28 * k * s, fill=TERRACOTTA)
    draw.rounded_rectangle(box(12, 12, 188, 188), radius=18 * k * s, fill=CREAM)
    # Nine-unit grid inside the card: three finders, the modules between them.
    cell, origin = 16.0, 28.0

    def module(col: float, row: float, cols: float = 1, rows: float = 1):
        return box(
            origin + col * cell,
            origin + row * cell,
            origin + (col + cols) * cell,
            origin + (row + rows) * cell,
        )

    for col, row in ((0, 0), (6, 0), (0, 6)):
        draw.rounded_rectangle(module(col, row, 3, 3), radius=8 * k * s, fill=GREEN)
        draw.rounded_rectangle(
            module(col + 0.5, row + 0.5, 2, 2), radius=5 * k * s, fill=CREAM
        )
        draw.rounded_rectangle(
            module(col + 0.9, row + 0.9, 1.2, 1.2), radius=3 * k * s, fill=GREEN
        )
    for row, line in enumerate(QR_MODULES):
        for col, mark in enumerate(line):
            if mark == "#" and not (
                (col < 3 and row < 3) or (col > 5 and row < 3) or (col < 3 and row > 5)
            ):
                draw.rounded_rectangle(
                    module(col + 0.08, row + 0.08, 0.84, 0.84),
                    radius=3 * k * s,
                    fill=GREEN,
                )


def _protect_camera() -> Image.Image:
    """UniFi Protect's camera from its icon, with the blue square around it taken away:
    the blue reachable from the corners. The lens is blue too, but the housing encloses it."""
    icon = Image.open(ROOT / "branding" / "unifiprotect-icon.png").convert("RGBA")
    key = Image.new("L", icon.size, 0)
    pixels, keys = icon.load(), key.load()
    assert pixels is not None and keys is not None
    for y in range(icon.height):
        for x in range(icon.width):
            r, g, b, a = pixels[x, y]  # type: ignore[misc]
            if a < 128 or (b > r + 60 and b > g + 20):
                keys[x, y] = 255
    ImageDraw.floodfill(key, (0, 0), 128)
    for y in range(icon.height):
        for x in range(icon.width):
            if keys[x, y] == 128:
                pixels[x, y] = (0, 0, 0, 0)
    return icon.crop(icon.getbbox())


def _protect(image: Image.Image, s: float) -> None:
    """Protect's camera, small, in the bottom right corner on a cream disc."""
    draw = ImageDraw.Draw(image)
    draw.ellipse((330 * s, 300 * s, 490 * s, 460 * s), fill=CREAM)
    draw.ellipse((340 * s, 310 * s, 480 * s, 450 * s), fill=GREEN)
    camera = _protect_camera()
    height = round(118 * s)
    camera = camera.resize(
        (round(camera.width * height / camera.height), height), Image.Resampling.LANCZOS
    )
    image.alpha_composite(camera, (round(410 * s - camera.width / 2), round(321 * s)))


def _love_and_loathe(image: Image.Image, s: float) -> None:
    """A heart on the left and a vomiting face on the right, each on a cream disc in
    front of the house."""
    draw = ImageDraw.Draw(image)
    width = round(10 * s)

    def at(*points: float) -> list[float]:
        return [p * s for p in points]

    # Love: the heart, two circles over a triangle.
    draw.ellipse(at(12, 280, 212, 480), fill=CREAM)
    draw.ellipse(at(44, 326, 116, 398), fill=TERRACOTTA)
    draw.ellipse(at(108, 326, 180, 398), fill=TERRACOTTA)
    draw.polygon(at(46, 372, 178, 372, 112, 448), fill=TERRACOTTA)

    # Loathe: a face with its eyes screwed shut, and what comes out of its mouth.
    draw.ellipse(at(300, 280, 500, 480), fill=CREAM)
    draw.ellipse(at(322, 296, 478, 452), fill=GREEN)
    draw.line(at(350, 340, 378, 354, 350, 368), fill=CREAM, width=width, joint="curve")
    draw.line(at(450, 340, 422, 354, 450, 368), fill=CREAM, width=width, joint="curve")
    draw.ellipse(at(370, 380, 430, 424), fill=DARK_LENS)
    draw.rounded_rectangle(at(380, 398, 420, 468), radius=20 * s, fill=VOMIT)
    draw.ellipse(at(362, 448, 438, 478), fill=VOMIT)


def _bored(image: Image.Image, s: float) -> None:
    """A bored face on a dashboard tile: heavy eyelids and a flat mouth."""
    draw = ImageDraw.Draw(image)

    def at(*points: float) -> list[float]:
        return [p * s for p in points]

    draw.rounded_rectangle(at(126, 236, 386, 496), radius=62 * s, fill=CREAM)
    draw.rounded_rectangle(at(144, 254, 368, 478), radius=46 * s, fill=GREEN)
    # Each eye is a disc with the lid drawn over its top half, the pupil looking aside.
    for x in (206, 306):
        draw.ellipse(at(x - 34, 316, x + 34, 384), fill=CREAM)
        draw.ellipse(at(x - 4, 352, x + 20, 376), fill=DARK_LENS)
        draw.rectangle(at(x - 38, 312, x + 38, 350), fill=GREEN)
        draw.line(at(x - 38, 350, x + 38, 350), fill=CREAM, width=round(10 * s))
    draw.line(at(212, 428, 300, 428), fill=CREAM, width=round(12 * s))
    draw.ellipse(at(206, 422, 218, 434), fill=CREAM)
    draw.ellipse(at(294, 422, 306, 434), fill=CREAM)


OVERLAYS: dict[str, Callable[[Image.Image, float], None]] = {
    "casa_mia_commander": lambda image, s: _camera(ImageDraw.Draw(image), s),
    "casa_mia_dash_bored": _bored,
    "casa_mia_guest_login": lambda image, s: _qr(ImageDraw.Draw(image), s),
    "casa_mia_intercom": lambda image, s: _panel(ImageDraw.Draw(image), s),
    "casa_mia_love_or_loathe": _love_and_loathe,
    "casa_mia_protect_talkback": _protect,
}
WORDS = {
    "casa_mia_commander": "Camera Commander",
    "casa_mia_dash_bored": "Dash-Bored",
    "casa_mia_guest_login": "Guest Login",
    "casa_mia_intercom": "Intercom",
    "casa_mia_love_or_loathe": "Love it or Loathe it",
    "casa_mia_protect_talkback": "Protect Talkback",
}


def icon(domain: str, size: int) -> Image.Image:
    side = size * SUPERSAMPLE
    image = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    house = Image.open(ROOT / "branding" / "icon-1024.png").convert("RGBA")
    image.alpha_composite(house.resize(image.size, Image.Resampling.LANCZOS))
    OVERLAYS[domain](image, side / 512)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def logo(domain: str, width: int, height: int, colours) -> Image.Image:
    """The icon on the left, "Casa Mia" over the child's name on the right, the name made
    smaller when it would run off the edge."""
    w, h = width * SUPERSAMPLE, height * SUPERSAMPLE
    image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    image.alpha_composite(icon(domain, h), (round(h * 0.02), 0))

    draw = ImageDraw.Draw(image)
    x = round(h * 1.06)
    big = ImageFont.truetype(FONT, round(h * 0.30), index=0)
    room = w - x - round(h * 0.04)
    size = round(h * 0.23)
    small = ImageFont.truetype(FONT, size, index=2)
    while draw.textlength(WORDS[domain], font=small) > room:
        size -= 1
        small = ImageFont.truetype(FONT, size, index=2)
    draw.text((x, h * 0.50), "Casa Mia", font=big, fill=colours[0], anchor="ls")
    draw.text(
        (x + round(h * 0.01), h * 0.80),
        WORDS[domain],
        font=small,
        fill=colours[1],
        anchor="ls",
    )
    return image.resize((width, height), Image.Resampling.LANCZOS)


def main() -> None:
    for domain in OVERLAYS:
        brand = COMPONENTS / domain / "brand"
        brand.mkdir(parents=True, exist_ok=True)
        for suffix, scale in (("", 1), ("@2x", 2)):
            icon(domain, 256 * scale).save(brand / f"icon{suffix}.png")
            for name, colours in (
                ("logo", (GREEN, TERRACOTTA)),
                ("dark_logo", (CREAM, LIGHT_TERRACOTTA)),
            ):
                logo(domain, 320 * scale, 128 * scale, colours).save(
                    brand / f"{name}{suffix}.png"
                )
        print(f"wrote {brand.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
