"""Casa Mia Intercom's call state machine and its offer microphone check (pure.py)."""

from conftest import load_component_file

pure = load_component_file("casa_mia_intercom", "pure")

WATCH = "v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=recvonly\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=recvonly\r\n"
TALK = WATCH.replace("a=recvonly\r\nm=video", "a=sendrecv\r\nm=video")


def test_only_an_offer_with_a_sending_audio_section_carries_a_microphone():
    assert not pure.sends_audio(WATCH)
    assert pure.sends_audio(TALK)
    # Video sending doesn't count; audio without a direction is sendrecv.
    assert not pure.sends_audio(
        "v=0\nm=video 9 X 96\na=sendrecv\nm=audio 9 X 0\na=recvonly\n"
    )
    assert pure.sends_audio("v=0\nm=audio 9 X 0\na=mid:0\n")


def test_ring_answer_hang_up():
    call = pure.Call()
    assert call.ring(1)
    assert call.claim("s1", "u1", "Kitchen", 2)
    assert (call.state, call.answered_by, call.since) == (pure.ANSWERED, "Kitchen", 2)

    assert not call.ring(3)  # pressing again doesn't interrupt the call
    assert call.release("s1", 4)
    assert (call.state, call.outcome, call.answered_by) == (
        pure.COMPLETE,
        pure.ENDED,
        "Kitchen",
    )
    assert call.expire(14) and call.state == pure.IDLE and call.answered_by is None


def test_a_second_device_cannot_take_the_call():
    call = pure.Call()
    call.ring(1)
    call.claim("s1", "u1", "Kitchen", 2)

    assert not call.claim("s2", "u2", "Hall", 3)
    assert not call.release("s2", 4)  # the refused session closing changes nothing
    assert (call.state, call.session) == (pure.ANSWERED, "s1")


def test_the_same_user_moves_the_call_to_a_new_session():
    # HA's Talk button opens the microphone connection before closing the old one.
    call = pure.Call()
    call.claim("s1", "u1", "Kitchen", 2)
    assert call.claim("s2", "u1", "Kitchen", 3)
    assert not call.release("s1", 4)
    assert call.session == "s2" and call.since == 2


def test_timeouts():
    call = pure.Call()
    call.ring(1)
    assert call.expire(61) and (call.state, call.outcome) == (
        pure.COMPLETE,
        pure.MISSED,
    )

    call = pure.Call()
    call.claim(
        "s1", "u1", "Kitchen", 1
    )  # answering with no ring is talking to the door
    assert call.expire(601) and (call.state, call.outcome) == (
        pure.COMPLETE,
        pure.ENDED,
    )
    assert not pure.Call().expire(1)  # idle has no timeout


def test_end_call_only_ends_an_answered_call():
    call = pure.Call()
    assert not call.end(1)
    call.ring(1)
    assert not call.end(2) and call.state == pure.RINGING


def answered(duplex=pure.FULL):
    call = pure.Call()
    call.ring(0)
    call.claim("s1", "u1", "Kitchen", 10)
    if duplex == pure.HALF:
        assert call.set_duplex("u1", pure.HALF, 11) is None
    return call


def test_half_duplex_timer_follows_hold_to_talk():
    call = answered(pure.HALF)
    assert (call.duplex, call.ends_at, call.due()) == (pure.HALF, 131, 131)

    assert call.hold("u1", True, 50) is None
    assert (call.held, call.ends_at, call.due()) == (True, None, 170)  # the hold cap
    assert (
        call.hold("u1", True, 60) is None and call.due() == 170
    )  # a repeat doesn't restart it
    assert call.hold("u1", False, 100) is None
    assert (call.held, call.ends_at) == (False, 220)

    # A hold past its cap: the timer runs again from the cap, finger still down.
    call.hold("u1", True, 200)
    assert call.expire(320) and (call.state, call.held, call.ends_at) == (
        pure.ANSWERED,
        False,
        440,
    )
    assert call.expire(440) and (call.state, call.outcome) == (
        pure.COMPLETE,
        pure.ENDED,
    )


def test_full_duplex_ten_minutes_restarted_by_a_touch():
    call = answered()
    assert (call.duplex, call.ends_at) == (pure.FULL, 610)
    assert call.touch("u1", True, 300) is None and call.ends_at == 900
    assert call.hold("u1", True, 301) == pure.NOT_HALF and not call.held
    assert answered(pure.HALF).touch("u1", True, 20) == pure.NOT_FULL


def test_only_the_answering_user_keeps_the_call_alive():
    call = answered(pure.HALF)
    before = (call.duplex, call.held, call.ends_at)
    assert call.set_duplex("u2", pure.FULL, 20) == pure.NOT_ANSWERED_HERE
    assert call.hold("u2", True, 20) == pure.NOT_ANSWERED_HERE
    assert call.touch("u2", True, 20) == pure.NOT_ANSWERED_HERE
    assert (call.duplex, call.held, call.ends_at) == before

    ringing = pure.Call()
    ringing.ring(0)
    assert ringing.set_duplex("u1", pure.HALF, 1) == pure.NOT_ANSWERED_HERE
    assert ringing.duplex is None


def test_a_ring_or_a_take_over_leaves_the_deadline_alone():
    call = answered(pure.HALF)
    assert not call.ring(20) and call.ends_at == 131
    assert call.claim("s2", "u1", "Kitchen", 30) and (call.duplex, call.ends_at) == (
        pure.HALF,
        131,
    )


def test_ending_clears_the_timer_state():
    call = answered(pure.HALF)
    call.hold("u1", True, 20)
    call.end(30)
    assert (call.duplex, call.held, call.ends_at, call.due()) == (None, False, None, 40)
