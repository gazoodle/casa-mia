// Casa Mia: keep camera pictures live. The camera dashboards show the compositor's
// pictures as endless streams (/g/<name>.mjpg). HA keeps the pages you have left alive,
// pictures and streams too, while a browser allows only 6 connections to one address and
// the compositor ends a device's oldest streams past 3; so a page you come Back to could
// show a stopped picture, and a new one might not load at all. This stops the streams of
// pictures not on screen and gives those on screen a fresh one (not a Camera Commander
// card's, marked data-cm-own: the card does that itself, and tells the compositor). It also
// makes the highlight (the outline on the main camera's tile) pulse on the generated camera
// dashboard (a Camera Commander card pulses its own). Loaded by the Casa Mia integration (switched on on the Casa Mia panel's Settings page); it
// touches nothing but those pictures and that outline.

const STREAM = /\/g\/[^/?#]+\.mjpg/;
// A 1x1 transparent image: a stopped picture's source (dropping a stream's connection).
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const known = new Set(); // every stream picture seen; pages left alive keep theirs

/** Every <img> in the page, inside HA's components (shadow roots) too. */
function* images(root) {
  for (const el of root.querySelectorAll("*")) {
    if (el.tagName === "IMG") yield el;
    if (el.shadowRoot) yield* images(el.shadowRoot);
  }
}

function onScreen(img) {
  return !document.hidden && img.isConnected && img.getClientRects().length > 0;
}

/** The element HA positions for a picture-elements element holding `img` (the one whose
 * style carries left/top): 4 steps up through shadow roots today, so allow a few more. */
function positioned(img) {
  let el = img;
  for (let i = 0; i < 8 && el; i++) {
    if (el.style?.left) return el;
    el = el.parentElement || el.getRootNode().host;
  }
  return null;
}

const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

/** The highlight's pulse, every --cm-pulse seconds (steady when 0, or when the viewer
 * asked for less motion), in one of two styles (--cm-style): "breathe", the glow swelling
 * to its full blur and back, as Gang-O-Gals' running badge does; or "ripple", a ring
 * spreading out from the border and fading, as the Casa Mia panel's running dot does. */
function pulse(img) {
  const el = positioned(img);
  if (!el || el.dataset.cmPulse) return;
  el.dataset.cmPulse = "1";
  const style = getComputedStyle(el);
  const seconds = parseFloat(style.getPropertyValue("--cm-pulse")) || 0;
  const colour = style.getPropertyValue("--cm-colour").trim();
  const blur = parseFloat(style.getPropertyValue("--cm-blur")) || 0;
  if (!seconds || !colour || calm.matches) return;
  const glow = (px, spread, alpha) =>
    `0 0 ${px}px ${spread}px color-mix(in srgb, ${colour} ${alpha}%, transparent)`;
  const ripple = style.getPropertyValue("--cm-style").trim() === "ripple";
  el.animate(
    ripple
      ? [
          { boxShadow: glow(0, 0, 60), offset: 0 },
          { boxShadow: glow(0, Math.max(6, blur), 0), offset: 0.7 },
          { boxShadow: glow(0, Math.max(6, blur), 0), offset: 1 },
        ]
      : [
          { boxShadow: glow(blur / 4, 0, 30) },
          { boxShadow: glow(blur, 2, 70) },
          { boxShadow: glow(blur / 4, 0, 30) },
        ],
    { duration: seconds * 1000, iterations: Infinity, easing: ripple ? "ease-out" : "ease-in-out" },
  );
}

function check() {
  for (const img of images(document)) {
    // A Camera Commander card's picture: the card ends and starts its own stream (and
    // tells the compositor), and gives its own Security look. Left alone here: blanking it
    // hid the stream's address from the card, so its "done" was never said.
    if (img.dataset.cmOwn !== undefined) continue;
    if (STREAM.test(img.dataset.cmStream || img.src)) known.add(img);
    else if (img.src.endsWith("#cm-highlight")) pulse(img);
  }
  for (const img of known) {
    if (!onScreen(img)) {
      if (!img.dataset.cmStream) {
        img.dataset.cmStream = img.src; // remembered, to start again when shown
        img.src = BLANK;
      }
      if (!img.isConnected) known.delete(img); // gone for good unless HA shows it again
    } else if (img.dataset.cmStream) {
      // Shown again: a fresh address, so the browser opens a new stream.
      const url = new URL(img.dataset.cmStream);
      url.searchParams.set("cm", Date.now().toString(36));
      delete img.dataset.cmStream;
      img.src = url.toString();
    }
  }
}

// After every page change in the app (HA renders the new page a moment later), when the
// tab is hidden or shown again, and every few seconds in case a picture appeared.
let timer;
function soon() {
  clearTimeout(timer);
  timer = setTimeout(check, 300);
}
window.addEventListener("location-changed", soon);
window.addEventListener("popstate", soon);
document.addEventListener("visibilitychange", soon);
setInterval(check, 4000);
soon();

// The Casa Mia cards (cm-cards.js, loaded by the integration like this file) once failed to
// load on a wall tablet: fetched whole, yet no card defined, and HA loads each script only
// once per page, so the page showed red errors until it was reloaded. So a few seconds
// after the page loads, if the cards are still missing, load them once more (HA then puts
// each card in place of its error) and say so in the console, with the reason if the
// second try fails too (Kiosk Satellite keeps the console: getConsole).
const CARDS = ["casa-mia-tablet-layout", "casa-mia-commander"];
setTimeout(() => {
  if (CARDS.every((tag) => customElements.get(tag))) return;
  const url = new URL("cm-cards.js", import.meta.url);
  url.search = new URL(import.meta.url).search;
  url.searchParams.set("retry", Date.now().toString(36));
  const failed = [];
  const caught = (e) => {
    if ((e.filename || "").includes("cm-cards.js")) failed.push(`${e.message} (line ${e.lineno})`);
  };
  window.addEventListener("error", caught, true);
  const done = (how) => {
    window.removeEventListener("error", caught, true);
    const ok = CARDS.every((tag) => customElements.get(tag));
    (ok ? console.warn : console.error)(
      ok ? "CASA-MIA CARDS were missing; loaded on a second try" : `CASA-MIA CARDS failed again (${how}): ${failed.join("; ") || "no error given"}`,
    );
  };
  const script = document.createElement("script");
  script.type = "module";
  script.src = url.toString();
  script.onload = () => setTimeout(() => done("loaded"), 0);
  script.onerror = () => done("not fetched");
  document.head.appendChild(script);
}, 5000);

console.info(
  `%cCASA-MIA STREAMS\n%ckeeps camera pictures live (${new URL(import.meta.url).searchParams.get("v") || "dev"})`,
  "color: green; font-weight: bold;",
  "",
);
