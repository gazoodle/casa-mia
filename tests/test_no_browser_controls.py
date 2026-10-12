"""No browser dialogs or drop-downs in the admin UI or the cards: the owner loathes them
(their own white boxes, out of the house style). Ours instead: confirmBox() and askBox()
(app/web/src/confirm.tsx), Select (controls.tsx), a toast or a line for an alert.
Checkboxes, radios and sliders are fine: styles.css draws them as ours.
docs/design/chrome.html shows each."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    *(ROOT / "app/web/src").rglob("*.tsx"),
    *(ROOT / "app/web/src").rglob("*.ts"),
    *(ROOT / "integration/cards/src").rglob("*.ts"),
]
CALL = re.compile(r"(?<![\w.])(confirm|prompt|alert)\(")
SELECT = re.compile(r"<select\b")
COMMENT = re.compile(r"/\*.*?\*/|//[^\n]*", re.S)


def test_no_browser_dialogs_or_selects():
    found = []
    for path in SOURCES:
        text = COMMENT.sub("", path.read_text())
        for pattern in (CALL, SELECT):
            for m in pattern.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                found.append(f"{path.relative_to(ROOT)}:{line}: {m.group(0)}")
    assert not found, "Browser dialogs or drop-downs (use ours):\n" + "\n".join(found)
