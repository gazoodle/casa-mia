"""Sensor Watch's alerts, kept for the pages. Sensor Watch fires a bus event each time a
watched sensor changes level. A page can't listen for it itself (Home Assistant lets
only an admin subscribe to an integration's events, and a wall tablet's login isn't
one), and an event is a moment: a page opened afterwards has missed it. So the latest
event for each sensor is kept here, and ALERTS feeds them to any signed-in page: all of
them when it subscribes, then each as it arrives.

Kept for this run of Home Assistant only. Sensor Watch says each sensor's level again at
every start, which fills this again. Without Sensor Watch nothing arrives, and the feed
is empty."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import Event, HomeAssistant, callback
from homeassistant.util import dt as dt_util

from .const import ALERTS, DOMAIN, NOMINAL, WATCH_EVENT

_LOGGER = logging.getLogger(__name__)
# What a page is told of an event: enough to write the story, and no more.
FIELDS = ("entity_id", "name", "level", "previous", "value", "unit", "message", "area")
# How long a sensor that is right again is still told, for the "back to normal" story.
RECOVERED = 600  # seconds


class Alerts:
    """The latest event for each sensor that has something wrong, or was put right in
    the last RECOVERED seconds."""

    def __init__(self) -> None:
        self.latest: dict[str, dict[str, Any]] = {}
        self.feeds: list[Callable[[dict[str, Any]], None]] = []

    @callback
    def take(self, event: Event) -> None:
        now = dt_util.utcnow().timestamp()
        eid = event.data.get("entity_id")
        if not isinstance(eid, str):
            _LOGGER.warning("A Sensor Watch event with no entity_id was ignored")
            return

        # When the trouble began outlives an escalation, and the recovery says it too.
        was = self.latest.get(eid)
        troubled = was is not None and was["level"] != NOMINAL
        # Sensor Watch says when this level began, which after a restart is long before
        # the event. Without it, the moment the event came.
        since = dt_util.parse_datetime(str(event.data.get("since") or ""))
        at = dt_util.as_utc(since).timestamp() if since else now
        alert = {field: event.data.get(field) for field in FIELDS} | {
            "escalated": bool(event.data.get("escalated")),
            "at": at,
            "began": was["began"] if was and troubled else at,
        }

        # A sensor found well at the start is no news, and neither is one long mended.
        self.latest = {
            key: old
            for key, old in self.latest.items()
            if old["level"] != NOMINAL or now - old["at"] < RECOVERED
        }
        if alert["level"] == NOMINAL and not troubled:
            return
        self.latest[eid] = alert
        _LOGGER.debug("Alert for %s: %s", eid, alert["level"])
        for feed in list(self.feeds):
            feed(alert)


def setup(hass: HomeAssistant) -> None:
    """Once per Home Assistant run."""
    alerts = hass.data[DOMAIN] = Alerts()
    hass.bus.async_listen(WATCH_EVENT, alerts.take)
    websocket_api.async_register_command(hass, _ws_alerts)


@websocket_api.websocket_command({vol.Required("type"): ALERTS})
@callback
def _ws_alerts(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict[str, Any]
) -> None:
    """Every alert held now, then each as it comes."""
    alerts: Alerts = hass.data[DOMAIN]

    @callback
    def send(alert: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], [alert]))

    alerts.feeds.append(send)
    connection.subscriptions[msg["id"]] = lambda: alerts.feeds.remove(send)
    connection.send_result(msg["id"])
    connection.send_message(
        websocket_api.event_message(msg["id"], list(alerts.latest.values()))
    )
