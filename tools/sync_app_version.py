#!/usr/bin/env python3
"""Copy the package version (pyproject.toml, the one source) into app/config.yaml."""

from __future__ import annotations

import argparse
import re
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PYPROJECT = ROOT / "pyproject.toml"
APP_CONFIG = ROOT / "app" / "config.yaml"
VERSION_RE = re.compile(r'(?m)^version: "[^"]+"$')


def source_version() -> str:
    version = tomllib.loads(PYPROJECT.read_text(encoding="utf-8"))["project"]["version"]
    if not isinstance(version, str) or not version:
        raise ValueError("pyproject.toml has no [project].version")
    return version


def synced_config() -> tuple[str, str]:
    current = APP_CONFIG.read_text(encoding="utf-8")
    updated, count = VERSION_RE.subn(f'version: "{source_version()}"', current, count=1)
    if count != 1:
        raise ValueError("app/config.yaml must contain one quoted top-level version")
    return current, updated


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()

    current, updated = synced_config()
    if current == updated:
        return 0
    if args.check:
        print("app/config.yaml version is not synced with pyproject.toml")
        return 1
    APP_CONFIG.write_text(updated, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
