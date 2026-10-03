from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def test_supervisor_manifests_parse():
    # An unquoted ": " in a value once made the Supervisor silently skip the app.
    app = yaml.safe_load((ROOT / "app" / "config.yaml").read_text())
    assert app["slug"] == "casa_mia"
    assert yaml.safe_load((ROOT / "repository.yaml").read_text())["name"]
