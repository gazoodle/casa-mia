// Drawing by placing bitmaps. A browser asked to show a vector drawing that moves turns
// its outlines into pixels again on every frame, and that is what a big Contraption costs
// (measured on the mock-up, 2026-11-18: 300 tiles in view as SVG, 9 frames a second; as
// bitmaps, 60). A cog looks the same every frame but for its angle. So each part is
// turned into pixels once, into shared bitmaps (the atlas), and a frame is then only
// placing pieces of them on a canvas (stage.ts).
//
// The tiles are still drawn and written as SVG: that is what the bitmaps are made from.
// A tile's drawing is put on the page's unseen bench to be measured, and stays there, so
// that a piece whose words or colour change can be made again from it.
import { ringOf, type Part, type Piece, type Ring, type Slot } from "./kit.ts";
import { DEFS, INK, worn, type Skin } from "./skins.ts";
import { S } from "./tile.ts";

const EDGE = 4; // room left round a piece for its line's width, in the drawing's units
// The most a page of the atlas is across or down, in px. Safari on a tablet refuses a
// canvas of more than 16.7 million px, which a square of this side is just inside.
const SIDE = 4096;
const GUTTER = 1; // px between pieces, so that one never bleeds into the next

const text = (el: Element) => new XMLSerializer().serializeToString(el);

/** What of an element is its own drawing: itself, without the named parts inside it.
 * Without its name too, so that two cogs alike are one bitmap. */
function own(el: Element) {
  const bare = el.cloneNode(true) as SVGGraphicsElement;
  for (const kid of bare.querySelectorAll("[data-p]")) kid.remove();
  for (const name of ["data-p", "data-ring"]) bare.removeAttribute(name);
  return bare;
}

/** A piece that turns, as `steps` pieces, each the piece turned a step further about the
 * middle of its box. Placing a bitmap at an angle is what WebKit is slow at (measured
 * 2026-11-18: 2,070 pieces a frame, 13 frames a second turned and 60 placed straight),
 * so the turning is done once, here, and a frame picks the piece for its angle. */
function turned(piece: Piece, ring: Ring, steps: number): Piece[] {
  const [bx, by, bw, bh] = piece.box, cx = bx + bw / 2, cy = by + bh / 2, side = Math.hypot(bw, bh);
  const each = ring.span / (ring.wrap ? steps : steps - 1);
  return Array.from({ length: steps }, (_, i) => ({ markup: `<g transform="rotate(${ring.lo + i * each} ${cx} ${cy})">${piece.markup}</g>`, box: [cx - side / 2, cy - side / 2, side, side] }));
}

/** The named parts of a drawing, measured. `root` is a group on the bench (it has to be
 * on the page to be measured; it need not be seen). Gives the parts at the top, each
 * holding the parts inside it, and every part by its name. `mirrored`: the drawing is to
 * be shown mirrored, so a part with words in it is made the other way round, to be read. */
export function measure(root: SVGGraphicsElement, mirrored = false) {
  const tops: Part[] = [], named = new Map<string, Part>(), made = new Map<Element, Part>();

  for (const el of root.querySelectorAll<SVGGraphicsElement>("[data-p]")) {
    // Its own space is its parent's, as its pose is put on top of that.
    const up = el.parentElement!.closest<SVGGraphicsElement>("[data-p]");
    const holder = up && made.has(up) ? up : root;
    const m = holder.getCTM()!.inverse().multiply((el.parentNode as SVGGraphicsElement).getCTM()!);
    const part: Part = { name: el.dataset.p!, m: [m.a, m.b, m.c, m.d, m.e, m.f], kids: [], looks: [], d: "", x: 0, y: 0, deg: 0, cx: 0, cy: 0, sx: 1, sy: 1, o: 1 };

    if (el.localName === "path" && !el.hasAttribute("d")) part.line = el.classList.contains("rope") ? 0.8 : el.classList.contains("thin") ? 0.6 : 1;
    else {
      const bare = own(el);
      el.after(bare);
      const box = bare.getBBox();
      bare.remove();

      if (box.width || box.height) {
        const worded = mirrored && (bare.localName === "text" || !!bare.querySelector("text"));
        const piece: Piece = {
          markup: worded ? `<g transform="translate(${2 * box.x + box.width},0) scale(-1,1)">${text(bare)}</g>` : text(bare),
          box: [box.x - EDGE, box.y - EDGE, box.width + 2 * EDGE, box.height + 2 * EDGE], from: el,
        };
        const spec = el.dataset.ring ? ringOf(el.dataset.ring) : undefined;
        part.ring = spec?.ring;
        part.looks = spec ? turned(piece, spec.ring, spec.steps) : [piece];
      }
    }

    made.set(el, part);
    named.set(part.name, part);
    (holder === root ? tops : made.get(holder)!.kids).push(part);
  }
  return { tops, named };
}

/** A tile's still drawing as pieces, one for each tile's width of it: a drawing several
 * tiles wide (lights switched together) would not fit a page of the atlas whole. */
export function stills(root: SVGGraphicsElement, span: number): Piece[] {
  const markup = text(own(root));
  return Array.from({ length: span }, (_, k) => ({ markup, box: [k * S, 0, S, S], from: root, wob: true }));
}

/** One piece, in the atlas at `at` (px), seen through its box and nothing outside it. */
const nest = (p: Piece, at: { x: number; y: number; w: number; h: number }, scale: number, skin: Skin) =>
  `<svg x="${at.x / scale}" y="${at.y / scale}" width="${at.w / scale}" height="${at.h / scale}" viewBox="${p.box.join(" ")}" preserveAspectRatio="none">${p.wob && skin.wob ? `<g filter="url(#wobble)">${p.markup}</g>` : p.markup}</svg>`;

/** A drawing as a picture, `w` by `h` px. A bitmap is a document of its own, so it is
 * given the skin's values and the drawing's rules to take with it. */
async function bake(inner: string, w: number, h: number, scale: number, skin: Skin) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w / scale} ${h / scale}"><defs>${DEFS}</defs><style>${INK}</style><g class="ink" style="${worn(skin)}">${inner}</g></svg>`;
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

const key = (p: Piece) => `${p.box}|${p.markup}`;

/** The atlas: every piece in `pieces` made a bitmap, `scale` px to the drawing's unit, and
 * each told where it is (`at`). Pieces that are alike are drawn once. They go along a
 * shelf until it is full, then a new shelf under it, then a new page. Answers with how
 * many pages and px it came to. No piece is told anything until every page is made, so a
 * frame drawn meanwhile uses the atlas before this one, whole. */
export async function atlas(pieces: Piece[], scale: number, skin: Skin, tell?: (done: number, of: number) => void) {
  type Page = { inner: string; wide: number; high: number; slots: Slot[] };
  const slots = new Map<string, Slot>(), pages: Page[] = [];
  let x = 0, y = 0, tall = 0;

  // The tallest first, so that a shelf holds things of a height.
  for (const piece of [...pieces].sort((a, b) => b.box[3] - a.box[3])) {
    if (slots.has(key(piece))) continue;
    const w = Math.ceil(piece.box[2] * scale), h = Math.ceil(piece.box[3] * scale);

    if (x + w > SIDE) [x, y, tall] = [0, y + tall + GUTTER, 0];
    if (!pages.length || y + h > SIDE) {
      pages.push({ inner: "", wide: 0, high: 0, slots: [] });
      [x, y, tall] = [0, 0, 0];
    }
    const page = pages.at(-1)!, slot = { x, y, w, h } as Slot;
    page.inner += nest(piece, slot, scale, skin);
    page.slots.push(slot);
    slots.set(key(piece), slot);

    x += w + GUTTER;
    tall = Math.max(tall, h);
    page.wide = Math.max(page.wide, x);
    page.high = y + tall;
  }

  // Which slot is whose is settled now: a piece's drawing may change while the pages are
  // being made, and its bitmap is then made again in the slot it was given here.
  const homes = pieces.map((piece) => [piece, slots.get(key(piece))] as const);

  let done = 0;
  await Promise.all(pages.map(async (page) => {
    const canvas = Object.assign(document.createElement("canvas"), { width: page.wide, height: page.high });
    canvas.getContext("2d")!.drawImage(await bake(page.inner, page.wide, page.high, scale, skin), 0, 0);
    for (const slot of page.slots) slot.page = canvas;
    tell?.(++done, pages.length);
  }));
  for (const [piece, slot] of homes) piece.at = slot;
  return { pages: pages.length, px: pages.reduce((sum, page) => sum + page.wide * page.high, 0) };
}

/** A piece's drawing again, from the element it was made from: its words or its colour have changed. */
export const refresh = (piece: Piece) => void (piece.markup = text(own(piece.from!)));

/** Make one piece a bitmap again, in its place in the atlas, from its drawing as it now is. */
export async function rebake(piece: Piece, scale: number, skin: Skin) {
  const at = piece.at;
  if (!at) return; // no atlas yet: it will be made from the drawing as it now is
  const img = await bake(nest(piece, { ...at, x: 0, y: 0 }, scale, skin), at.w, at.h, scale, skin);

  const g = at.page.getContext("2d")!;
  g.clearRect(at.x, at.y, at.w, at.h);
  g.drawImage(img, at.x, at.y);
}
