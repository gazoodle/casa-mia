// Digs' first texture pack, 4²: a block is sixteen texels square. Every texture, figure
// and letter is made here from a seeded pattern, so the page needs no pictures and holds
// nothing from any game. Each is painted when it is first asked for, and kept.
import { html } from "lit";
import { hash, rng } from "./world.ts";

type Paint = (x: number, y: number, r: () => number) => string | null;

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * k))).join()})`;
};
// A colour a step or two lighter or darker, in four steps as pixel art has.
const j = (hex: string, r: () => number, a = 0.1) => shade(hex, 1 + (Math.floor(r() * 4) - 1.5) * a);
const edge = (x: number, y: number, w = 16, h = 16) => x === 0 || y === 0 || x === w - 1 || y === h - 1;
const WOOD = "#b98a4e", DARK = "#7d5a30", GREY = "#868686", SKIN = "#e0b088", INK = "#2a2018";

/** How far a texel is from a point. */
const round = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);
const plank = (hex: string): Paint => (x, y, r) => (y % 4 === 3 || x === ((y >> 2) * 7 + 3) % 16 ? shade(hex, 0.7) : j(hex, r, 0.06));
const lamp = (frame: string, grid: string, inner: string, a: number): Paint => (x, y, r) => (edge(x, y) ? frame : x % 5 === 0 || y % 5 === 0 ? grid : j(inner, r, a));
// A machine with a window in its front, a stove with a fire in its mouth, and a block with a lamp in it.
const machine = (on: boolean): Paint => (x, y, r) => (edge(x, y) ? shade(GREY, 0.55) : x > 3 && x < 12 && y > 5 && y < 13 ? (on ? j("#ffb030", r, 0.2) : "#26262a") : y < 3 ? shade(GREY, 1.15) : j("#7c7f86", r, 0.06));
const stove = (on: boolean): Paint => (x, y, r) =>
  x > 3 && x < 12 && y > 7 && y < 14 ? (on ? (r() < 0.35 ? "#ffe45c" : j("#e8641e", r, 0.2)) : "#1c1a18") : y % 4 === 3 || (x + (y >> 2) % 2 * 4) % 8 === 0 ? shade(GREY, 0.6) : j("#77706a", r, 0.07);
const beacon = (on: boolean): Paint => (x, y, r) => (edge(x, y) ? shade(GREY, 0.55) : Math.hypot(x - 7.5, y - 7.5) < 4.5 ? (on ? j("#e02c3c", r, 0.2) : "#4a2226") : j("#7c7f86", r, 0.06));
// A lever on its plate: thrown to the right with a lit tip when on.
const lever = (on: boolean): Paint => (x, y) => {
  if (y > 11) return x > 2 && x < 13 ? shade(GREY, y === 12 ? 1 : 0.7) : null;
  const at = on ? 8 + (11 - y) / 2 : 7 - (11 - y) / 2;
  if (y < 3 || Math.abs(x - at) > 1) return null;
  return y < 5 ? (on ? "#e02c3c" : "#5a3a3a") : DARK;
};
const chandelier = (glow: string): Paint => (x, y) =>
  (x === 7 || x === 8) && y < 6 ? "#4a3016" : y > 5 && y < 9 && x > 0 && x < 15 ? "#a8742a" : y > 8 && y < 14 && x % 4 > 0 && x % 4 < 3 && x > 0 && x < 15 ? glow : null;
const person = (hair: string, top: string, legs: string): Paint => (x, y) =>
  y < 8 ? (x < 4 || x > 11 ? null : y < 3 ? hair : y === 4 && (x === 6 || x === 9) ? INK : SKIN)
  : y < 20 ? (x > 3 && x < 12 ? top : x > 1 && x < 14 ? (y < 18 ? shade(top, 0.85) : SKIN) : null)
  : x < 4 || x > 11 ? null : y > 29 ? INK : x === 7 || x === 8 ? shade(legs, 0.8) : legs;
const bitmap = (rows: string[], colour: string): [number, number, Paint] => [rows[0].length, rows.length, (x, y) => (rows[y][x] === "#" ? colour : null)];
const HEART = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."], BOLT = ["..##", ".##.", "####", ".##.", "##..", "#..."];
const cloud = (hex: string): Paint => (x, y) => (y > 4 && y < 10 && x > 1 && x < 14 && !(y === 5 && (x < 5 || x > 10)) ? hex : null);

// A crack that wanders down a block: a guarded block's after its first hit, and a block's that is not answering.
const crack = (() => {
  const r = rng(11), at = new Set<string>();
  let x = 8;
  for (let y = 0; y < 32; y++) {
    x += Math.floor(r() * 3) - 1;
    at.add(`${x},${y}`);
    if (y % 9 === 4) at.add(`${x + 1},${y}`).add(`${x + 2},${y - 1}`);
  }
  return (x: number, y: number) => at.has(`${x},${y}`);
})();

// Each texture: how many texels across and down, and what colour each is (null: nothing there).
const PAINTS: Record<string, [number, number, Paint]> = {
  dirt: [16, 16, (_x, _y, r) => j("#7a5536", r)],
  grass: [16, 16, (_x, y, r) => (y < 3 + ((r() * 3) | 0) ? j("#5aa13c", r) : j("#7a5536", r))],
  stone: [16, 16, (x, y, r) => (y % 4 === 3 || (x + (y >> 2) * 5) % 8 === 0 ? shade(GREY, 0.72) : j(GREY, r, 0.07))],
  ore: [16, 16, (x, y, r) => (r() < 0.1 && !edge(x, y) ? "#e0913a" : j(GREY, r, 0.08))],
  plank: [16, 16, plank(WOOD)],
  beam: [16, 16, plank(DARK)],
  wall: [16, 16, (_x, _y, r) => j("#9c927c", r, 0.04)],
  roof: [16, 16, (x, y, r) => (y % 4 === 3 || (x + (y >> 2) % 2 * 4) % 8 === 0 ? shade("#9a3b2e", 0.65) : j("#9a3b2e", r, 0.08))],
  brick: [16, 16, (x, y, r) => (y % 4 === 3 || (x + (y >> 2) % 2 * 4) % 8 === 7 ? "#c9c2b4" : j("#a4553c", r, 0.08))],
  trunk: [16, 16, (x) => shade("#6b4a2b", 1 + (((x * 37) % 5) - 2) * 0.08)],
  leaves: [16, 16, (_x, _y, r) => (r() < 0.1 ? null : j("#3f7d2c", r, 0.16))],
  water: [16, 16, (_x, y, r) => (y % 5 === 1 && r() < 0.6 ? "#7fa8f0" : j("#3a6fd8", r, 0.05))],
  post: [16, 16, (x, _y, r) => (x > 5 && x < 10 ? j(DARK, r, 0.08) : null)],
  ladder: [16, 16, (x, y) => (x === 2 || x === 3 || x === 12 || x === 13 || (y % 4 === 1 && x > 1 && x < 14) ? "#8a6536" : null)],
  board: [16, 16, (x, y, r) => (edge(x, y) ? shade(WOOD, 0.55) : j(WOOD, r, 0.05))],
  glass: [16, 32, (x, y) => (edge(x, y, 16, 32) || y === 15 ? "#dff1ff" : (x + y) % 16 === 8 && x > 2 && x < 8 ? "rgba(255,255,255,.8)" : "rgba(170,215,255,.25)")],
  slat: [16, 16, (_x, y) => (y % 3 === 2 ? shade("#e8e0c8", 0.7) : "#e8e0c8")],
  lampOff: [16, 16, lamp("#4a3016", "#4f3a1c", "#7a5a2a", 0.06)],
  lampOn: [16, 16, lamp("#a8742a", "#e0a93a", "#ffe9a0", 0.05)],
  machOff: [16, 16, machine(false)],
  machOn: [16, 16, machine(true)],
  stoveOff: [16, 16, stove(false)],
  stoveOn: [16, 16, stove(true)],
  alarmOff: [16, 16, beacon(false)],
  alarmOn: [16, 16, beacon(true)],
  leverOff: [16, 16, lever(false)],
  leverOn: [16, 16, lever(true)],
  // A ring of lamps on a chain, for a room with too many lights for a lamp each; and a chest, which opens the room's list.
  chandelierOff: [16, 16, chandelier("#7a5a2a")],
  chandelierOn: [16, 16, chandelier("#ffe9a0")],
  chest: [16, 16, (x, y, r) => (y < 2 ? null : edge(x, y - 2, 16, 14) || y === 7 ? shade(DARK, 0.6) : x > 6 && x < 9 && y > 5 && y < 10 ? "#e6c65a" : j(WOOD, r, 0.07))],
  // A camera's picture frame, three blocks by two: the picture is drawn into the dark, over a plate for its name.
  frame: [48, 32, (x, y, r) => (x < 2 || x > 45 || y < 2 || y > 29 || y === 24 ? j(DARK, r, 0.1) : y > 24 ? "#3a2a18" : "#16161a")],
  camera: [16, 16, (x, y, r) => (edge(x, y) ? shade(GREY, 0.55) : Math.hypot(x - 7.5, y - 7.5) < 2 ? "#7fa8f0" : Math.hypot(x - 7.5, y - 7.5) < 5 ? "#16161a" : j("#b9bcc4", r, 0.05))],
  door: [16, 32, (x, y, r) => (x < 1 || x > 14 || y < 1 ? "#5e3d18" : ((x > 2 && x < 7) || (x > 8 && x < 13)) && y > 3 && y < 10 ? "rgba(190,225,255,.6)" : x > 10 && x < 13 && y > 16 && y < 19 ? "#e6c65a" : y === 14 || y === 30 ? "#5e3d18" : j("#9a6a34", r, 0.06))],
  doorOpen: [16, 32, (x, _y, r) => (x < 3 ? j("#9a6a34", r, 0.06) : null)],
  dead: [16, 16, (x, y, r) => (crack(x, y) || crack(15 - x, y + 16) ? "#1c1c1c" : edge(x, y) ? shade(GREY, 0.45) : j("#5a5a5a", r, 0.05))],
  crack: [16, 32, (x, y) => (crack(x, y) ? "rgba(20,10,0,.85)" : null)],
  ghost: [16, 16, (x, y) => (edge(x, y) && (x + y) % 2 ? "rgba(255,255,255,.45)" : null)],
  ember: [16, 16, (x, y, r) => (edge(x, y) ? "#8a2c14" : r() < 0.3 ? "#ffe45c" : j("#e8641e", r, 0.15))],
  rain: [16, 16, (_x, _y, r) => (r() < 0.04 ? "rgba(200,220,255,.85)" : null)],
  snow: [16, 16, (_x, _y, r) => (r() < 0.03 ? "#fff" : null)],
  heart: bitmap(HEART, "#e02c3c"),
  heart0: bitmap(HEART, "rgba(0,0,0,.5)"),
  bolt: bitmap(BOLT, "#ffd83a"),
  bolt0: bitmap(BOLT, "rgba(0,0,0,.5)"),
  // The prank (prank.ts): an imp with horns and a tail, the hole its crate leaves, and the bot that mends it.
  imp: [16, 16, (x, y) => ((y < 3 && (x === 4 || x === 11)) || (y === 1 && (x === 5 || x === 10)) ? "#5a1420" : y > 2 && y < 9 && x > 3 && x < 12 ? (y === 5 && (x === 6 || x === 9) ? "#ffe45c" : y === 7 && x > 5 && x < 10 ? "#2a0a10" : "#c8323c")
    : y > 8 && y < 14 && x > 4 && x < 11 ? "#a02630" : y > 13 && (x === 5 || x === 6 || x === 9 || x === 10) ? "#5a1420" : (y === 11 && x > 10 && x < 14) || (x === 13 && y > 8 && y < 11) || (y === 8 && x > 12) ? "#5a1420" : null)],
  // Our own crate: a bundle of red sticks tied with a paper band, with a fuse. Drawn here from nothing; no game's block.
  tnt: [16, 16, (x, y) => (y < 3 ? ((x === 8 && y > 0) || (x === 9 && y === 0) ? "#2a2018" : null)
    : y > 4 && y < 12 ? (y > 5 && y < 11 && x > 1 && x < 14 && (x - 2) % 4 < 3 && Number("72222 65555 72222".split(" ")[(x - 2) >> 2][y - 6]) & (4 >> ((x - 2) % 4)) ? "#2a2018" : "#f0e6c8")
    : x % 4 === 3 ? "#7a1418" : y === 3 || y === 15 ? "#a01c22" : x % 4 === 0 ? "#e85a50" : "#d0282e")],
  hole: [16, 16, (x, y, r) => (edge(x, y) && r() < 0.5 ? null : r() < 0.12 ? "#3a3632" : "#16141a")],
  bot: [16, 16, (x, y) => (y === 0 && x > 2 && x < 13 ? "#b9bcc4" : y < 3 && (x === 7 || x === 8) ? "#5a5d66" : y > 2 && y < 11 && x > 3 && x < 12 ? (y > 4 && y < 8 && x > 5 && x < 10 ? "#5ad8ff" : edge(x - 4, y - 3, 8, 8) ? "#5a5d66" : "#9a9da6")
    : y > 10 && y < 15 && (x === 5 || x === 10) ? "#5a5d66" : (y === 14 && x > 3 && x < 12) || (y > 11 && x > 11 && x < 15 && x - y === 0) ? "#ffd83a" : null)],
  // The sun and the moon, two blocks across: as round as texels let them be. The moon has its dark limb and three craters.
  sun: [32, 32, (x, y) => (round(x, y, 15.5, 15.5) > 15.6 ? null : round(x, y, 15.5, 15.5) > 12 ? "#ffd020" : "#ffe45c")],
  moon: [32, 32, (x, y) => (round(x, y, 15.5, 15.5) > 15.6 ? null : round(x, y, 11, 12) > 16 ? "#b9c3da" : [[10, 10, 3], [21, 17, 3.5], [13, 23, 2.2]].some(([cx, cy, r]) => round(x, y, cx, cy) < r) ? "#cbd3e6" : "#e3e9f6")],
  // The forecast's pictures, over each sign.
  skySun: [16, 16, (x, y) => (Math.hypot(x - 7.5, y - 7.5) < 4.5 ? "#ffe45c" : (x === 7 || x === 8 || y === 7 || y === 8) && Math.hypot(x - 7.5, y - 7.5) > 6 ? "#ffd020" : null)],
  skyCloud: [16, 16, cloud("#f2f4f8")],
  skyRain: [16, 16, (x, y) => cloud("#aab4c4")(x, y, Math.random) ?? (y > 10 && y < 15 && (x + y) % 4 === 0 && x > 2 && x < 14 ? "#7fa8f0" : null)],
  skySnow: [16, 16, (x, y) => cloud("#d8dee8")(x, y, Math.random) ?? (y > 10 && y < 15 && y % 2 === 1 && (x + y) % 4 === 0 && x > 2 && x < 14 ? "#fff" : null)],
};
// The figures' clothes, by a person's name: hair, top and legs.
const HAIR = ["#5a2d1a", "#c9c2b4", "#2a2018", "#d8a43a", "#8a3a1c"], TOPS = ["#e0913a", "#7a4fa8", "#3a6fd8", "#b8323a", "#3f7d2c", "#2a9d8f"], LEGS = ["#3f6d4c", "#4a5a78", "#5a4632", "#33343c"];

const canvases = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();

function painted(name: string, w: number, h: number, paint: Paint) {
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = canvas.getContext("2d")!;
  const r = rng(hash(name));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const colour = paint(x, y, r);
      if (!colour) continue;
      g.fillStyle = colour;
      g.fillRect(x, y, 1, 1);
    }
  canvases.set(name, canvas);
  return canvas;
}

/** A texture by its name, as a canvas to draw from. */
export const texture = (name: string) => canvases.get(name) ?? painted(name, ...PAINTS[name]);

const kept = (key: string, make: () => HTMLCanvasElement) => {
  let url = urls.get(key);
  if (!url) urls.set(key, (url = make().toDataURL()));
  return url;
};
/** A texture as a CSS background. */
export const bg = (name: string) => `url(${kept(name, () => texture(name))})`;
/** A person's figure as a CSS background: sixteen texels by thirty-two, dressed by their name. */
export function figure(name: string) {
  const n = hash(name);
  return `url(${kept(`who:${name}`, () => painted(`who:${name}`, 16, 32, person(HAIR[n % HAIR.length], TOPS[(n >> 3) % TOPS.length], LEGS[(n >> 6) % LEGS.length])))})`;
}

// ---- Lettering: three texels by five, a row to an octal digit. ----

const FONT: Record<string, string> = {
  A: "25755", B: "65656", C: "34443", D: "65556", E: "74647", F: "74644", G: "34553", H: "55755", I: "72227", J: "11152", K: "55655", L: "44447",
  M: "57755", N: "65555", O: "25552", P: "65644", Q: "25573", R: "65655", S: "34216", T: "72222", U: "55557", V: "55552", W: "55775", X: "55255", Y: "55222", Z: "71247",
  0: "75557", 1: "26227", 2: "61247", 3: "61216", 4: "55711", 5: "74616", 6: "34757", 7: "71222", 8: "75757", 9: "75716",
  ".": "00002", ":": "02020", "%": "51245", "°": "25200", "-": "00700", ",": "00024", "'": "22000", "!": "22202", "?": "61202", "/": "11244", "+": "02720", "(": "12221", ")": "42224", "²": "61300",
};
const WORDS = 600; // how many pieces of lettering are kept: the clock alone makes a new one a minute

/** A piece of lettering as a picture's address and its size in texels, in capitals with a
 * shadow. A character the lettering has no shape for is a space (an accented letter is
 * its plain one). */
export function lettering(text: string): { src: string; w: number; h: number } {
  const s = text.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
  if (urls.size > WORDS) for (const key of [...urls.keys()].filter((k) => k.startsWith("txt:"))) urls.delete(key);
  const src = kept(`txt:${s}`, () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: Math.max(1, s.length * 4), height: 6 });
    const g = canvas.getContext("2d")!;
    // Twice: a shadow one texel down and across, then the letters.
    for (const [o, colour] of [[1, "rgba(0,0,0,.7)"], [0, "#fff"]] as const) {
      g.fillStyle = colour;
      [...s].forEach((ch, i) => [...(FONT[ch] ?? "00000")].forEach((row, y) => {
        for (let b = 0; b < 3; b++) if (Number(row) & (4 >> b)) g.fillRect(i * 4 + b + o, y + o, 1, 1);
      }));
    }
    return canvas;
  });
  return { src, w: s.length * 4, h: 6 };
}

/** A piece of lettering on the page, `k` times its usual size. */
export const say = (text: string, k = 1) => html`<img src=${lettering(text).src} alt=${text} style="--k:${k}" />`;
