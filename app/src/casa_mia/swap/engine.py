"""The swap's rules, one engine: every rule's matches found in one pass over the text and
replaced, so a replacement is never replaced again. Its twin in the browser is
integration/cards/src/swap/engine.ts; both must pass tests/swap_cases.json.

A rule is {"match", "replace", "mode", "enabled"}, and its mode is one of:
- exact: the string as written, not inside a longer word ("Ann" leaves "Annex"). Digits
  and _ are no word, so a number still matches inside "+44...", a name inside
  "camera.oak_tree".
- case: the same in any case. The replacement takes the case of what it replaces (lower,
  UPPER or Title Case), else it is used as written.
- regex: a JavaScript pattern, as the browser runs it, with $1, $<name>, $& and $$ in the
  replacement. Compiled with re.ASCII, because JS's \\w, \\d and \\b are ASCII.

Where matches overlap, the earliest wins, then the longest, then the rule higher in the
list."""

from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any

MODES = ("exact", "case", "regex")

# Not inside a longer word: no letter either side ([^\W\d_] is a letter; JS: \p{L}).
_BEFORE = r"(?<![^\W\d_])"
_AFTER = r"(?![^\W\d_])"

# JS writes a named group (?<name>...), Python (?P<name>...). Not a lookbehind (?<= or
# (?<!, and not after an escaping backslash.
_NAMED = re.compile(r"(?<!\\)((?:\\\\)*)\(\?<(?![=!])")

# In a regex rule's replacement: $$, $&, $1 to $99 and $<name>, as JS reads them.
_TOKEN = re.compile(r"\$(?:(\$)|(&)|(\d\d?)|<([^>]*)>)")

_LETTERS = re.compile(r"[^\W\d_]+")


def _title(text: str) -> str:
    """Each run of letters capitalised, the rest of it lower case."""
    return _LETTERS.sub(lambda m: m.group(0)[0].upper() + m.group(0)[1:].lower(), text)


def _cased(found: str, text: str) -> str:
    """`text` in the case of `found`: lower, Title, UPPER, or as written."""
    if found == found.upper() == found.lower():  # no letters to go by
        return text
    if found == found.lower():
        return text.lower()
    if found == _title(found):  # before UPPER, so a lone "A" counts as Title
        return _title(text)
    if found == found.upper():
        return text.upper()
    return text


def _expand(template: str, m: re.Match[str]) -> str:
    """A regex rule's replacement for match `m`; a token naming no group stays as it is."""
    groups = m.re.groups

    def one(t: re.Match[str]) -> str:
        dollar, whole, num, name = t.groups()
        if dollar:
            return "$"
        if whole:
            return m.group(0)
        if num:
            # $12 is group 12 when there is one, else group 1 and a "2"
            n, rest = (int(num), "") if int(num) <= groups else (int(num[0]), num[1:])
            return (m.group(n) or "") + rest if 0 < n <= groups else t.group(0)
        if name in m.re.groupindex:
            return m.group(name) or ""
        return t.group(0)

    return _TOKEN.sub(one, template)


def pattern(rule: dict[str, Any]) -> re.Pattern[str]:
    """A rule's compiled pattern; re.error (a ValueError) when it can't be."""
    match, mode = rule.get("match"), rule.get("mode", "exact")
    if not isinstance(match, str) or not match:
        raise re.error("nothing to match")
    if mode == "regex":
        return re.compile(_NAMED.sub(r"\1(?P<", match), re.ASCII)
    if mode not in MODES:
        raise re.error(f"unknown mode {mode!r}")
    flags = re.IGNORECASE if mode == "case" else 0
    return re.compile(_BEFORE + re.escape(match) + _AFTER, flags)


def _next(p: re.Pattern[str], text: str, pos: int) -> re.Match[str] | None:
    """The rule's first match at or after `pos` that matches something (never empty)."""
    while pos <= len(text):
        m = p.search(text, pos)
        if m is None or m.end() > m.start():
            return m
        pos = m.start() + 1
    return None


class Rules:
    """The enabled rules, compiled. A rule that won't compile is left out and listed in
    `errors` (its index, why), for the caller to report."""

    def __init__(self, rules: list[dict[str, Any]]) -> None:
        self.errors: list[tuple[int, str]] = []
        self._rules: list[tuple[re.Pattern[str], dict[str, Any]]] = []
        for i, rule in enumerate(rules):
            if rule.get("enabled", True) is False:
                continue
            try:
                self._rules.append((pattern(rule), rule))
            except re.error as exc:
                self.errors.append((i, str(exc)))

    def _replacement(self, rule: dict[str, Any], m: re.Match[str]) -> str:
        text = str(rule.get("replace", ""))
        mode = rule.get("mode", "exact")
        if mode == "case":
            return _cased(m.group(0), text)
        if mode == "regex":
            return _expand(text, m)
        return text

    def spans(self, text: str) -> Iterator[tuple[int, int, str]]:
        """Each match to replace, in order: (start, end, replacement)."""
        found = [_next(p, text, 0) for p, _ in self._rules]
        pos = 0
        while True:
            # Each rule's next match from pos; the earliest, then longest, then first rule.
            best: tuple[int, int, int] | None = None
            for i, (p, _) in enumerate(self._rules):
                m = found[i]
                if m is not None and m.start() < pos:
                    m = found[i] = _next(p, text, pos)
                if m is not None:
                    key = (m.start(), m.start() - m.end(), i)
                    best = key if best is None or key < best else best
            if best is None:
                return
            m = found[best[2]]
            assert m is not None
            yield m.start(), m.end(), self._replacement(self._rules[best[2]][1], m)
            pos = m.end()

    def out(self, text: str) -> str:
        """The text with every match replaced."""
        parts, pos = [], 0
        for start, end, replacement in self.spans(text):
            parts += [text[pos:start], replacement]
            pos = end
        return "".join(parts) + text[pos:] if parts else text
