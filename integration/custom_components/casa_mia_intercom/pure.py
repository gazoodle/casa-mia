"""Parts of Casa Mia Intercom that don't need Home Assistant, so they can be tested alone."""

import re
from dataclasses import dataclass


def sends_audio(offer_sdp: str) -> bool:
    """Whether a WebRTC offer carries a microphone: an audio section that sends.

    HA's frontend offers `sendrecv` audio only while Talk is on, and `recvonly` to watch.
    An audio section without a direction attribute is `sendrecv` (RFC 8866).
    """
    for section in re.split(r"\r?\n(?=m=)", offer_sdp):
        if section.startswith("m=audio"):
            directions = set(
                re.findall(
                    r"^a=(sendrecv|sendonly|recvonly|inactive)\s*$", section, re.M
                )
            )
            if not directions or directions & {"sendrecv", "sendonly"}:
                return True
    return False


# One doorbell's call. Every UI shows it; only the device that answered may talk.
IDLE, RINGING, ANSWERED, COMPLETE = "idle", "ringing", "answered", "complete"
CALL_STATES = [IDLE, RINGING, ANSWERED, COMPLETE]
# Seconds ringing and complete last at most (Call.expire). Owner, 2026-11-05: a ring
# unanswered for a minute is missed; "complete" shows long enough to read.
TIMEOUTS = {RINGING: 60.0, COMPLETE: 10.0}
MISSED, ENDED = "missed", "ended"  # how a call completed

# An answered call ends after this long without the answering user (owner, 2026-11-06).
# Full duplex: ten minutes, restarted by a touch on the answering page, so a forgotten
# tablet doesn't stay live. Half duplex: two minutes after the last Hold to talk.
FULL, HALF = "full", "half"
ANSWERED_LIMITS = {FULL: 600.0, HALF: 120.0}
# One hold counts for at most this long, so a lost release or a resting finger can't keep
# a call open: at most HOLD_CAP + the half limit after the last real release.
HOLD_CAP = 120.0
NOT_ANSWERED_HERE, NOT_HALF, NOT_FULL = (
    "not_answered_here",
    "not_half_duplex",
    "not_full_duplex",
)


@dataclass
class Call:
    """The decisions only: call.py keeps the clock, the timers and the entities.

    Each method returns True when the call changed. Answering is claiming the
    microphone: the WebRTC session that sends one holds the call until it closes.
    """

    state: str = IDLE
    since: float = 0.0
    session: str | None = None  # the WebRTC session holding the microphone
    user_id: str | None = None
    answered_by: str | None = None  # the HA user's name; owner has one user per tablet
    outcome: str | None = None
    duplex: str | None = None  # while answered
    held: bool = False  # Hold to talk is held, under HOLD_CAP
    ends_at: float | None = None  # when an answered call ends; None while held
    hold_until: float | None = None  # when the current hold stops counting

    def due(self) -> float | None:
        """When expire() is next owed, or None: call.py keeps one timer for it."""
        if self.state == ANSWERED:
            return self.hold_until if self.held else self.ends_at
        timeout = TIMEOUTS.get(self.state)
        return self.since + timeout if timeout else None

    def ring(self, now: float) -> bool:
        # A ring while answered is the visitor pressing again: the call goes on.
        return self.state in (IDLE, COMPLETE) and self._enter(RINGING, now)

    def claim(self, session: str, user_id: str, name: str, now: float) -> bool:
        """Answer, or refuse because someone else has. True when this session may talk.

        The same user may take the call over from their own older session: HA's Talk
        button opens its new connection before the old one has closed.
        """
        if self.state == ANSWERED and user_id != self.user_id:
            return False
        # A take-over keeps the duplex and the deadline: a new session isn't the user.
        if self.state != ANSWERED:
            self._enter(ANSWERED, now)
            self.duplex, self.ends_at = FULL, now + ANSWERED_LIMITS[FULL]
        self.session, self.user_id, self.answered_by = session, user_id, name
        return True

    # The answering user's page keeps the call alive. Each returns why it refused, or
    # None when done; only the user who answered may, and only while answered.

    def set_duplex(self, user_id: str, duplex: str, now: float) -> str | None:
        """The page says how it answered. Claims start as full; this follows at once."""
        if refused := self._refuse(user_id):
            return refused
        self.duplex, self.held, self.ends_at = (
            duplex,
            False,
            now + ANSWERED_LIMITS[duplex],
        )
        return None

    def hold(self, user_id: str, held: bool, now: float) -> str | None:
        """Hold to talk pressed (the timer stops) or released (it starts again)."""
        if refused := self._refuse(user_id, HALF):
            return refused
        if not held:
            self.held, self.ends_at = False, now + ANSWERED_LIMITS[HALF]
        elif not self.held:  # a repeated press doesn't restart the cap
            self.held, self.hold_until, self.ends_at = True, now + HOLD_CAP, None
        return None

    def touch(self, user_id: str, _touched: bool, now: float) -> str | None:
        """A touch on the answering page, in full duplex: the ten minutes start again."""
        if refused := self._refuse(user_id, FULL):
            return refused
        self.ends_at = now + ANSWERED_LIMITS[FULL]
        return None

    def _refuse(self, user_id: str, duplex: str | None = None) -> str | None:
        if self.state != ANSWERED or user_id != self.user_id:
            return NOT_ANSWERED_HERE
        if duplex and self.duplex != duplex:
            return NOT_HALF if duplex == HALF else NOT_FULL
        return None

    def release(self, session: str, now: float) -> bool:
        """The session closed: if it held the call, the call is over."""
        return self.state == ANSWERED and session == self.session and self.end(now)

    def end(self, now: float) -> bool:
        """Hang up: from "End call", or the answered timeout."""
        return self.state == ANSWERED and self._complete(ENDED, now)

    def expire(self, now: float) -> bool:
        """What due() named has come: a state's timeout, or a hold's cap."""
        if self.state == RINGING:
            return self._complete(MISSED, now)
        if self.state == COMPLETE:
            return self._enter(IDLE, now)
        if self.held and self.hold_until is not None:
            # The hold stops counting; the call ends unless released and used again.
            self.held, self.ends_at = False, self.hold_until + ANSWERED_LIMITS[HALF]
            return True
        return self.end(now)

    def _complete(self, outcome: str, now: float) -> bool:
        # answered_by stays, so "Answered by …" can be shown until idle.
        self._enter(COMPLETE, now)
        self.outcome, self.session = outcome, None
        return True

    def _enter(self, state: str, now: float) -> bool:
        if state in (IDLE, RINGING, ANSWERED):
            self.session = self.user_id = self.answered_by = self.outcome = None
        self.duplex = self.ends_at = self.hold_until = None
        self.held = False
        self.state, self.since = state, now
        return True


# The casa_mia_intercom/call websocket command's fields, each to its Call method.
ORDERS = {"duplex": Call.set_duplex, "held": Call.hold, "touched": Call.touch}
