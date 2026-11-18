// A light's tile, built from three parts so that a room full of lights is not a row of
// the same machine: a drive (what the duck does), a train (how its work gets across and
// where the clutch is) and a fitting (the lamp itself). Three of each and five fittings
// give 45 tiles from 11 drawings.
//
// The duck is the engine. The device being on is the clutch being in, thrown at once by
// a tap. What the duck puts in is slow to run down, which is why the lamp stays lit
// between ducks. The lamp's level is how long the duck is kept at work.
//
// Every part keeps to its own ground, so any drive goes with any train and any fitting:
// the drive is on the duck's way at the left and turns the pulley at 70,196; the train
// runs along the bottom from there to the dynamo at 202,196; the fitting is top right,
// fed by the wire up the right-hand wall. A light's tile always goes left to right; the
// page mirrors it where the route runs the other way.
import { clamp, cog, draw, esc, hash, move, pick, show, toward, turn, type Part } from "./kit.ts";
import { between, caption, lamp, track, wheel, type Dev, type Tile } from "./tile.ts";

type Q = (name: string) => Part;
/** What the works are doing: `spin` is the drive's angle, `fly` and `flown` the speed and
 * angle of what the duck has put in, `gap` the clutch (0 is in), and `dyn` and `spun` the
 * dynamo's speed and angle. */
export type Works = { spin: number; fly: number; flown: number; gap: number; dyn: number; spun: number; working: boolean; t: number };
/** `points` is the duck's way and `at` the point it works at; `hop` is how it moves while it works. */
type Drive = { points: number[][]; at: number; hop(t: number): number; still: string; live: string; pose(q: Q, s: Works): void };

// ---- Drives.
const ROAD = [[0, 130], [100, 130], [260, 130]];
export const DRIVES: Record<string, Drive> = {
  // A belt to run on.
  belt: {
    points: ROAD, at: 1, hop: (t) => Math.abs(Math.sin(t * 18)) * 5,
    still: `<path d="M56,131 H144 M56,153 H144"/><path class="rope" d="M48,146 L61,190 M65,151 L79,191"/>`,
    live: `${cog(56, 142, 10, 6, "r1")}${cog(144, 142, 10, 6, "r2")}`,
    pose(q, s) {
      turn(q("r1"), s.spin);
      turn(q("r2"), s.spin);
    },
  },
  // A sprung board to jump on, with a rod down to a crank.
  treadle: {
    points: ROAD, at: 1, hop: (t) => Math.abs(Math.sin(t * 7)) * 24,
    still: `<path class="wood" d="M44,132 h18 v6 h-18 z M138,132 h18 v6 h-18 z"/><path d="M62,128 V168 M138,128 V168"/>
      <path class="thin" d="M76,142 l8,5 l-16,6 l16,6 l-8,5 M124,142 l8,5 l-16,6 l16,6 l-8,5"/>`,
    live: `<path data-p="rod"/><g data-p="board"><path class="wood" d="M-36,-3 h72 v6 h-72 z"/></g>`,
    pose(q, s) {
      const dip = s.working ? 7 * (1 - Math.abs(Math.sin(s.t * 7))) : 0, a = s.spin / 57.3;
      move(q("board"), 100, 135 + dip);
      draw(q("rod"), `M100,${(138 + dip).toFixed(1)} L${(70 + 8 * Math.cos(a)).toFixed(1)},${(196 + 8 * Math.sin(a)).toFixed(1)}`);
    },
  },
  // A treadwheel to walk in. Its eight spokes look the same every eighth of a turn.
  wheel: {
    points: [[0, 130], [52, 130], [100, 152], [148, 130], [260, 130]], at: 2, hop: (t) => Math.abs(Math.sin(t * 18)) * 4,
    still: `<path d="M100,112 L76,172 M100,112 L124,172 M66,172 h68"/><path class="rope" d="M93,116 L62,190 M106,118 L79,192"/>`,
    live: wheel(100, 112, "tw", `<circle class="glass" r="46"/><circle class="thin" r="40"/>
      <path class="thin" d="M-46,0 H46 M0,-46 V46 M-32,-32 L32,32 M-32,32 L32,-32"/><circle class="solid" r="3"/>`, "45:9"),
    pose(q, s) {
      turn(q("tw"), -s.spin * 0.5);
    },
  },
};

/** The duck's way through a drive, at the working point from `a` to `b` of the period. */
export function way(drive: Drive, a: number, b: number) {
  const { points, at } = drive, frames: [number, number, number][] = [];
  points.forEach(([x, y], i) => {
    if (i <= at) frames.push([(a * i) / at, x, y]);
    if (i === at) frames.push([b, x, y]);
    if (i > at) frames.push([b + ((1 - b) * (i - at)) / (points.length - 1 - at), x, y]);
  });
  return track(...frames);
}
export const stroll = (drive: Drive) => {
  const mid = drive.at / (drive.points.length - 1);
  return way(drive, mid, mid);
};

/** The flywheel every shaft has: four spokes, so it looks the same every quarter turn. */
export const flywheel = (x: number, y: number) => wheel(x, y, "fly", `<circle class="iron" r="20"/><circle class="paper" r="14"/><path d="M-20,0 H20 M0,-20 V20"/>`, "90:18");

// ---- Trains, each with its own kind of clutch.
const TRAINS: Record<string, { still: string; live: string; pose(q: Q, s: Works): void }> = {
  // A flywheel on the shaft, and two discs that part.
  flywheel: {
    still: `<path d="M80,196 H146 M160,196 H180"/><rect class="brass" x="146" y="180" width="6" height="32"/><path class="iron" d="M132,190 h8 v36 h-8 z"/>`,
    live: `${flywheel(106, 196)}<g data-p="driven"><rect class="copper" x="152" y="180" width="6" height="32"/></g>
      <g data-p="lever" data-ring="0..25:11"><path d="M155,180 V160"/><circle class="solid" cx="155" cy="158" r="4"/></g>`,
    pose(q, s) {
      turn(q("fly"), s.flown);
      move(q("driven"), 8 * s.gap, 0);
      turn(q("lever"), 25 * s.gap, 155, 180);
    },
  },
  // Three cogs, the middle one on an arm that lifts it out of mesh.
  cogs: {
    still: `<path d="M170,196 H180"/>`,
    live: `${cog(98, 196, 14, 9, "g1")}${cog(156, 196, 14, 9, "g3")}<path data-p="arm"/><g data-p="idler">${cog(0, 0, 11, 7, "g2")}</g><g data-p="knob"><circle class="solid" r="4"/></g>`,
    pose(q, s) {
      const a = s.gap * 0.6, cos = Math.cos(a), sin = Math.sin(a), x = 98 + 52 * cos, y = 196 - 52 * sin - 14;
      turn(q("g1"), -s.flown);
      turn(q("g2"), s.flown * 1.3);
      turn(q("g3"), -s.spun);
      move(q("idler"), 98 + 29 * cos, 196 - 29 * sin);
      draw(q("arm"), `M98,196 L${x.toFixed(1)},${y.toFixed(1)}`);
      move(q("knob"), x, y);
    },
  },
  // A belt that is slack until a jockey pulley is pressed down on it.
  slack: {
    still: `<path d="M80,196 H88 M176,196 H180"/>`,
    live: `${cog(100, 196, 12, 5, "p1")}${cog(164, 196, 12, 5, "p2")}<path class="rope" data-p="belt-over"/><path class="rope" data-p="belt-under"/>
      <path data-p="stem"/><g data-p="jockey"><circle class="brass" r="5"/></g>`,
    pose(q, s) {
      const press = 1 - s.gap, cy = 169 + 14 * press;
      turn(q("p1"), s.flown);
      turn(q("p2"), s.spun);
      draw(q("belt-over"), `M100,184 Q132,${(184 + 8 * press).toFixed(1)} 164,184`);
      draw(q("belt-under"), `M100,208 Q132,${(208 + 18 * s.gap).toFixed(1)} 164,208`);
      move(q("jockey"), 132, cy);
      draw(q("stem"), `M132,${(cy - 5).toFixed(1)} V${(cy - 30).toFixed(1)} m-8,0 h16`);
    },
  },
};

// ---- Fittings. `hang` is where the wire along the ceiling stops, and `glow` what lights
// up. A light's name chooses its fitting where it can.
const dots = (at: number[][], r: number, cls = "") => at.map(([x, y]) => `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"/>`).join("");
const CANDLES = [[160, 58], [196, 50], [232, 58]], STRING = [[233, 30], [206, 38], [178, 42], [150, 37]];
const FITTINGS: Record<string, { hang: number; still: string; glow: string }> = {
  bulb: { hang: 196, still: lamp(196, 66, 22, "").still, glow: `<circle cx="196" cy="66" r="35"/>` },
  chandelier: { hang: 196, still: `<path d="M196,14 V56 M160,66 q36,-30 72,0"/>${dots(CANDLES, 7, "glass")}`, glow: dots(CANDLES, 13) },
  lantern: {
    hang: 246, still: `<path d="M246,40 H206 V48"/><path class="brass" d="M190,48 h32 v6 h-32 z M194,88 h24 v5 h-24 z"/><path class="glass" d="M192,54 h28 l-2,34 h-24 z"/>`,
    glow: `<path d="M188,52 h36 l-4,40 h-28 z"/>`,
  },
  fairy: { hang: 246, still: `<path class="thin" d="M246,14 q-12,26 -26,10 q-14,24 -28,4 q-14,24 -28,4 q-14,22 -28,-6"/>${dots(STRING, 5, "glass")}`, glow: dots(STRING, 10) },
  desk: {
    hang: 246, still: `<path class="thin" d="M246,82 H224"/><path class="wood" d="M176,90 h70 v5 h-70 z"/><path class="iron" d="M196,90 v-6 h28 v6 z"/>
      <path d="M210,84 L228,56 L200,40"/><path class="brass" d="M204,36 l-26,8 l12,16 z"/>`,
    glow: `<path d="M180,48 l-22,40 h40 l-6,-32 z"/>`,
  },
};
// ponytail: names in English. A list per language if this is ever translated.
const NAMED: [RegExp, string][] = [[/chandelier/i, "chandelier"], [/desk/i, "desk"], [/fairy|string/i, "fairy"], [/lantern|porch|wall/i, "lantern"]];
const fitting = (d: Dev) => FITTINGS[NAMED.find(([word]) => word.test(d.name))?.[1] ?? pick(d.id, ["bulb", "lantern", "chandelier"])];

export const works = (): Works => ({ spin: 0, fly: 140, flown: 0, gap: 1, dyn: 0, spun: 0, working: false, t: 0 });
/** One step of the works: the duck is `working` or not, and the device is `on` or not. */
export function step(s: Works, working: boolean, on: boolean, dt: number, t: number) {
  Object.assign(s, { working, t });
  s.spin += dt * (working ? 900 : 140);
  s.fly += ((working ? 900 : 180) - s.fly) * clamp(dt * (working ? 3 : 0.5));
  s.flown += dt * s.fly;
  s.gap = toward(s.gap, on ? 0 : 1, dt * 6);
  s.dyn += ((s.gap ? 0 : s.fly) - s.dyn) * clamp(dt * 4);
  s.spun += dt * s.dyn;
}

/** The tile for the light `d`. `n` chooses the drive, and the layout counts it up along
 * the route, so that two lights next to each other never have the same one. */
export function light(d: Dev, n: number): Tile {
  const drive = Object.values(DRIVES)[n % 3], train = Object.values(TRAINS)[hash(d.id) % 3], fit = fitting(d), s = works();
  const until = () => 0.25 + 0.5 * (d.level / 100), idle = stroll(drive);
  let worked = idle, level = -1;
  // A light whose level can be set has a meter that shows it.
  const meter = d.dims
    ? { still: `<circle class="paper" cx="30" cy="46" r="16"/><text class="small" x="30" y="58" text-anchor="middle">VOLTS</text>`, live: `<g data-p="volt" data-ring="-60..60:25"><path d="M30,46 V33"/></g>` }
    : { still: "", live: "" };

  return {
    device: d.id, io: "LR",
    // The pulley wants oil, the dynamo's bed works loose, and a belt drive's belt frays.
    faults: [{ kind: "oil", at: [70, 196] }, { kind: "bolt", at: [184, 220] },
      ...(drive === DRIVES.belt ? [{ kind: "cord" as const, loop: [[56, 131], [144, 131], [144, 153], [56, 153]] as [number, number][], run: () => s.spin * 0.1745 }] : [])],
    still: `<path class="wood" d="M0,132 h44 v6 h-44 z M156,132 h104 v6 h-104 z"/><path d="M14,226 H250"/>
      <rect class="copper" x="180" y="178" width="44" height="36" rx="6"/><path class="thin" d="M188,178 v36 M196,178 v36 M208,178 v36 M216,178 v36"/>
      <path class="iron" d="M176,214 h52 v12 h-52 z"/><path class="thin" d="M224,196 H246 V14 H${fit.hang}"/>
      <circle class="paper" cx="246" cy="160" r="3"/><circle class="paper" cx="246" cy="110" r="3"/>${drive.still}${train.still}${fit.still}${meter.still}${caption(d, 92, 30)}`,
    // A colour light glows in its colour (`data-glow`: the page sets it again when the colour changes).
    live: `<g class="shine" data-p="glow" data-glow="${esc(d.id)}" style="${d.colour ? `--lit:${d.colour}` : ""}">${fit.glow}</g>${cog(70, 196, 10, 6, "a")}${drive.live}${train.live}
      ${cog(202, 196, 8, 8, "dyn")}<path class="spark" data-p="spark" d="M202,160 l3,6 l6,-2 l-4,5 l4,5 l-6,-2 l-3,6 l-3,-6 l-6,2 l4,-5 l-4,-5 l6,2 z"/>${meter.live}`,

    duck({ p, on, now: t }) {
      if (!on) return idle(p);
      if (level !== d.level) {
        level = d.level;
        worked = way(drive, 0.22, until());
      }
      const at = worked(p);
      return at.i === drive.at ? { ...at, y: at.y - drive.hop(t) } : at;
    },

    pose(q, { p, on, dt, now: t }) {
      step(s, on && between(p, 0.22, until()) === 1, d.on, dt, t);
      turn(q("a"), s.spin);
      drive.pose(q, s);
      train.pose(q, s);
      turn(q("dyn"), s.spun);
      show(q("spark"), s.dyn > 500 && Math.sin(t * 50) > 0 ? 1 : 0);

      const power = d.on ? clamp(s.dyn / 700) : 0;
      show(q("glow"), d.on ? 0.3 + 0.55 * power : 0);
      if (d.dims) turn(q("volt"), -60 + 120 * power * (d.level / 100), 30, 46);
    },
  };
}
