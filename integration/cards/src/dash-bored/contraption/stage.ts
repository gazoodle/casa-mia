// A frame of Contraption: placing the bitmaps (sprites.ts) on the canvas where the parts'
// poses say (kit.ts). A bitmap is never turned as it is drawn: a part that turns has a
// bitmap for each angle, and the one nearest is placed straight. Mirroring and squashing
// are done as it is drawn, since they keep its edges square to the screen. The few lines
// whose shape changes (a rod, a slack belt, the bot's tongs) are drawn as lines.
import { chosen, facing, mul, posed, type Mat, type Part, type Piece } from "./kit.ts";

/** What a frame draws with: the canvas, how many of its px make one of the drawing's
 * units, how far along the sheet the canvas begins (px), and the skin's line. */
export type Pen = { g: CanvasRenderingContext2D; k: number; ox: number; line: string; w: number };

export const SAME: Mat = [1, 0, 0, 1, 0, 0];

/** One bitmap, where the matrix `m` puts the middle of its box. */
export function put(pen: Pen, piece: Piece, m: Mat, at = facing(m), alpha = 1) {
  const slot = piece.at;
  if (!slot) return; // the atlas is not made yet
  const { g, k } = pen, [bx, by, bw, bh] = piece.box, cx = bx + bw / 2, cy = by + bh / 2;

  g.setTransform(k * at.flip * at.sx, 0, 0, k * at.sy, k * (m[0] * cx + m[2] * cy + m[4]) - pen.ox, k * (m[1] * cx + m[3] * cy + m[5]));
  g.globalAlpha = alpha;
  g.drawImage(slot.page, slot.x, slot.y, slot.w, slot.h, -bw / 2, -bh / 2, bw, bh);
}

/** A part and the parts inside it, in the space `m`: its own drawing first, then theirs over it. */
export function place(pen: Pen, part: Part, m: Mat, alpha = 1) {
  if (!part.o) return;
  const w = mul(mul(m, part.m), posed(part)), a = alpha * part.o, { g, k } = pen;

  if (part.line !== undefined) {
    if (part.d) {
      g.setTransform(k * w[0], k * w[1], k * w[2], k * w[3], k * w[4] - pen.ox, k * w[5]);
      g.globalAlpha = a;
      g.lineWidth = pen.w * part.line;
      g.stroke(new Path2D(part.d));
    }
  } else if (part.looks.length) {
    const at = facing(w);
    put(pen, part.ring ? part.looks[chosen(part.ring, part.looks.length, at.deg)] : part.looks[0], w, at, a);
  }
  for (const kid of part.kids) place(pen, kid, w, a);
}

/** The tunnels of one layer under the sheet, as tubes: dim, dashed walls with nothing
 * between them. The inside is rubbed out and not painted, so that the sheet shows through
 * it, and so that a tube drawn later goes over one drawn before where they cross. The
 * dashes are the same on every layer and stay where they are (owner, 2026-11-18: "the
 * tunnel lines don't need to move, and they can all be the same dashed style"). */
const BORE = 22, DASHES = [10, 7];
export function tube(pen: Pen, path: Path2D, alpha: number) {
  const { g, k } = pen;
  g.setTransform(k, 0, 0, k, -pen.ox, 0);
  Object.assign(g, { globalAlpha: alpha, lineWidth: BORE + 2.4 * pen.w, lineCap: "butt" });
  g.setLineDash(DASHES);
  g.stroke(path);

  g.setLineDash([]);
  Object.assign(g, { globalAlpha: 1, lineWidth: BORE, lineCap: "round", globalCompositeOperation: "destination-out" });
  g.stroke(path);
  g.globalCompositeOperation = "source-over";
}

/** Ready the canvas for a frame: cleared, and inked as the skin's lines are. */
export function clear(pen: Pen) {
  const { g } = pen;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  Object.assign(g, { strokeStyle: pen.line, lineCap: "round", lineJoin: "round" });
}

/** Every piece a part and the parts inside it are drawn with. */
export const pieces = (part: Part): Piece[] => [...part.looks, ...part.kids.flatMap(pieces)];
