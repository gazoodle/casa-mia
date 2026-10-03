#!/usr/bin/env python3
"""Keep every custom component's version in step with its files.

A component's version is the app version it last changed in (`2026.10.1-b3`), stamped here,
never by hand. `integration/versions.lock.json` records each component's version and a digest
of its files (manifest version excluded). A component whose files changed since the lock fails
the check, so an installed update is always detectable and the restart Repair fires only when
the component really changed, not on every app update.

    tools/component_versions.py            check (also run by pytest)
    tools/component_versions.py --update   stamp changed components with the app version, record
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import tomllib
from pathlib import Path

from casa_mia.components import is_ignored, manifest_version

ROOT = Path(__file__).resolve().parents[1]
COMPONENTS = ROOT / "integration" / "custom_components"
LOCK = ROOT / "integration" / "versions.lock.json"
_VERSION_RE = re.compile(rb'("version"\s*:\s*)"[^"]*"')


def digest(folder: Path) -> str:
    h = hashlib.sha256()
    for path in sorted(p for p in folder.rglob("*") if p.is_file()):
        if is_ignored(path):
            continue
        data = path.read_bytes()
        if path.name == "manifest.json":
            data = _VERSION_RE.sub(rb'\1""', data)
        h.update(path.relative_to(folder).as_posix().encode() + b"\0" + data)
    return h.hexdigest()


def current() -> dict[str, dict[str, str | None]]:
    return {
        p.name: {"version": manifest_version(p), "digest": digest(p)}
        for p in sorted(COMPONENTS.iterdir())
        if (p / "manifest.json").is_file()
    }


def problems(
    now: dict[str, dict[str, str | None]], lock: dict[str, dict[str, str | None]]
) -> list[str]:
    out = []
    for domain, entry in now.items():
        old = lock.get(domain)
        if old is None:
            out.append(f"{domain}: not in versions.lock.json (run --update)")
        elif old["digest"] != entry["digest"]:
            out.append(f"{domain}: files changed since the lock (run --update)")
        elif old != entry:
            out.append(f"{domain}: lock is stale (run --update)")
    out += [
        f"{d}: in lock but component is gone (run --update)"
        for d in lock.keys() - now.keys()
    ]
    return out


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--update", action="store_true")
    args = parser.parse_args()
    now = current()
    lock = json.loads(LOCK.read_text()) if LOCK.exists() else {}
    if args.update:
        app = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]["version"]
        for domain, entry in now.items():
            old = lock.get(domain)
            if (old is None or old["digest"] != entry["digest"]) and entry[
                "version"
            ] != app:
                manifest = COMPONENTS / domain / "manifest.json"
                manifest.write_bytes(
                    _VERSION_RE.sub(
                        rb'\1"' + app.encode() + b'"', manifest.read_bytes(), count=1
                    )
                )
                entry["version"] = app
                print(f"{domain}: {old and old['version']} -> {app}")
        LOCK.write_text(json.dumps(now, indent=2, sort_keys=True) + "\n")
        return 0
    found = problems(now, lock)
    print("\n".join(found))
    return 1 if found else 0


if __name__ == "__main__":
    raise SystemExit(main())
