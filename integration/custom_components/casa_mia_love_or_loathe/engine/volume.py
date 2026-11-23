"""Volume and mute: the change at a track, and its undoing at the next."""

from __future__ import annotations

import logging

from homeassistant.core import (
    State,
)
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

from .. import trail
from ..pure import Group, scaled
from .base import Base
from .common import (
    REPORT_LAG,
    SAME_VOLUME,
    Player,
    _on,
    _speakers,
)

_LOGGER = logging.getLogger(__name__)


class Volumes(Base):
    async def _volume(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        """Each speaker of the group by the same share, from its own volume."""
        if state.attributes.get("volume_level") is None:
            raise HomeAssistantError("the player reports no volume")
        undo: dict[str, list[float]] = {}
        for speaker in _speakers(state):
            was = self._level(speaker)
            if was is None:
                continue  # a member that says nothing of its volume is left alone
            to = scaled(was, group.act.amount)
            await self._give(speaker, was, to)
            undo[speaker] = [was, to]
        player.undo = ["volume", undo]
        was, to = undo[entity]
        return f"volume {was:.0%} to {to:.0%}{_on(undo)} until the next track"

    async def _mute(
        self, entity: str, player: Player, group: Group, state: State
    ) -> str:
        speakers = _speakers(state)
        await self._call("volume_mute", speakers, is_volume_muted=True)
        player.undo = ["mute", speakers]
        return f"muted{_on(speakers)} until the next track"

    async def _undo(self, entity: str, player: Player) -> None:
        """Each speaker the action changed, put back unless someone has since."""
        undo, player.undo = player.undo, None
        if undo is None or self.hass.states.get(entity) is None:
            return

        # As 2026.11.8 and before kept it: the one player, ["mute"] or ["volume", was, to].
        if undo == ["mute"]:
            undo = ["mute", [entity]]
        elif undo[0] == "volume" and len(undo) == 3:
            undo = ["volume", {entity: undo[1:]}]

        try:
            if undo[0] == "mute":
                muted = [s for s in undo[1] if self._attr(s, "is_volume_muted")]
                if muted:
                    await self._call("volume_mute", muted, is_volume_muted=False)
                    self._note(trail.BACK, f"Unmuted{_on(muted)}", entity)
                else:
                    self._note(trail.BACK, "Already unmuted by someone", entity)
                return

            back, moved = {}, []
            for speaker, (was, to) in undo[1].items():
                now = self._level(speaker)
                if now is not None and abs(now - to) < SAME_VOLUME:
                    await self._give(speaker, to, was)
                    back[speaker] = was
                else:
                    moved.append(speaker)
            if back:
                was = back.get(entity, next(iter(back.values())))
                self._note(
                    trail.BACK, f"Volume put back to {was:.0%}{_on(back)}", entity
                )
            if moved:
                self._note(
                    trail.BACK,
                    f"Volume moved by someone since: left alone{_on(moved)}",
                    entity,
                )
        except HomeAssistantError as exc:
            self._problem(entity, f"could not put back {undo[0]}: {exc}")

    async def _give(self, speaker: str, was: float, to: float) -> None:
        await self._call("volume_set", speaker, volume_level=to)
        self.given[speaker] = [was, to, dt_util.utcnow().timestamp()]

    def _level(self, speaker: str) -> float | None:
        """A speaker's volume: what it reports, unless that is still the volume from
        before a change made here moments ago, when it is what it was given.

        Taking the report as it stood made one loathed song straight after another
        halve the volume each time (2026.11.12): the last one's volume was put back,
        the speaker had not yet said so, and the next change started from the lowered
        volume it still reported. Only the last of those changes was ever undone."""
        level = self._attr(speaker, "volume_level")
        was, to, at = self.given.get(speaker, (0.0, 0.0, 0.0))
        late = dt_util.utcnow().timestamp() - at < REPORT_LAG
        if level is not None and late and abs(level - was) < SAME_VOLUME:
            return to
        return level
