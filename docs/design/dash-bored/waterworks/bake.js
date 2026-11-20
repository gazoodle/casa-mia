// The patent skin's hand-drawn wobble, paid for once. The wobble is an SVG filter, and
// WebKit runs a filter again on every frame in which anything on the page moves:
// measured on 2026-11-17, 4.5 frames a second with the filter live, whether the still
// parts had a drawing of their own or a layer of their own.
//
// So the still drawing is put through the filter into a bitmap, three times with three
// wobbles, and the page shows the bitmaps in turn. That keeps the lines "boiling", as
// in hand-drawn animation, with no filter running. The moving parts are not wobbled.
window.Bake = (() => {
  const W = 1800, SEEDS = [4, 5, 6], TURN = 420; // the bitmaps' width, their wobbles, and ms each is shown
  // A bitmap is a document of its own, so it is given the skin's values and the
  // drawing's rules to take with it.
  const VARS = ["--bg", "--line", "--w", "--font", "--title", "--paper", "--brass", "--copper", "--iron", "--wood", "--glass", "--cloth", "--label",
    "--cast", "--water", "--pool", "--flame", "--lit", "--duck", "--red"];
  let turn = 0, boiling = false, started = false;

  // `px` is how many of the drawing's units make one px on the screen, where a view
  // shows more than one sheet's worth: the wobble is made that much bigger, to look the same.
  function source(inner, seed, box, px, vars, high, wide = W, wobble = true) {
    const skin = getComputedStyle(document.body);
    const worn = VARS.map((v) => `${v}:${skin.getPropertyValue(v).replaceAll('"', "'")}`).join(";");
    const rules = [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.selectorText?.startsWith(".ink")).map((r) => r.cssText).join("\n");
    const defs = document.querySelector("defs").innerHTML.replace(/seed="\d+"/, `seed="${seed}"`)
      .replace('baseFrequency=".03"', `baseFrequency="${0.03 / px}"`).replace('scale="3"', `scale="${3 * px}"`);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${wide}" height="${high}" viewBox="${box}"><defs>${defs}</defs>
      <style>${rules}</style><g class="ink" style="${worn};--px:${px};${vars}" ${wobble ? 'filter="url(#wobble)"' : ""}>${inner}</g></svg>`;
  }

  // The bitmaps of a drawing (`inner`, the inside of an SVG), as seen through `box`. They
  // take turns at being shown from the moment they are put on the page.
  async function sheets(inner, { box = "0 0 1200 780", px = 1, vars = "" } = {}) {
    // The bitmaps are the shape of what they show, so that they fit where it is shown.
    const [, , bw, bh] = box.split(" ").map(Number), high = Math.round((W * bh) / bw);
    const made = SEEDS.map((_, i) => Object.assign(document.createElement("canvas"), { width: W, height: high, className: i === turn ? "on" : "" }));
    await Promise.all(made.map(async (canvas, i) => {
      const img = new Image();
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source(inner, SEEDS[i], box, px, vars, high))}`;
      await img.decode();
      canvas.dataset.turn = i;
      canvas.getContext("2d").drawImage(img, 0, 0, W, high);
    }));

    if (!boiling) {
      boiling = true;
      setInterval(() => {
        turn = (turn + 1) % SEEDS.length;
        for (const c of document.querySelectorAll("canvas[data-turn]")) c.classList.toggle("on", +c.dataset.turn === turn);
      }, TURN);
    }
    return made;
  }

  // One bitmap of a drawing just as it is, with no wobble, `wide` px across: for a view
  // from so far off that the lines cannot be made out, where a bitmap is much the cheaper
  // thing to show under what moves.
  async function plain(inner, box, wide) {
    const [, , bw, bh] = box.split(" ").map(Number), high = Math.round((wide * bh) / bw);
    const canvas = Object.assign(document.createElement("canvas"), { width: wide, height: high }), img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source(inner, 0, box, 1, "", high, wide, false))}`;
    await img.decode();
    canvas.getContext("2d").drawImage(img, 0, 0, wide, high);
    return canvas;
  }

  // Bake a page's one still drawing and show the bitmaps in its place. Until they are
  // ready, and if they can't be made, the still drawing stays as it is, with ruled lines.
  async function start(still) {
    if (started) return;
    started = true;

    try { still.before(...(await sheets(still.innerHTML, { box: still.getAttribute("viewBox") }))); }
    catch (err) { console.warn("Waterworks: the wobble could not be baked, so the lines are ruled.", err); return; }
    document.body.classList.add("baked");
  }

  return { sheets, plain, start };
})();
