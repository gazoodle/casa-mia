"""Sensor Watch is published by itself (docs/design/marketplace-mirrors.md), so its
component must import nothing from Casa Mia's: there, that folder isn't installed."""

import ast
from pathlib import Path

ROOT = Path(__file__).parents[1] / "integration" / "custom_components"
OURS = ROOT / "casa_mia_sensor_watch"


def test_it_imports_nothing_from_casa_mia():
    bad = []
    for path in OURS.rglob("*.py"):
        depth = len(path.relative_to(OURS).parts)  # 1 for a file at the top
        for node in ast.walk(ast.parse(path.read_text("utf-8"))):
            if isinstance(node, ast.Import):
                names = [a.name for a in node.names]
            elif isinstance(node, ast.ImportFrom):
                # More dots than folders below the component: out of it.
                if node.level > depth:
                    bad.append(f"{path.name}:{node.lineno} leaves the component")
                names = [node.module or ""]
            else:
                continue
            for name in names:
                parts = name.split(".")
                if "casa_mia" in parts:
                    bad.append(f"{path.name}:{node.lineno} imports {name}")
    assert not bad, bad
