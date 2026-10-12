"""What gets printed for guests: the Wi-Fi's QR code, and a card holding it beside an
endpoint's QR code (join the Wi-Fi, then scan to sign in), in the printed cards' style.

The card is one SVG, so it prints from a page and pastes into a document alike.
"""

from __future__ import annotations

import html
import re
from typing import Any

from ... import qr

SECURITY = ("WPA", "WEP", "nopass")
W, H = 1200, 760  # the card, in SVG units (a landscape postcard)
QR = 400
MONO = (
    "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"  # a password's letters
)
# The words on the cards, in English until Guest login's settings give others (QR codes ->
# Words): for guests who read another language.
WORDS = {
    "join": "Join the Wi-Fi",
    "sign_in": "Scan to sign in",
    "open": "Scan to open",
    "network": "Network",
    "password": "Password",
    "passcode": "Your host will give you a code",
    "closed": "Closed",
    "closed_note": "Its code shows while it's open",
}


def words(saved: dict[str, str] | None) -> dict[str, str]:
    """The cards' words: each saved one, else its English."""
    return {k: (saved or {}).get(k) or v for k, v in WORDS.items()}


def wifi_text(wifi: dict[str, Any]) -> str:
    """The text a phone's camera reads as "join this network" (the de facto WIFI: format)."""

    def esc(value: str) -> str:
        return re.sub(r'([\\;,:"])', r"\\\1", value)

    security = wifi.get("security") if wifi.get("security") in SECURITY else "WPA"
    parts = [f"T:{security}", f"S:{esc(str(wifi.get('ssid') or ''))}"]
    if security != "nopass":
        parts.append(f"P:{esc(str(wifi.get('password') or ''))}")
    if wifi.get("hidden"):
        parts.append("H:true")
    return "WIFI:" + ";".join(parts) + ";;"


def _qr_at(text: str | None, x: float, y: float, frame: bool = True) -> str:
    """A QR code as a nested SVG at (x, y), QR units wide; None: a grey tile in its place
    (a closed endpoint's, its step saying so)."""
    if text is None:
        return (
            f'<rect x="{x}" y="{y}" width="{QR}" height="{QR}" rx="{QR * qr.RADIUS}" '
            f'fill="#e6e6e6"/>'
        )
    body = qr.svg(text, frame).decode()
    return body.replace(
        '<svg xmlns="http://www.w3.org/2000/svg"',
        f'<svg x="{x}" y="{y}" width="{QR}" height="{QR}"',
        1,
    )


def _text(
    x: float, y: float, value: str, size: int, weight: int = 400, mono: str = ""
) -> str:
    """A line, centred on x; `mono` follows it in a fixed-pitch font (a network's name,
    its password), so a 0 and an O, an l and a 1, can't be mistaken."""
    tail = f'<tspan font-family="{MONO}">{html.escape(mono)}</tspan>' if mono else ""
    return (
        f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" '
        f'text-anchor="middle">{html.escape(value)}{tail}</text>'
    )


def card_svg(
    title: str | None,
    wifi: dict[str, Any] | None,
    sign_in: str | None,
    label: str,
    note: str | None = None,
    *,
    heading: str | None = None,
    code: bool = True,
    border: bool = True,
    frames: bool = True,
    details: bool = True,
    steps: bool = True,
    width: float = W,
    said: dict[str, str] | None = None,
) -> bytes:
    """The guest card: the title, then the Wi-Fi's code (when there is a network) and the
    endpoint's code side by side, each with its step and the words a phone can't scan
    (`said`: the words, from words()). The QR code card draws it too: no title, no second
    code (`code` False: the Wi-Fi's alone; `sign_in` None: a closed endpoint's grey tile),
    another `heading` (a page's code), no border, no frames round the codes, no network
    words, no steps (`steps` False: no headings, no name under the code), and its own
    width. With nothing but one code, the code alone."""
    said = said or words(None)
    # Each column: its code, its heading, and its lines as (words, fixed-pitch words).
    columns: list[tuple[str | None, str | None, list[tuple[str, str]]]] = []
    if wifi and wifi.get("ssid"):
        lines = [(f"{said['network']}: ", str(wifi["ssid"]))]
        if wifi.get("security") != "nopass" and wifi.get("password"):
            lines.append((f"{said['password']}: ", str(wifi["password"])))
        columns.append(
            (wifi_text(wifi), said["join"] if steps else None, lines if details else [])
        )
    if code:
        under = [(label, ""), *([(note, "")] if note else [])]
        columns.append(
            (
                sign_in,
                (heading or said["sign_in"]) if steps else None,
                under if steps else [],
            )
        )
    if (
        not title
        and len(columns) == 1
        and columns[0][0]
        and columns[0][1:] == (None, [])
    ):
        return qr.svg(columns[0][0], frames)  # the code alone: the card lays it out
    numbered = len(columns) > 1
    top = 140 if title else 48
    # Down from the code: a heading 62 below it, a first line 50 below that (56 with no
    # heading), each next line 44 further, and 64 under the last.
    placed: list[list[tuple[float, str, str, int, int]]] = []
    for n, (_, head, lines) in enumerate(columns):
        y, rows = top + QR, []
        if head:
            y += 62
            rows.append((y, f"{n + 1}. {head}" if numbered else head, "", 36, 650))
        for i, (text, mono) in enumerate(lines):
            y += 44 if i else (50 if head else 56)
            rows.append((y, text, mono, 30, 400))
        placed.append(rows)
    height = max((r[-1][0] + 64 if r else top + QR + 48) for r in placed)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'font-family="system-ui, -apple-system, Segoe UI, sans-serif" fill="#111">',
        f'<rect x="4" y="4" width="{width - 8}" height="{height - 8}" rx="36" fill="#fff"'
        + (' stroke="#111" stroke-width="8"/>' if border else "/>"),
    ]
    if title:
        parts.append(_text(width / 2, 92, title, 52, 650))
    step = width / max(len(columns), 1)
    for n, ((text, _, _), rows) in enumerate(zip(columns, placed, strict=True)):
        cx = step * n + step / 2
        parts.append(_qr_at(text, cx - QR / 2, top, frames))
        parts.extend(
            _text(cx, y, line, size, weight, mono)
            for y, line, mono, size, weight in rows
        )
    parts.append("</svg>")
    return "".join(parts).encode()


def card_page(svg: bytes, title: str) -> bytes:
    """The card on its own page, ready to print (the browser's Print, or the button)."""
    return (
        "<!doctype html><html lang=en><head><meta charset=utf-8>"
        "<meta name=viewport content='width=device-width,initial-scale=1'>"
        f"<title>{html.escape(title)}</title><style>"
        "body{margin:0;padding:24px;background:#eee;font:16px system-ui,sans-serif}"
        "svg{display:block;width:min(100%,180mm);height:auto;margin:0 auto}"
        "button{display:block;margin:18px auto 0;padding:10px 24px;font:inherit;"
        "border-radius:999px;border:0;background:#1f7a4d;color:#fff;cursor:pointer}"
        "@media print{body{background:#fff;padding:0}button{display:none}}"
        "</style></head><body>"
        + svg.decode()
        + "<button onclick='print()'>Print</button></body></html>"
    ).encode()
