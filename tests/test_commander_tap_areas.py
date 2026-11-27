"""The Camera Commander's controls bar (integration/cards/src/commander/full.ts) in a real
Chromium: every chip's whole face takes its own taps, on each edge, with the PTZ presets
or the zoom's stepper opened out beside the bar too. Each chip's tap area reaches past it
(across the bar to 44 px), and in 2026.11.14-b17 the opened line's reached 6 px over the
bar's chips, 5 px away: a tap on PTZ could send the camera to a preset. Vite builds the
real bar with the card's own styles. Skipped without the cards' node_modules or
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


@NEEDS
def test_every_chip_takes_its_own_taps(bar):
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
            page.wait_for_function("window.misses")
            misses = {
                f"{edge}, {open or 'nothing'} open": page.evaluate(
                    f"misses('{edge}', '{open}')"
                )
                for edge in ("top", "bottom", "left", "right")
                for open in ("", "ptz", "zoom")
            }
        finally:
            browser.close()

    assert {k: v for k, v in misses.items() if v} == {}
