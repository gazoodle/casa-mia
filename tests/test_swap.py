import json
import os

from casa_mia import swap


def test_swap_both_ways(tmp_path, monkeypatch):
    path = tmp_path / "swap.json"
    monkeypatch.setattr(swap, "PATH", path)
    assert swap.out("07700 900123") == "07700 900123" and swap.stamp() == ""

    path.write_text(
        json.dumps(
            {"swap": True, "07700 900123": "07700 900456", "José": "Al", "Jo": "X"}
        )
    )
    # Longest first, one pass; JSON's escaped spelling too; binary left alone.
    assert swap.out("José on 07700 900123, Jo") == "Al on 07700 900456, X"
    assert (
        swap.out("Joe, +4407700 900123, cam_Jo_1, Jo2")
        == "Joe, +4407700 900456, cam_X_1, X2"
    )
    assert (
        swap.out_bytes(json.dumps({"n": "José"}).encode(), "application/json")
        == b'{"n": "Al"}'
    )
    assert swap.out_bytes("José".encode(), "image/png") == "José".encode()
    assert swap.back("ring 07700 900456") == "ring 07700 900123"
    assert swap.back_path("p/07700%20900456") == "p/07700%20900123"
    assert swap.back_path("a%2Fb") == "a%2Fb"
    assert swap.back_bytes(b"\xff\xd8") == b"\xff\xd8"
    on = swap.stamp()
    assert on

    assert not swap.original_photo()

    path.write_text(json.dumps({"swap": True, "original_photo": True}))
    os.utime(path, ns=(2, 2))
    assert swap.original_photo() and swap.stamp() and swap.out("Jo") == "Jo"

    path.write_text(json.dumps({"swap": False, "Jo": "X", "original_photo": True}))
    os.utime(path, ns=(1, 1))  # a new mtime even within the filesystem's resolution
    assert swap.out("Jo") == "Jo" and swap.stamp() == "" and not swap.original_photo()


def test_camera_images(tmp_path, monkeypatch):
    path = tmp_path / "swap.json"
    monkeypatch.setattr(swap, "PATH", path)
    (tmp_path / "swap").mkdir()
    (tmp_path / "swap" / "yard.jpg").write_bytes(b"jpeg")
    images = {
        "Oak Tree": "swap/yard.jpg",
        "Shed": "swap/none.jpg",
        "Barn": "../x.jpg",
    }
    path.write_text(json.dumps({"swap": True, "camera_images": images}))
    # Kept only when the picture is there and inside swap.json's folder; not a string.
    assert swap.camera_image("Oak Tree") == (tmp_path / "swap" / "yard.jpg").resolve()
    assert swap.camera_image("Shed") is None and swap.camera_image("Barn") is None
    assert swap.out("camera_images") == "camera_images" and swap.stamp()
