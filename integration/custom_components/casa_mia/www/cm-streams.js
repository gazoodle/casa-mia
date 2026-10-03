// Casa Mia: keep camera pictures live. The camera dashboards show the compositor's
// pictures as endless streams (/g/<name>.mjpg). HA keeps the pages you have left alive,
// pictures and streams too, while a browser allows only 6 connections to one address and
// the compositor ends a device's oldest streams past 3; so a page you come Back to could
// show a stopped picture, and a new one might not load at all. This stops the streams of
// pictures not on screen and gives those on screen a fresh one. Loaded by the Casa Mia
// integration (its options switch it on); it touches nothing but those pictures.

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

function check() {
  for (const img of images(document)) {
    if (STREAM.test(img.dataset.cmStream || img.src)) known.add(img);
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

console.info(
  `%cCASA-MIA STREAMS\n%ckeeps camera pictures live (${new URL(import.meta.url).searchParams.get("v") || "dev"})`,
  "color: green; font-weight: bold;",
  "",
);
