"""Config flow: no fields, one entry, beside Casa Mia."""

from __future__ import annotations

from ..casa_mia.children import ChildConfigFlow
from .const import DOMAIN


class CommanderConfigFlow(ChildConfigFlow, domain=DOMAIN):
    TITLE = "Casa Mia Camera Commander"
