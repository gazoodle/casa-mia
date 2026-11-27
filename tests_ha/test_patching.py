"""The children's patches warn on a Home Assistant outside the releases they were checked
against (casa_mia/patching.py CHECKED), and only there."""

import logging

from custom_components.casa_mia import patching
from custom_components.casa_mia.patching import CHECKED, Patches, checked


def test_the_checked_range_includes_both_ends_and_nothing_outside():
    oldest, newest = CHECKED
    assert checked(oldest) and checked(newest)
    assert not checked("2026.10.4")
    assert not checked("2099.1.0")


def test_applying_warns_only_outside_the_range(monkeypatch, caplog):
    class Target:
        thing = 1

    for version, warned in ((CHECKED[1], False), ("2099.1.0", True)):
        monkeypatch.setattr(patching, "HA_VERSION", version)
        caplog.clear()
        patches = Patches("casa_mia_test")
        with caplog.at_level(logging.WARNING, logger=patching.__name__):
            patches.apply(((Target, "thing", 2),))
        assert Target.thing == 2
        assert ("check" in caplog.text) is warned, version
        patches.remove()
        assert Target.thing == 1
