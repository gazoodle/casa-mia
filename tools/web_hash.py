#!/usr/bin/env python3
"""Guard the committed frontend builds against stale source.

Two builds are committed so nothing on the box needs Node: the admin UI (app/web into
app/src/casa_mia/web, by tools/build_web) and the Lovelace cards (integration/cards into
the integration's www/cm-cards.js, by tools/build_cards). Each build stores a hash of its
sources (node_modules aside; both also read SHARED: the layout options, and the WebRTC
player the cards and the admin page share); a mismatch means the sources changed without
a rebuild.

    web_hash.py                  check both (exit 1 on a mismatch)
    web_hash.py --write NAME     store NAME's current hash (web or cards; its build does)
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / "app" / "src" / "casa_mia" / "layout.json"
# Files both builds read, hashed into each.
SHARED = (LAYOUT, ROOT / "app" / "web" / "src" / "webrtc.ts")
# name -> (its source folder, where its hash is stored, the tool that builds it)
BUILDS = {
    "web": (
        ROOT / "app" / "web",
        ROOT / "app" / "src" / "casa_mia" / "web" / "SOURCE_HASH",
        "tools/build_web",
    ),
    "cards": (
        ROOT / "integration" / "cards",
        ROOT / "integration" / "cards" / "SOURCE_HASH",
        "tools/build_cards",
    ),
}
SKIP = {"node_modules", "SOURCE_HASH", ".DS_Store"}


def source_hash(sources: Path) -> str:
    digest = hashlib.sha256()
    for path in [*sorted(sources.rglob("*")), *SHARED]:
        rel = path.relative_to(ROOT if path in SHARED else sources)
        if path.is_file() and not SKIP & set(rel.parts):
            digest.update(rel.as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()


def main() -> int:
    if "--write" in sys.argv:
        sources, stamp, _ = BUILDS[sys.argv[-1]]
        stamp.write_text(source_hash(sources) + "\n")
        return 0
    stale = 0
    for name, (sources, stamp, tool) in BUILDS.items():
        current = source_hash(sources)
        stored = stamp.read_text().strip() if stamp.exists() else "(no build)"
        if stored != current:
            print(
                f"{name} build is stale: sources {current[:12]}, build {stored[:12]}."
            )
            print(f"Run {tool} and commit the result.")
            stale = 1
    return stale


if __name__ == "__main__":
    raise SystemExit(main())
