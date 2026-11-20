"""What a ZenOS-AI house's agent has written about it (github.com/nathan-curtis/zenos-ai),
and the brief from which a model writes the Gazette's column (column.py).

ZenOS's summarisers reduce each part of the house to a "Kata", a summary in a fixed shape,
and the whole house to one "zen_summary". Both are drawers in the `variables` attribute of
one sensor, the Kata cabinet. They are read from its state here, and nothing is ever
written to ZenOS (owner, 2026-11-15). Kata text reads as a machine's log, hence the model.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from homeassistant.util import dt as dt_util

KATAS = "zen_kata_cabinet"  # the label of the sensor that holds the Katas
DOJO = "zen_dojo_cabinet"  # and of the one that says what each part of the house is
PERSONA = "input_text.zenos_persona_name"  # the agent's name: the column's by-line
MODEL = "input_text.zenos_ai_task_entity"  # the AI task entity ZenOS's summarisers use
WHOLE = "zen_summary"
UNSURE = 0.5  # a model's own confidence below this is said beside what it wrote
MOST = 8  # Katas in the brief, the most urgent: it stays a bounded size
ITEMS = 3  # one-line items in a column, at most
NOTHING = {"unknown", "unavailable"}  # what Home Assistant says for a value it has not

# The three papers, each with the voice its column is written in. The headline templates
# in voices.ts are no style for prose, so the voices are described here.
PAPERS = {
    "broadsheet": "The Broadsheet, a serious national paper: measured, complete "
    "sentences, understated and a little dry, the most important matter first.",
    "tabloid": "The Red-top, a popular tabloid: short punchy sentences, puns and mock "
    "outrage, with every fact still true.",
    "rolling": "Rolling news, a 24-hour news channel's website: terse, present tense, "
    "plain words, the latest first.",
}


def said(value: Any) -> str | None:
    """A value as text worth printing, else None."""
    if not isinstance(value, str) or not value.strip() or value.strip() in NOTHING:
        return None
    return value.strip()


def _stamp(value: Any) -> float:
    """An ISO time as seconds, or 0 where there is none."""
    when = dt_util.parse_datetime(value) if isinstance(value, str) else None
    return when.timestamp() if when else 0.0


def _value(drawer: Any) -> Any:
    return drawer.get("value") if isinstance(drawer, dict) else None


def summary(drawers: dict[str, Any]) -> dict[str, Any] | None:
    """The whole-house summary, with `at` the time it was written, or None if it says
    nothing."""
    whole = _value(drawers.get(WHOLE))
    whole = whole.get(WHOLE) if isinstance(whole, dict) else None
    if not isinstance(whole, dict) or not (text := said(whole.get("summary"))):
        return None
    errors = whole.get("errors")
    return {
        "summary": text,
        "attention": said(whole.get("attention")),
        "objective": said(whole.get("objective")),
        "urgency": _number(whole.get("urgency")),
        "unsure": _number(whole.get("confidence")) < UNSURE,
        "errors": [
            e for e in map(said, errors if isinstance(errors, list) else []) if e
        ],
        "at": _stamp(whole.get("timestamp")) or _stamp(drawers[WHOLE].get("timestamp")),
    }


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def pieces(drawers: dict[str, Any], parts: dict[str, Any]) -> list[dict[str, Any]]:
    """Each part of the house that the agent has an account of, the most urgent first.
    `parts` is the Dojo cabinet's drawers, which name each part and say what tier it is."""
    found = []
    for key, drawer in drawers.items():
        # A component's Kata is known by its shape. ZenOS's own bookkeeping and its
        # templates are drawers in the same cabinet, and have none of it at the top.
        kata = _value(drawer)
        if key.startswith("_") or not isinstance(kata, dict) or "watchlist" not in kata:
            continue
        # ZenOS's account of itself (its pipeline, its index of the others) is no news
        # of the house.
        part = _value(parts.get(key))
        part = part if isinstance(part, dict) else {}
        if key.startswith("zen_") or part.get("pipeline_tier") == "system":
            continue
        # A run that found nothing to read writes a Kata of nulls: nothing to tell. One
        # that says why it has nothing is told as that, not passed over.
        text = (
            said(kata.get("subjective"))
            or said(kata.get("general_inference"))
            or said(kata.get("attention"))
        )
        error = said(kata.get("error"))
        if not text and not error:
            continue
        attention = said(kata.get("attention"))
        found.append(
            {
                "part": said(part.get("friendly_name"))
                or key[0].upper() + key[1:].replace("_", " "),
                "account": text or error,
                "attention": attention if text and attention != text else None,
                "urgency": _number(kata.get("urgency")),
                "unsure": _number(kata.get("confidence")) < UNSURE,
                "failed": not text,
                "at": _stamp(drawer.get("timestamp")),
            }
        )
    found.sort(key=lambda p: (-p["urgency"], -p["at"]))
    return found


def _local(at: float) -> str:
    return f"{dt_util.as_local(datetime.fromtimestamp(at, dt_util.UTC)):%H:%M on %d %B}"


def brief(house: str, by: str | None, lead: dict[str, Any], parts: list) -> str:
    """The model's instructions: who it writes as, how, and from what."""
    papers = "\n".join(f"- {paper}: {voice}" for paper, voice in PAPERS.items())
    notes = [{k: v for k, v in p.items() if v not in (None, False)} for p in parts]
    for note in notes:
        note["at"] = _local(note["at"]) if note.get("at") else None
    told = {k: v for k, v in lead.items() if k != "at" and v not in (None, [], False)}
    return f"""You are {by or "the house's own correspondent"}, writing the column for {house}'s own newspaper, about the house. The paper is printed in three styles, and you write the column once in each:
{papers}

For each style write:
- head: a headline of at most ten words.
- body: about 120 words, in one to three short paragraphs separated by a blank line.
- items: up to {ITEMS} one-line items, each about one part of the house that needs attention, the most urgent first. None when nothing does.

Rules:
- Write only from the notes below. Never invent a fact, a person, a room or a time.
- Say which part of the house each fact is about.
- Never tell anyone to unlock, open, disarm or switch off a lock or an alarm.
- Where the house's summary lists errors, say plainly that the house's own system reported them.
- Report a note marked unsure as unconfirmed, and one marked failed as having no report.

The house's summary, written at {_local(lead["at"])}:
{json.dumps(told, indent=1)}

The parts of the house, the most urgent first:
{json.dumps(notes, indent=1)}
"""


_TEXT: dict[str, Any] = {"text": {}}
STRUCTURE = {
    paper: {
        "description": f"The column in the style of {voice.split(',')[0]}",
        "required": True,
        "selector": {
            "object": {
                "fields": {
                    "head": {"required": True, "selector": _TEXT},
                    "body": {
                        "required": True,
                        "selector": {"text": {"multiline": True}},
                    },
                    "items": {"selector": {"text": {"multiple": True}}},
                }
            }
        },
    }
    for paper, voice in PAPERS.items()
}


def shaped(data: Any) -> dict[str, Any]:
    """The model's reply as the pages print it: for each paper a headline, the body's
    paragraphs and the items. A reply with a paper missing or empty is no column, and is
    never printed in part: ValueError says what was wrong."""
    if not isinstance(data, dict):
        raise ValueError("the model's reply was not in the shape asked for")
    papers = {}
    for paper in PAPERS:
        got = data.get(paper)
        got = got if isinstance(got, dict) else {}
        head, body = said(got.get("head")), said(got.get("body"))
        if not head or not body:
            raise ValueError(f"the model's reply had no {paper} column")
        items = got.get("items")
        items = [items] if isinstance(items, str) else items or []
        papers[paper] = {
            "head": head,
            "body": [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()],
            "items": [i for i in map(said, items) if i][:ITEMS],
        }
    return papers
