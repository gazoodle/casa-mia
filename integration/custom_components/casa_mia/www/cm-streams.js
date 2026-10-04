// Casa Mia: keep camera pictures live. The camera dashboards show the compositor's
// pictures as endless streams (/g/<name>.mjpg). HA keeps the pages you have left alive,
// pictures and streams too, while a browser allows only 6 connections to one address and
// the compositor ends a device's oldest streams past 3; so a page you come Back to could
// show a stopped picture, and a new one might not load at all. This stops the streams of
// pictures not on screen and gives those on screen a fresh one. It also gives them the
// Security look (a CSS filter: monochrome, tinted) while the Camera Commander's Security
// look switch is on, and makes each commander's highlight (the outline on the main
// camera's tile) pulse. Loaded by the Casa Mia integration (its options switch it on); it
// touches nothing but those pictures and that outline.

const STREAM = /\/g\/[^/?#]+\.mjpg/;
// A 1x1 transparent image: a stopped picture's source (dropping a stream's connection).
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const known = new Set(); // every stream picture seen; pages left alive keep theirs
const LOOK = "switch.camera_commander_security_look";
// The commanders' Main camera selects (the Security look switch lists them): a new main
// camera is a new highlight, whose pulse is started at once.
let mains = "";
let unfollowMains;
function followMains(conn, selects) {
  if (selects.join(" ") === mains) return;
  mains = selects.join(" ");
  unfollowMains?.then((stop) => stop());
  unfollowMains = selects.length
    ? conn.subscribeMessage((msg) => msg.c && soon(), { type: "subscribe_entities", entity_ids: selects })
    : undefined;
}
let look = ""; // the CSS filter while the Security look is on

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
    if (STREAM.test(img.dataset.cmStream || img.src)) known.add(img);
    else if (img.src.endsWith("#cm-highlight")) pulse(img);
  }
  for (const img of known) {
    if (img.style.filter !== look) img.style.filter = look;
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

// The Security look switch, pushed by Home Assistant as it changes (by hand, or an
// automation): its state and filter at once, then each change (subscribe_entities sends
// the entity in full under "a", changes under "c" as "+" (new values), removal under "r").
const lookNow = { on: false, css: "" };
window.hassConnection.then(({ conn }) =>
  conn.subscribeMessage(
    (msg) => {
      const added = msg.a?.[LOOK];
      if (added) Object.assign(lookNow, { on: added.s === "on", css: added.a?.css_filter || "" });
      const changed = msg.c?.[LOOK]?.["+"];
      if (changed?.s !== undefined) lookNow.on = changed.s === "on";
      if (changed?.a && "css_filter" in changed.a) lookNow.css = changed.a.css_filter || "";
      if (msg.r?.includes(LOOK)) Object.assign(lookNow, { on: false, css: "" });
      const selects = added?.a?.main_selects ?? changed?.a?.main_selects;
      if (Array.isArray(selects)) followMains(conn, selects);
      const wanted = lookNow.on ? lookNow.css : "";
      if (wanted !== look) {
        look = wanted;
        check();
      }
    },
    { type: "subscribe_entities", entity_ids: [LOOK] },
  ),
);

console.info(
  `%cCASA-MIA STREAMS\n%ckeeps camera pictures live (${new URL(import.meta.url).searchParams.get("v") || "dev"})`,
  "color: green; font-weight: bold;",
  "",
);
