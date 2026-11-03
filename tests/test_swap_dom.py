"""The browser's swap (integration/cards/src/swap/dom.ts) in a real Chromium: text through
shadow roots and a same-origin iframe, the attributes, what it must never touch (form
fields, editable text, style), a page's own change, the real text back when the rules go,
and a document marked data-swap="off". Then the overlay (overlay.ts): the draft outlined,
form fields covered while not focused. Node strips the types; the page loads the modules
as they are. Skipped without node or Playwright's Chromium."""

import json
import shutil
import subprocess
from pathlib import Path

import pytest

SRC = Path(__file__).resolve().parents[1] / "integration/cards/src/swap"

STRIP = (
    "const {stripTypeScriptTypes} = require('node:module');"
    "process.stdout.write(stripTypeScriptTypes(require('fs').readFileSync(process.argv[1], 'utf8')))"
)

PAGE = """<!doctype html><html><head><title>t</title></head><body>
<p id="plain">Ann lives at Oak Tree</p>
<p id="attr" title="Ann's room" aria-label="Oak Tree">x</p>
<input id="field" value="Ann" placeholder="Ann">
<div id="edit" contenteditable="true">Ann</div>
<style id="style">.Ann { color: red }</style>
<div id="host"></div>
<iframe id="frame" srcdoc="<p id=inner>Ann</p>"></iframe>
</body></html>"""

CHECK = """async () => {
  const { swap } = await import("/swap/dom.ts");
  const host = document.getElementById("host");
  host.attachShadow({ mode: "open" }).innerHTML = "<span>Ann early</span>";
  await new Promise((r) => document.getElementById("frame").contentDocument.readyState === "complete" ? r() : addEventListener("load", r));
  const tick = () => new Promise((r) => setTimeout(r, 20));
  const frame = () => document.getElementById("frame").contentDocument;
  const read = () => ({
    plain: document.getElementById("plain").textContent,
    title: document.getElementById("attr").title,
    aria: document.getElementById("attr").getAttribute("aria-label"),
    field: document.getElementById("field").value,
    placeholder: document.getElementById("field").placeholder,
    edit: document.getElementById("edit").textContent,
    style: document.getElementById("style").textContent,
    shadow: host.shadowRoot.textContent,
    inner: frame().getElementById("inner").textContent,
  });
  const out = {};
  swap([{ match: "Ann", replace: "Bea" }, { match: "oak tree", replace: "barn", mode: "case" }], null);
  await tick();
  out.on = read();

  // Drawn later: a new shadow root, new text, the page's own change to swapped text.
  const late = document.createElement("div");
  document.body.append(late);
  late.attachShadow({ mode: "open" }).innerHTML = "<b>Ann later</b>";
  document.getElementById("plain").firstChild.data = "Ann moved";
  frame().getElementById("inner").append(" and Ann");
  await tick();
  out.later = { late: late.shadowRoot.textContent, plain: document.getElementById("plain").textContent, inner: frame().getElementById("inner").textContent };

  // A draft first: it wins where it matches.
  swap([{ match: "Ann", replace: "Bea" }], { match: "Ann moved", replace: "Cy left" });
  await tick();
  out.draft = document.getElementById("plain").textContent;

  // A document marked off shows the real text, and again when unmarked.
  document.documentElement.setAttribute("data-swap", "off");
  await tick();
  out.marked = document.getElementById("plain").textContent;
  document.documentElement.removeAttribute("data-swap");
  await tick();
  out.unmarked = document.getElementById("plain").textContent;

  // No rules: everything as it really is.
  swap([], null);
  await tick();
  out.off = read();
  out.offLate = late.shadowRoot.textContent;
  return out;
}"""


OVERLAY_PAGE = """<!doctype html><html><head><title>t</title></head><body>
<p id="text">Ann and Oak Tree</p>
<input id="field" value="Ann Smith">
<div style="height:40px;overflow:auto"><div style="height:200px"></div><input value="Ann"></div>
</body></html>"""

OVERLAY_CHECK = """async () => {
  const { swap } = await import("/swap/dom.ts");
  const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 10)));
  const layer = () => document.querySelector("[data-swap-layer]");
  const boxes = () => [...(layer()?.children ?? [])].map((d) => [d.textContent, d.style.outline.includes("red")]);
  const field = document.getElementById("field");
  const text = () => document.getElementById("text").textContent;
  const saved = [{ match: "Ann", replace: "Bea" }];
  const out = {};
  swap(saved, null);
  await frame();
  out.saved = boxes();
  out.value = field.value;
  field.focus();
  await frame();
  out.focused = boxes();
  field.blur();
  swap(saved, { match: "oak tree", replace: "", mode: "case" });
  await frame();
  out.empty = [text(), boxes()];
  swap(saved, { match: "Ann", replace: "Cy" });
  await frame();
  out.draft = [text(), boxes(), layer().matches(":popover-open")];
  swap([], null);
  await frame();
  out.off = [text(), boxes()];
  return out;
}"""


def chromium():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    return sync_playwright


def run(page_html: str, check: str):
    """The check's answer, run in Chromium on the page, with the swap's modules served."""
    files = {
        name: subprocess.run(
            ["node", "-e", STRIP, str(SRC / name)],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        for name in ("dom.ts", "engine.ts", "overlay.ts")
    }
    sync_playwright = chromium()
    assert sync_playwright
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception as exc:  # no browser downloaded here
            pytest.skip(f"no Chromium: {exc}")
        try:
            page = browser.new_page()
            page.route(
                "http://swap.test/swap/*",
                lambda route: route.fulfill(
                    body=files[route.request.url.rsplit("/", 1)[1]],
                    content_type="text/javascript",
                ),
            )
            page.route(
                "http://swap.test/",
                lambda route: route.fulfill(body=page_html, content_type="text/html"),
            )
            page.goto("http://swap.test/")
            return page.evaluate(check)
        finally:
            browser.close()


NEEDS = pytest.mark.skipif(
    not shutil.which("node") or not chromium(), reason="needs node and Playwright"
)


@NEEDS
def test_the_browser_swap_in_a_real_page():
    out = run(PAGE, CHECK)

    real = {
        "plain": "Ann lives at Oak Tree",
        "title": "Ann's room",
        "aria": "Oak Tree",
        "field": "Ann",
        "placeholder": "Ann",
        "edit": "Ann",
        "style": ".Ann { color: red }",
        "shadow": "Ann early",
        "inner": "Ann",
    }
    assert out["on"] == real | {
        "plain": "Bea lives at Barn",
        "title": "Bea's room",
        "aria": "Barn",
        "placeholder": "Bea",
        "shadow": "Bea early",
        "inner": "Bea",
    }, json.dumps(out["on"])
    assert out["later"] == {
        "late": "Bea later",
        "plain": "Bea moved",
        "inner": "Bea and Bea",
    }
    assert out["draft"] == "Cy left"
    assert (out["marked"], out["unmarked"]) == ("Ann moved", "Cy left")
    assert out["off"] == real | {"plain": "Ann moved", "inner": "Ann and Ann"}
    assert out["offLate"] == "Ann later"


@NEEDS
def test_the_overlay_outlines_the_draft_and_covers_fields():
    out = run(OVERLAY_PAGE, OVERLAY_CHECK)
    # A field showing a stand-in is covered, its value kept; the one scrolled out of
    # sight isn't covered; a focused field shows its real value to edit.
    assert out["saved"] == [["Bea Smith", False]]
    assert out["value"] == "Ann Smith"
    assert out["focused"] == []
    # A draft with no replacement yet: its match outlined as it is.
    assert out["empty"] == ["Bea and Oak Tree", [["", True], ["Bea Smith", False]]]
    # As the replacement is typed: shown, outlined, in the field's cover too; above all.
    assert out["draft"] == [
        "Cy and Oak Tree",
        [["", True], ["Cy Smith", True]],
        True,
    ]
    assert out["off"] == ["Ann and Oak Tree", []]
