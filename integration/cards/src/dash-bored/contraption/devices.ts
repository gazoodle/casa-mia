// The tiles that show a device that is not a light. So far there is only the stand-in: a
// packing crate with the kind of thing stencilled on it, for every kind whose machine is
// not drawn yet, so that a real room can be shown whole. Each kind's own tile goes here
// as it is drawn (the brief has what is agreed for a kettle, a boiler and a blind).
import { esc, move, show, toward, turn } from "./kit.ts";
import { between, caption, lamp, track, type Dev, type Tile } from "./tile.ts";

const through = track([0, 0, 130], [1, 260, 130]);
const kept = track([0, 0, 130], [0.3, 100, 130], [0.7, 160, 130], [1, 260, 130]);

/** The tile for `d` until its kind has one of its own. On, the duck is kept in the crate,
 * which shakes, and the flag is up; off, it walks straight through and the flag is down.
 * The lamp and the flag follow the device at once; the duck's way changes with the next duck. */
export function standin(d: Dev): Tile {
  const bulb = lamp(36, 62, 13, "lamp");
  let flag = 90;

  return {
    device: d.id, io: "LR", faults: [{ kind: "bolt", at: [72, 138] }],
    still: `<path class="wood" d="M0,132 h260 v6 h-260 z"/><path class="thin" d="M30,138 l-10,30 V138 M230,138 l10,30 V138"/>${bulb.still}${caption(d, 130, 176)}`,
    live: `${bulb.live}<g data-p="crate"><rect class="wood" x="65" y="66" width="130" height="66"/><path class="thin" d="M65,88 h130 M65,110 h130 M98,66 v66 M162,66 v66"/>
        <rect class="label" x="72" y="90" width="116" height="18"/><text class="small" x="130" y="102" text-anchor="middle">${esc(d.kind.replaceAll("_", " ").toUpperCase())}</text></g>
      <g data-p="flag" data-ring="0..90:19"><path d="M202,132 V86"/><path class="cloth" d="M202,86 h24 l-7,7 l7,7 h-24 z"/></g>
      <text data-p="knock" class="small" x="118" y="56">knock knock</text>`,
    duck({ p, on }) {
      const at = (on ? kept : through)(p);
      return { ...at, o: at.x > 78 && at.x < 182 ? 0 : 1 };
    },
    pose(q, { p, on, dt, now }) {
      const inside = on && between(p, 0.3, 0.7) === 1;
      move(q("crate"), inside ? Math.sin(now * 38) * 1.5 : 0, 0);
      show(q("knock"), inside ? 1 : 0);
      show(q("lamp"), d.on ? 0.8 : 0);
      flag = toward(flag, d.on ? 0 : 90, dt * 360);
      turn(q("flag"), flag, 202, 132);
    },
  };
}
