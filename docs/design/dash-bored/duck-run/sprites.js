// Drawing by placing bitmaps. A browser asked to show a vector drawing that moves turns
// its outlines into pixels again on every frame, and that is what a big duck run costs
// (measured 2026-11-18: 300 tiles in view, 9 frames a second). A cog looks the same every
// frame but for its angle. So each part is turned into pixels once, into one shared
// bitmap (an atlas), and a frame is then only placing pieces of that bitmap on a canvas.
//
// The tiles are still drawn and written as SVG: that is what the bitmaps are made from.
window.Sprites = (() => {
  const EDGE = 4; // room left round a piece for its line's width, in the drawing's units

  // What is in a tile's drawing, measured. `root` is the tile's group, in a drawing that
  // is on the page (it has to be, to be measured; it need not be seen). Gives the parts
  // that move: for each, its markup with any pose taken off, its box in its own space,
  // and how its own space sits in the tile's (a, b, c, d, e, f, as a matrix).
  function parts(root) {
    const out = [], home = root.getCTM().inverse();
    for (const el of root.querySelectorAll("[data-p]")) {
      const box = el.getBBox();
      if (!box.width && !box.height) continue; // nothing to it yet (a line the pose draws)

      const bare = el.cloneNode(true);
      bare.removeAttribute("transform"); bare.removeAttribute("style");
      // Its own space is its parent's, as its pose is put on top of that.
      const m = home.multiply(el.parentNode.getCTM());
      out.push({ name: el.dataset.p, markup: bare.outerHTML, box: [box.x - EDGE, box.y - EDGE, box.width + 2 * EDGE, box.height + 2 * EDGE], m: [m.a, m.b, m.c, m.d, m.e, m.f] });
    }
    return out;
  }

  // One bitmap of every piece in `pieces` ({ markup, box }), `scale` px to the drawing's
  // unit. Pieces with the same markup are drawn once. Each piece is given `at`, where it
  // is in the bitmap, in px: [x, y, w, h]. The bitmap is at most `most` px wide.
  async function atlas(pieces, scale, most = 4096) {
    const wide = most / scale, seen = new Map();
    let x = 0, y = 0, tall = 0, inner = "", across = 0;

    for (const piece of pieces) {
      const [bx, by, bw, bh] = piece.box, same = seen.get(piece.markup);
      if (same) { piece.at = same; continue; }

      // Along a shelf until it is full, then a new shelf under the tallest thing on it.
      if (x + bw > wide) { x = 0; y += tall; tall = 0; }
      inner += `<g transform="translate(${x - bx},${y - by})">${piece.markup}</g>`;
      piece.at = [x * scale, y * scale, bw * scale, bh * scale];
      seen.set(piece.markup, piece.at);
      x += bw; tall = Math.max(tall, bh); across = Math.max(across, x);
    }

    const canvas = await Bake.plain(inner, `0 0 ${across} ${y + tall}`, Math.ceil(across * scale));
    return { canvas, drawn: seen.size };
  }

  // A piece that turns, as `steps` pieces, each the piece turned a step further about the
  // middle of its box. Placing a bitmap at an angle is what WebKit is slow at (measured
  // 2026-11-18: 2,070 pieces a frame, 13 frames a second turned and 60 placed straight),
  // so the turning is done once, here, and a frame picks the piece for its angle.
  function turned(piece, steps = 24) {
    const [bx, by, bw, bh] = piece.box, cx = bx + bw / 2, cy = by + bh / 2, side = Math.hypot(bw, bh);
    return Array.from({ length: steps }, (_, i) => ({ ...piece, markup: `<g transform="rotate(${(360 * i) / steps} ${cx} ${cy})">${piece.markup}</g>`, box: [cx - side / 2, cy - side / 2, side, side] }));
  }

  return { parts, atlas, turned, EDGE };
})();
