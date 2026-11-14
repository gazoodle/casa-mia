"""A feed to the pages: everything held when a page subscribes, then each item as it
comes. A page can't listen to an integration's bus events itself (Home Assistant lets
only an admin, and a wall tablet's login isn't one), and an event is a moment that a
page opened afterwards has missed."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any

from homeassistant.components import websocket_api
from homeassistant.core import callback

Send = Callable[[dict[str, Any]], None]


@callback
def follow(
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
    feeds: list[Send],
    held: Iterable[dict[str, Any]],
) -> None:
    """Subscribe the connection: `held` now, then whatever is given to each of `feeds`."""

    @callback
    def send(item: dict[str, Any]) -> None:
        connection.send_message(websocket_api.event_message(msg["id"], [item]))

    feeds.append(send)
    connection.subscriptions[msg["id"]] = lambda: feeds.remove(send)
    connection.send_result(msg["id"])
    connection.send_message(websocket_api.event_message(msg["id"], list(held)))
