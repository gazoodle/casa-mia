"""The Camera Commander's tap areas in a real Chromium. The controls bar
(integration/cards/src/commander/full.ts): every chip's whole face takes its own taps, on
each edge, with the PTZ presets or the zoom's stepper opened out beside the bar too. Each
chip's tap area reaches past it (across the bar to 44 px), and in 2026.11.14-b17 the
opened line's reached 6 px over the bar's chips, 5 px away: a tap on PTZ could send the
camera to a preset. The main camera's caption (live.ts): its name and detection chips
open the camera's recordings, and are never also the main picture's tap; for a camera
with none, the name lets the tap through and a chip passes it on. Vite builds the real
bar and caption with the card's own styles. Skipped without the cards' node_modules or
Playwright's Chromium."""

import shutil
import subprocess
from pathlib import Path

import pytest

CARDS = Path(__file__).resolve().parents[1] / "integration/cards"
VITE = CARDS / "node_modules/.bin/vite"

# The bar over a 640 x 360 main area: the card's two buttons, two controls, five presets
# (so they fold behind PTZ) and a zoom. `misses(edge, open)` draws it and names each chip
# whose face, sampled every 2 px, sends a tap anywhere but to itself.
PAGE = """
import { html, render } from "%(cards)s/node_modules/lit/index.js";
import { CommanderCard } from "%(cards)s/src/commander/card.ts";
import { controlsBar } from "%(cards)s/src/commander/full.ts";
import { FOLDERS } from "%(cards)s/src/commander/clips.ts";

const hass = { states: {
  "light.porch": { state: "on", attributes: { friendly_name: "Porch light" } },
  "switch.siren": { state: "off", attributes: { friendly_name: "Siren" } },
  "number.zoom": { state: "1", attributes: { min: 1, max: 10, step: 1 } },
} };
const own = ["Sound", "Full"].map((label) => ({ on: false, icon: "", label, title: label, toggle() {} }));
const host = document.body.appendChild(document.createElement("div"));
const root = host.attachShadow({ mode: "open" });
root.adoptedStyleSheets = CommanderCard.styles.flat(9).map((s) => s.styleSheet);

const name = (el) => (el ? el.textContent.trim().replace(/\\s+/g, " ") : "nothing");
const miss = (chip) => {
  const r = chip.getBoundingClientRect();
  for (let x = r.left + 0.5; x < r.right; x += 2)
    for (let y = r.top + 0.5; y < r.bottom; y += 2) {
      const hit = root.elementFromPoint(x, y)?.closest(".control");
      if (hit !== chip) return `${name(chip)} at ${x - r.left},${y - r.top} goes to ${name(hit)}`;
    }
  return null;
};

window.misses = (edge, open) => {
  const camera = {
    title: "Gate", live: "", zoom: "number.zoom",
    controls: [{ entity: "light.porch" }, { entity: "switch.siren" }],
    presets: [1, 2, 3, 4, 5].map((i) => ({ name: `Preset ${i}`, action: "camera.ptz", data: {} })),
    controls_at: { landscape: edge, portrait: edge },
  };
  const lines = { open, show() {}, go() {}, zoom() {}, zoomTo: null, failed: "", armed: "", arm() {} };
  const place = "left:0;top:0;width:640px;height:360px";
  render(html`<div class="box" style="position:relative;width:640px;height:360px">
    ${controlsBar(host, hass, camera, place, [640, 360], own, lines)}</div>`, root);
  return [...root.querySelectorAll(".control")].map(miss).filter(Boolean);
};

// The main camera's caption over its tap zone, with four detections (three chips and +1):
// the gate camera has recordings, the shed's has none. `captionMisses(style, camera)`
// presses each point of the name and the chips, every 2 px, and names the first in each
// that does anything but open the recordings (with none, the main picture's tap), once.
// Only their faces: a rounded corner's outside, 1 px short of the curve, is the picture's.
const onFace = (r, part, x, y) => {
  const round = Math.min(parseFloat(getComputedStyle(part).borderTopLeftRadius) || 0, r.width / 2, r.height / 2);
  const dx = Math.max(r.left + round - x, 0, x - (r.right - round));
  const dy = Math.max(r.top + round - y, 0, y - (r.bottom - round));
  return dx === 0 && dy === 0 ? true : Math.hypot(dx, dy) <= round - 1;
};
FOLDERS.known = new Map([["gate", "media-source://unifiprotect/nvr1:browse:cam1"]]);
const found = ["person", "vehicle", "ring", "bark"].map((kind, i) => ({ kind, text: kind, since: Date.now() - i * 1000 }));
window.captionMisses = (style, camera) => {
  const fired = [];
  const self = {
    hass: { config: {}, entities: { "camera.gate": { device_id: "gate", platform: "unifiprotect" }, "camera.shed": { device_id: "shed", platform: "unifiprotect" } } },
    now: () => ({ card: { layout: { labels: { main_style: style } } }, main: camera }),
    detections: () => found,
    requestUpdate() {},
    set _clips(open) { fired.push(`recordings of ${open.camera}`); },
  };
  const tap = () => fired.push("main tap");
  const caption = CommanderCard.prototype.caption.call(self, "Gate", "left:0;top:0;width:100%%;height:100%%", null, tap);
  render(html`<div class="box" style="position:relative;width:640px;height:360px;--cm-label-font:sans-serif;--cm-label-size:20px;--cm-label-colour:#fff;--cm-label-back:rgb(0 0 0 / 0.55)">
    <div class="zone" style="left:0;top:0;width:100%%;height:100%%" @click=${tap}></div>${caption}</div>`, root);

  const want = camera === "camera.gate" ? `recordings of ${camera}` : "main tap";
  const parts = [...root.querySelectorAll(".caption :is(.title, .detection)")].filter((el) => el.getClientRects().length);
  const misses = [];
  for (const part of parts) {
    const r = part.getBoundingClientRect();
    find: for (let x = r.left + 0.5; x < r.right; x += 2)
      for (let y = r.top + 0.5; y < r.bottom; y += 2) {
        if (!onFace(r, part, x, y)) continue;
        fired.length = 0;
        root.elementFromPoint(x, y)?.click();
        if (fired.join() !== want) {
          misses.push(`${name(part)} at ${x - r.left},${y - r.top}: ${fired.join(" and ") || "nothing"}`);
          break find;
        }
      }
  }
  return { parts: parts.length, misses };
};
"""


def chromium():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        return None
    return sync_playwright


NEEDS = pytest.mark.skipif(
    not shutil.which("node") or not VITE.exists() or not chromium(),
    reason="needs the cards' node_modules and Playwright",
)


@pytest.fixture(scope="module")
def bar(tmp_path_factory):
    """The page's script, built by Vite as the card is (pills.ts imports CSS)."""
    tmp = tmp_path_factory.mktemp("bar")
    (tmp / "page.ts").write_text(PAGE % {"cards": CARDS})
    (tmp / "vite.config.mjs").write_text(
        f'export default {{ root: "{tmp}", logLevel: "error", build: {{ outDir: "{tmp}/dist",'
        f' minify: false, lib: {{ entry: "{tmp}/page.ts", formats: ["es"],'
        ' fileName: () => "page.js" } } };'
    )
    subprocess.run(
        [VITE, "build", "-c", tmp / "vite.config.mjs"],
        cwd=CARDS,
        check=True,
        timeout=60,
    )
    return (tmp / "dist/page.js").read_text()


@pytest.fixture(scope="module")
def page(bar):
    """The page in Chromium, its script loaded."""
    sync_playwright = chromium()
    assert sync_playwright
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch()
        except Exception as exc:  # no browser downloaded here
            pytest.skip(f"no Chromium: {exc}")
        try:
            page = browser.new_page(viewport={"width": 800, "height": 500})
            page.route(
                "http://bar.test/page.js",
                lambda route: route.fulfill(body=bar, content_type="text/javascript"),
            )
            page.route(
                "http://bar.test/",
                lambda route: route.fulfill(
                    body='<body style="margin:0"><script type="module" src="page.js"></script>',
                    content_type="text/html",
                ),
            )
            page.goto("http://bar.test/")
            # A bare function here would be called: Playwright invokes one it is given.
            page.wait_for_function("!!(window.misses && window.captionMisses)")
            yield page
        finally:
            browser.close()


@NEEDS
def test_every_chip_takes_its_own_taps(page):
    misses = {
        f"{edge}, {open or 'nothing'} open": page.evaluate(
            f"misses('{edge}', '{open}')"
        )
        for edge in ("top", "bottom", "left", "right")
        for open in ("", "ptz", "zoom")
    }

    assert {k: v for k, v in misses.items() if v} == {}


@NEEDS
def test_the_main_name_and_chips_open_the_recordings_or_pass_the_tap_on(page):
    seen = {
        f"{style}, {camera}": page.evaluate(f"captionMisses('{style}', '{camera}')")
        for style in ("pill", "bar", "none")
        for camera in ("camera.gate", "camera.shed")
    }

    assert {k: v["misses"] for k, v in seen.items() if v["misses"]} == {}
    # The name and four chips each pressed (no name with main_style none).
    assert {k: v["parts"] for k, v in seen.items()} == {
        k: 4 if k.startswith("none") else 5 for k in seen
    }
