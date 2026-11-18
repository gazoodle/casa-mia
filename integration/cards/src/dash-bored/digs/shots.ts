// The cameras' pictures in Digs: each camera's latest still, drawn into the frame that is
// its block at a texel to a texel, so that one camera can be told from another.
import { texture } from "./textures.ts";

export const SHOT = [44, 22]; // texels: a camera's picture in its frame
const HALVES = 8; // a still is first drawn this many times the frame's size, then halved down to it

/** Draw each camera's picture into its frame (a canvas of the class `shot`, its still's
 * address in `data-src`) when that address changes: Home Assistant gives a still a new
 * address every few minutes. It fills the frame, cut at its edges. A still that can't be
 * fetched is a cracked grey frame, and is said in the console. */
export function shots(root: ParentNode) {
  for (const shot of root.querySelectorAll<HTMLCanvasElement & { shown?: string }>(".shot")) {
    const src = shot.dataset.src ?? "";
    if (shot.shown === src) continue;
    shot.shown = src;
    const g = shot.getContext("2d")!;
    const instead = (name: string, x = 0, y = 0, w = shot.width, h = shot.height) => {
      g.clearRect(0, 0, shot.width, shot.height);
      g.drawImage(texture(name), x, y, w, h);
    };
    // No picture to show yet: the camera itself, in the middle of its frame.
    if (!src) {
      instead("camera", 14, 3, 16, 16);
      continue;
    }

    const still = new Image();
    still.onload = () => {
      if (shot.shown !== src) return;
      const k = Math.max(shot.width / still.naturalWidth, shot.height / still.naturalHeight);
      const [w, h] = [shot.width / k, shot.height / k];
      // Made smaller by halves: a large still drawn straight to 44 texels takes one pixel
      // in thirty and comes out speckled (seen on the test VM, 2026-11-18).
      const step = Object.assign(document.createElement("canvas"), { width: shot.width * HALVES, height: shot.height * HALVES });
      const s = step.getContext("2d")!;
      s.drawImage(still, (still.naturalWidth - w) / 2, (still.naturalHeight - h) / 2, w, h, 0, 0, step.width, step.height);
      for (let n = HALVES; n > 1; n /= 2) s.drawImage(step, 0, 0, shot.width * n, shot.height * n, 0, 0, (shot.width * n) / 2, (shot.height * n) / 2);
      g.clearRect(0, 0, shot.width, shot.height);
      g.drawImage(step, 0, 0, shot.width, shot.height, 0, 0, shot.width, shot.height);
    };
    still.onerror = () => {
      if (shot.shown !== src) return;
      instead("dead");
      // The address without its token.
      console.warn(`Dash-Bored: a camera's picture could not be fetched (${src.split("?")[0]})`);
    };
    still.src = src;
  }
}
