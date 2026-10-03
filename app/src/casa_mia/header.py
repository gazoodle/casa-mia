"""The house photo at the top of the admin home page and the guest welcome page: the one
bundled with the UI, or one uploaded on the admin page, and how each page frames it (zoom
and the point it centres on). Set in the home page's edit mode; nothing is rebuilt.

Admin API (/api/header/): GET "" the settings, GET image the uploaded photo, PUT "" the
framing, PUT image a new photo (the raw file as the body), DELETE image back to the
bundled one."""

from __future__ import annotations

import functools
import io
import json
import logging
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError

from .server import WEB_DIR

_LOGGER = logging.getLogger(__name__)

# The app's config folder (backed up with the app); tests point it elsewhere.
FOLDER = Path("/config")
# The house's name (the house_name option), shown over the photo and on the welcome page.
HOUSE = "Casa Mia"
# Each page's framing until one is saved: zoom (1 = cover) and the point it centres on, in %.
DEFAULT = {
    "home": {"zoom": 1.0, "x": 50.0, "y": 49.0},
    "welcome": {"zoom": 1.35, "x": 21.0, "y": 89.0},
}
PAGES = tuple(DEFAULT)
MAX_ZOOM = 4.0
MAX_UPLOAD = 30 * 1024 * 1024
STORED_WIDTH = 2400  # plenty for a desktop hero, a few hundred KB in the backup
PHONE_WIDTH = 1100  # the welcome page: phones, at a third of the size

Response = tuple[int, str, bytes]


def _image() -> Path:
    return FOLDER / "header.jpg"


def _store() -> Path:
    return FOLDER / "header.json"


def photo() -> Path | None:
    """The photo in use: the uploaded one, else the UI's bundled one (None if neither)."""
    if _image().is_file():
        return _image()
    found = sorted((WEB_DIR / "assets").glob("header-*.jpg"))
    return found[0] if found else None


def _clean(page: str, frame: Any) -> dict[str, float]:
    """A page's framing, every value present and in range."""
    frame = frame if isinstance(frame, dict) else {}
    out = {}
    for key, default in DEFAULT[page].items():
        try:
            value = float(frame.get(key, default))
        except (TypeError, ValueError):
            value = default
        top = MAX_ZOOM if key == "zoom" else 100.0
        out[key] = round(min(max(value, 1.0 if key == "zoom" else 0.0), top), 3)
    return out


def framing() -> dict[str, dict[str, float]]:
    try:
        saved = json.loads(_store().read_text())
    except (OSError, ValueError):
        saved = {}
    saved = saved if isinstance(saved, dict) else {}
    return {page: _clean(page, saved.get(page)) for page in PAGES}


def view() -> dict[str, Any]:
    image = _image()
    custom = image.is_file()
    return {
        "house": HOUSE,
        "custom": custom,
        "stamp": int(image.stat().st_mtime) if custom else 0,
        **framing(),
    }


def phone_jpeg() -> bytes | None:
    """The photo made smaller for phones (the welcome page). None if there is none."""
    path = photo()
    return _shrunk(path, path.stat().st_mtime) if path else None


@functools.lru_cache(maxsize=2)
def _shrunk(path: Path, _mtime: float) -> bytes:
    img = Image.open(path).convert("RGB")
    img.thumbnail((PHONE_WIDTH, PHONE_WIDTH))
    out = io.BytesIO()
    img.save(out, "JPEG", quality=76, progressive=True, optimize=True)
    return out.getvalue()


def _json(status: int, data: dict) -> Response:
    return status, "application/json", json.dumps(data).encode()


def _save_framing(body: bytes) -> Response:
    try:
        change = json.loads(body or b"{}")
    except ValueError:
        return _json(400, {"error": "Not JSON."})
    if not isinstance(change, dict):
        return _json(400, {"error": "Not JSON."})
    current = framing()
    for page in PAGES:
        if page in change:
            current[page] = _clean(page, change[page])
            _LOGGER.info("house photo framing on the %s page: %s", page, current[page])
    tmp = _store().with_suffix(".tmp")
    tmp.write_text(json.dumps(current, indent=2))
    tmp.replace(_store())
    return _json(200, view())


def _save_image(body: bytes) -> Response:
    if len(body) > MAX_UPLOAD:
        return _json(413, {"error": "That photo is over 30 MB."})
    try:
        img = Image.open(io.BytesIO(body))
        img = ImageOps.exif_transpose(img).convert(
            "RGB"
        )  # phone photos lie on their side
    except (UnidentifiedImageError, OSError):
        return _json(400, {"error": "That is not a photo this app can read."})
    img.thumbnail((STORED_WIDTH, STORED_WIDTH))
    tmp = _image().with_suffix(".tmp")
    img.save(tmp, "JPEG", quality=84, progressive=True, optimize=True)
    tmp.replace(_image())
    _LOGGER.info(
        "house photo replaced: %dx%d, %d KB",
        img.width,
        img.height,
        _image().stat().st_size // 1024,
    )
    return _json(200, view())


def handle(method: str, rest: str, query: dict, body: bytes) -> Response:
    rest = rest.strip("/")
    if method == "GET" and rest == "":
        return _json(200, view())
    if method == "GET" and rest == "image":
        if not _image().is_file():
            return _json(404, {"error": "No uploaded photo."})
        return 200, "image/jpeg", _image().read_bytes()
    if method == "PUT" and rest == "":
        return _save_framing(body)
    if method == "PUT" and rest == "image":
        return _save_image(body)
    if method == "DELETE" and rest == "image":
        _image().unlink(missing_ok=True)
        _LOGGER.info("house photo back to the bundled one")
        return _json(200, view())
    return _json(404, {"error": "Unknown request."})
