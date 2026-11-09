#!/usr/bin/env python3
"""Draw the brand images of the two children that don't wear the plain Casa Mia brand.

NEVER TEST THIS: run it after changing a design, and look at the results.

    .venv/bin/python tools/brand_children.py

- Casa Mia Intercom: the Casa Mia house with an intercom panel in front of it.
- Casa Mia Protect Talkback: UniFi Protect's own icon (branding/unifiprotect-icon.png,
  from brands.home-assistant.io) wearing a pirate's eye patch. It's a patch into HA, kept
  until HA and go2rtc can talk to Protect cameras themselves.

Writes each component's brand/ folder (icon, logo and dark_logo, each with @2x) at the
sizes the other children use. Drawn at 4x and scaled down, which smooths the edges.
Needs Pillow in the venv, and macOS's Avenir Next.
"""

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
PATCH = (20, 20, 22, 255)


def _canvas(size: int) -> tuple[Image.Image, float]:
    """A transparent square drawn at SUPERSAMPLE, and its scale from a 512 grid."""
    side = size * SUPERSAMPLE
    image = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    return image, size * SUPERSAMPLE / 512


def _panel(draw: ImageDraw.ImageDraw, s: float, x: float, y: float, k: float) -> None:
    """The intercom panel (the old Intercom talkback brand's), 160 x 320 at k = 1, with
    its top left at (x, y) on the 512 grid."""

    def box(left, top, right, bottom):
        return (
            (x + left * k) * s,
            (y + top * k) * s,
            (x + right * k) * s,
            (y + bottom * k) * s,
        )

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


def intercom_icon(size: int) -> Image.Image:
    image, s = _canvas(size)
    house = Image.open(ROOT / "branding" / "icon-1024.png").convert("RGBA")
    image.alpha_composite(house.resize(image.size, Image.Resampling.LANCZOS))
    _panel(ImageDraw.Draw(image), s, 340, 222, 0.82)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def talkback_icon(size: int) -> Image.Image:
    image, s = _canvas(size)
    protect = Image.open(ROOT / "branding" / "unifiprotect-icon.png").convert("RGBA")
    image.alpha_composite(protect.resize(image.size, Image.Resampling.LANCZOS))
    draw = ImageDraw.Draw(image)
    # The strap, from edge to edge of the camera's head, under the patch.
    draw.line(((176 * s, 96 * s), (336 * s, 196 * s)), fill=PATCH, width=round(14 * s))
    # The patch over the lens, slightly flattened as a real one is.
    draw.ellipse((186 * s, 98 * s, 326 * s, 222 * s), fill=PATCH)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def _logo(
    icon, width: int, height: int, words: tuple[str, str], colours
) -> Image.Image:
    """The icon on the left, the first word over the second on the right."""
    w, h = width * SUPERSAMPLE, height * SUPERSAMPLE
    image = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    image.alpha_composite(icon(h), (round(h * 0.02), 0))

    draw = ImageDraw.Draw(image)
    big = ImageFont.truetype(FONT, round(h * 0.30), index=0)
    small = ImageFont.truetype(FONT, round(h * 0.23), index=2)
    x = round(h * 1.06)
    draw.text((x, h * 0.50), words[0], font=big, fill=colours[0], anchor="ls")
    draw.text(
        (x + round(h * 0.01), h * 0.80),
        words[1],
        font=small,
        fill=colours[1],
        anchor="ls",
    )
    return image.resize((width, height), Image.Resampling.LANCZOS)


BRANDS = {
    "casa_mia_intercom": (intercom_icon, ("Casa Mia", "Intercom")),
    "casa_mia_protect_talkback": (talkback_icon, ("Protect", "talkback")),
}


def main() -> None:
    for domain, (icon, words) in BRANDS.items():
        brand = COMPONENTS / domain / "brand"
        brand.mkdir(parents=True, exist_ok=True)
        for suffix, scale in (("", 1), ("@2x", 2)):
            icon(256 * scale).save(brand / f"icon{suffix}.png")
            for name, colours in (
                ("logo", (GREEN, TERRACOTTA)),
                ("dark_logo", (CREAM, LIGHT_TERRACOTTA)),
            ):
                _logo(icon, 320 * scale, 128 * scale, words, colours).save(
                    brand / f"{name}{suffix}.png"
                )
        print(f"wrote {brand.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
