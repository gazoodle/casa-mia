// The patent skin's hand-drawn wobble, paid for once. The wobble is an SVG filter, and
// WebKit runs a filter again on every frame in which anything on the page moves:
// measured on 2026-11-17, 4.5 frames a second with the filter live, whether the still
// parts had a drawing of their own or a layer of their own.
//
// So the still drawing is put through the filter into a bitmap, three times with three
// wobbles, and the page shows the bitmaps in turn. That keeps the lines "boiling", as
// in hand-drawn animation, with no filter running. The moving parts are not wobbled.
window.Bake = (() => {
  const W = 1800, H = 1170, SEEDS = [4, 5, 6], TURN = 420; // the bitmaps' size, their wobbles, and ms each is shown
  // A bitmap is a document of its own, so it is given the skin's values and the
  // drawing's rules to take with it.
  const VARS = ["--bg", "--line", "--w", "--font", "--title", "--paper", "--brass", "--copper", "--iron", "--wood", "--glass", "--cloth", "--label"];
  let started = false;

  function source(still, seed) {
    const skin = getComputedStyle(document.body);
    const vars = VARS.map((v) => `${v}:${skin.getPropertyValue(v).replaceAll('"', "'")}`).join(";");
    const rules = [...document.styleSheets[0].cssRules].filter((r) => r.selectorText?.startsWith(".ink")).map((r) => r.cssText).join("\n");
    const defs = document.querySelector("defs").innerHTML.replace(/seed="\d+"/, `seed="${seed}"`);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 1200 780"><defs>${defs}</defs>
      <style>${rules}</style><g class="ink" style="${vars}" filter="url(#wobble)">${still.innerHTML}</g></svg>`;
  }

  async function bake(still, seed, canvas) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source(still, seed))}`;
    await img.decode();
    canvas.getContext("2d").drawImage(img, 0, 0, W, H);
  }

  // Bake the still drawing and show the bitmaps in its place. Until they are ready, and
  // if they can't be made, the still drawing stays as it is, with ruled lines.
  async function start(still) {
    if (started) return;
    started = true;

    const sheets = SEEDS.map(() => Object.assign(document.createElement("canvas"), { width: W, height: H }));
    try { await Promise.all(sheets.map((c, i) => bake(still, SEEDS[i], c))); }
    catch (err) { console.warn("Waterworks: the wobble could not be baked, so the lines are ruled.", err); return; }

    still.before(...sheets);
    document.body.classList.add("baked");
    let turn = 0;
    const show = () => sheets.forEach((c, i) => c.classList.toggle("on", i === turn));
    show();
    setInterval(() => { turn = (turn + 1) % sheets.length; show(); }, TURN);
  }

  return { start };
})();
