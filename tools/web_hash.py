#!/usr/bin/env python3
"""Guard the committed admin UI build against stale source.

The built UI (app/src/casa_mia/web) is committed so the app image needs no Node. This
hashes the UI sources (app/web, minus node_modules) and compares the hash with the one
tools/build_web stored next to the build. A mismatch means the sources changed without a
rebuild: run tools/build_web.

    web_hash.py          check (exit 1 on mismatch)
    web_hash.py --write  store the current hash (tools/build_web does this)
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "app" / "web"
STAMP = ROOT / "app" / "src" / "casa_mia" / "web" / "SOURCE_HASH"
SKIP = {"node_modules"}


def source_hash() -> str:
    digest = hashlib.sha256()
    for path in sorted(SOURCES.rglob("*")):
        rel = path.relative_to(SOURCES)
        if path.is_file() and not SKIP & set(rel.parts) and path.name != ".DS_Store":
            digest.update(rel.as_posix().encode() + b"\0" + path.read_bytes() + b"\0")
    return digest.hexdigest()


def main() -> int:
    current = source_hash()
    if "--write" in sys.argv:
        STAMP.write_text(current + "\n")
        return 0
    stored = STAMP.read_text().strip() if STAMP.exists() else "(no build)"
    if stored != current:
        print(f"admin UI build is stale: sources {current[:12]}, build {stored[:12]}.")
        print("Run tools/build_web and commit the result.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
