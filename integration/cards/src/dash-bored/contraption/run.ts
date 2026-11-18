// A room's machine, put together and run: the way through as tiles on a sheet, the ducks,
// the cover over a device that has stopped answering, the small things that go wrong and
// the bot that mends them.
//
// Every tile runs on the same period, and a duck is in a tile for exactly one period, so
// all the ducks come in together and go out together: that is the machine's beat. No duck
// is ever slowed or hurried. They join the game by a hole and leave it by one (points.ts):
// that is how a stream that parts has a duck for every way, and how it comes together
// again without two ducks in one place. So that it is not all in step besides, each tile
// runs a little early or late between its two ends, each tile's duck bounces to its own
// time, and the ducks are not all one size.
//
// Only the tiles in view are worked (`look`): the rest keep their place in the period.
import { BOT, bot } from "./bot.ts";
import { faults } from "./faults.ts";
import { clamp, esc, facing, hash, move, show, spring, type Mat, type Part, type Piece } from "./kit.ts";
import { links, type Step } from "./layout.ts";
import type { Skin } from "./skins.ts";
import { atlas, measure, rebake, refresh, stills } from "./sprites.ts";
import { SAME, clear, pieces, place, put, type Pen } from "./stage.ts";
import { EDGE, S, broken, type At, type Dev, type Tile } from "./tile.ts";

export const X0 = 80; // the margin either side of the tiles
const POLE = 66; // where the bot's pole is in it
const DUCK = `<ellipse class="duck" cy="-5" rx="10" ry="6"/><circle class="duck" cx="8" cy="-13" r="4.5"/>
  <path class="flame" d="M12,-14 l6,1.5 l-6,1.5 z"/><circle class="solid" cx="9" cy="-14" r="1"/>`;
const HAT = `<path class="solid" d="M3,-18 h10 M5,-18 v-8 h6 v8 z"/>`; // one duck wears a hat
const HATTED = 11; // one in this many
const duck = (hat: string) => `<g data-p="body" data-ring="24"><g transform="scale(1.6)">${DUCK}${hat}</g></g>`;

/** A device's cover (tile.ts): `fell` is how far its sheet has dropped into place, `pull`
 * how far the bot has pulled it off, and `shake` how long its sign has left to shake. */
type Cover = { through(p: number): At; out: Part; lump: Part; sign: Part; on: boolean; fell: number; pull: number; shake: number };
/** A tile on the sheet. `on` is which way its duck goes this period, `away` since when
 * its device has not answered, `sheeted` whether its dust sheet is on, and `tubed` whether
 * this period's duck goes through the tube. `bend` is how far it runs ahead of the period
 * in the middle of it (or behind, below nought): by a fifth at most, or its duck would
 * have to go backwards. `rate` and `lag` are its own clock, for whatever in it bounces.
 * `ins` is how many ways in it has, `next` where each way out leads (layout.ts `links`),
 * and `turn` how many periods it has seen, by which a tile with several ways takes turns. */
export type Cell = {
  col: number; row: number; x: number; y: number; tile: Tile; d?: Dev; flip: boolean; m: Mat; plain: Mat; turned: ReturnType<typeof facing>;
  on: boolean; away: string; sheeted: boolean; tubed: boolean; seen: boolean; p: number; bend: number; rate: number; lag: number;
  ins: number; next: { to: Cell; from: number }[]; turn: number; stills: Piece[]; tops: Part[]; q(name: string): Part; cover?: Cover;
};
/** A duck: the tile it is in, the way it came in by and the way it is to go out by (-1: by the tile's hole). */
type Duck = { cell: Cell; from: number; to: number; x: number; y: number; facing: number; size: number; body: Part };

const mode = (c: Cell) => (c.d ? (c.tile.mode ? c.tile.mode() : c.d.on) : false);
/** A part of a drawing by its name. A name nothing has is a mistake in a tile. */
const finder = (named: Map<string, Part>, where: string) => (name: string) => {
  const part = named.get(name);
  if (!part) throw new Error(`Contraption: ${where} has no part called "${name}"`);
  return part;
};

export class Machine {
  cells: Cell[];
  wide: number; // the sheet, in the drawing's units
  high: number;
  made = { pages: 0, px: 0 }; // what the atlas came to
  ready = false; // the atlas is made
  private ducks: Duck[] = [];
  private bodies!: [plain: Part, hatted: Part];
  private born = 0; // how many ducks there have been
  private all: Piece[];
  private margins: Piece[];
  private zz: Part;
  private honk: Part;
  private extras: Part[];
  private bot: ReturnType<typeof bot>;
  private loose: (dt: number, now: number) => void;
  private queue: Promise<unknown> = Promise.resolve();
  private scale = 1;
  private skin!: Skin;
  private steam = { x: 1, v: 0 };
  private ph = 0;
  private was = 0;
  private goose?: Duck;
  private lap = 0;
  private honking = 0;
  private silly = 12;
  private sillies = 0;

  /** `bench` is the page's unseen drawing, where the tiles are measured. `period` is the
   * seconds a duck spends in a tile, and `fail` is told of a bitmap that could not be made. */
  constructor(private bench: SVGSVGElement, way: Step[], devs: Map<string, Dev>, title: string, private period: number, private fail: (err: unknown) => void) {
    const { io, next } = links(way), top = Math.min(...way.map((s) => s.row));
    const cells = (this.cells = way.map(({ col, row, tile, flip }, i): Cell => {
      const x = X0 + col * S, y = (row - top) * S, m: Mat = flip ? [-1, 0, 0, 1, x + S, y] : [1, 0, 0, 1, x, y];
      return {
        col, row, x, y, tile, d: tile.device ? devs.get(tile.device) : undefined, flip, m, plain: [1, 0, 0, 1, x, y], turned: facing(m),
        on: false, away: "", sheeted: false, tubed: false, seen: true, p: 0,
        bend: tile.steady ? 0 : ((hash(`bend${i}`) % 401) - 200) / 1000, rate: 0.85 + (hash(`rate${i}`) % 300) / 1000, lag: hash(`lag${i}`) % 7,
        ins: io[i].ins.length, next: [], turn: 0, stills: [], tops: [], q: undefined!,
      };
    }));
    cells.forEach((c, i) => (c.next = next[i].map(({ to, from }) => ({ to: cells[to], from }))));
    for (const c of cells) c.on = mode(c);
    this.wide = (Math.max(...cells.map((c) => c.col)) + 1) * S + 2 * X0;
    this.high = Math.max(...cells.map((c) => c.y)) + S;
    const { wide, high } = this;

    // ---- The drawing, on the bench: each tile's still and moving layers and its cover
    // (drawn for the edges its ducks really use), then what belongs to the whole sheet.
    const covers = cells.map((c, i) => (c.d ? broken(c.d, EDGE[io[i].ins[0]], EDGE[io[i].outs[0]]) : undefined));
    const wrong = faults(cells);
    bench.innerHTML = cells.map((c, i) => `<g data-cell="${i}"><g data-still>${c.tile.still ?? ""}</g><g data-live>${c.tile.live ?? ""}</g><g data-cover>${covers[i]?.art ?? ""}</g></g>`).join("")
      + `<g data-extra="duck">${duck("")}</g><g data-extra="hat">${duck(HAT)}</g><g data-extra="faults">${wrong.art}</g><g data-extra="bot">${BOT}</g>
        <g data-extra="words"><text data-p="zz" class="small said" x="8" y="-34">z z z</text><text data-p="honk" class="said" text-anchor="middle">HONK</text></g>
        <g data-margin="left"><path d="M${POLE},0 V${high}"/><text class="title" x="44" y="${high / 2}" transform="rotate(-90 44 ${high / 2})" text-anchor="middle">Fig. 3. ${esc(title)}</text></g>
        <g data-margin="right"><text data-note x="${wide - 40}" y="${high / 2}" transform="rotate(90 ${wide - 40} ${high / 2})" text-anchor="middle"></text></g>`;
    const group = (name: string) => bench.querySelector<SVGGraphicsElement>(`[data-${name}]`)!;

    cells.forEach((c, i) => {
      const still = bench.querySelector<SVGGraphicsElement>(`[data-cell="${i}"] [data-still]`)!;
      // Words in a mirrored tile are turned back, each about its own place, to be read.
      if (c.flip) for (const words of still.querySelectorAll("text")) words.setAttribute("transform", `translate(${2 * Number(words.getAttribute("x") ?? 0)},0) scale(-1,1)`);
      if (c.tile.still) c.stills = stills(still, c.tile.span ?? 1);

      const live = measure(bench.querySelector<SVGGraphicsElement>(`[data-cell="${i}"] [data-live]`)!, c.flip);
      c.tops = live.tops;
      c.q = finder(live.named, `the tile at column ${c.col}, row ${c.row}`);

      if (!covers[i]) return;
      const q = finder(measure(bench.querySelector<SVGGraphicsElement>(`[data-cell="${i}"] [data-cover]`)!).named, "a cover");
      c.cover = { through: covers[i].through, out: q("out"), lump: q("lump"), sign: q("sign"), on: false, fell: 1, pull: 0, shake: 0 };
    });

    const plain = measure(group('extra="duck"')).tops[0], hatted = measure(group('extra="hat"')).tops[0];
    this.bodies = [plain, hatted];
    // To begin with every tile is as it would be in the middle of a long run: a duck from each way in.
    for (const c of cells) this.deal(c, Array.from({ length: c.ins }, (_, from) => this.hatch(c, from)));
    const words = measure(group('extra="words"')), others = measure(group('extra="faults"')), rider = measure(group('extra="bot"'));
    this.zz = words.named.get("zz")!;
    this.honk = words.named.get("honk")!;
    this.extras = [...others.tops, ...rider.tops];

    // The bot rides along the foot of each row, and changes rows by the pole in the margin.
    this.bot = bot(finder(rider.named, "the bot"), { speed: 420, lo: X0 + 20, hi: wide - X0 - 20, floor: high - 4, pole: POLE });
    this.loose = wrong.start(finder(others.named, "the faults"), this.bot.ask);

    this.margins = [{ markup: "", box: [0, 0, X0, high], from: group('margin="left"') }, { markup: "", box: [wide - X0, 0, X0, high], from: group('margin="right"') }];
    this.margins.forEach(refresh);
    this.all = [...this.margins, ...cells.flatMap((c) => [...c.stills, ...c.tops.flatMap(pieces), ...(c.cover ? pieces(c.cover.out) : [])]),
      ...[plain, hatted, ...words.tops, ...this.extras].flatMap(pieces)];
  }

  /** A new duck in a tile, come in by the way `from` (-1: up out of the tile's hole). */
  private hatch(cell: Cell, from: number): Duck {
    const n = this.born++;
    const duck = { cell, from, to: 0, x: cell.x + S / 2, y: cell.y + S / 2, facing: 1, size: 0.9 + (hash(`size${n}`) % 21) / 100, body: { ...this.bodies[n % HATTED === 3 ? 1 : 0] } };
    this.ducks.push(duck);
    return duck;
  }

  /** Say which way each duck that has just come into a tile is to go out, and bring up
   * the ducks that join the game there. A tile with no way in is where they all join.
   * One with several ways out sends the duck that came out by each in turn, and a spare
   * joins for each of the others. One with several ways in lets the duck from each go on
   * in turn, and the others leave. One with no way out is where they all leave. */
  private deal(c: Cell, here: Duck[]) {
    const outs = c.next.length;
    if (!c.ins) here = [this.hatch(c, -1)];
    if (outs > 1) {
      const sent = c.turn % outs;
      here[0].to = sent;
      for (let way = 0; way < outs; way++) if (way !== sent) this.hatch(c, -1).to = way;
    } else for (const k of here) k.to = outs && (c.ins < 2 || k.from === c.turn % c.ins) ? 0 : -1;
  }

  /** Do one thing to the atlas after another: a bitmap made again must not land in an atlas that is being replaced. */
  private todo(job: () => Promise<unknown>) {
    this.queue = this.queue.then(job).catch(this.fail);
    return this.queue;
  }

  /** Make every bitmap, `scale` px to the drawing's unit, in `skin`. */
  bake(scale: number, skin: Skin) {
    return this.todo(async () => {
      this.made = await atlas(this.all, scale, skin);
      Object.assign(this, { scale, skin, ready: true });
    });
  }

  /** A piece's drawing has changed on the bench: its bitmap is made again. */
  private again(...changed: Piece[]) {
    changed.forEach(refresh);
    this.todo(() => Promise.all(changed.map((piece) => rebake(piece, this.scale, this.skin))));
  }

  /** What a device is doing, under its name. The words are in a still drawing, which is made again for them. */
  caption(id: string, words: string) {
    const line = this.bench.querySelector(`[data-cap="${CSS.escape(id)}"] .state`);
    if (!line || line.textContent === words) return;
    line.textContent = words;
    this.again(...this.cells[Number(line.closest<SVGElement>("[data-cell]")!.dataset.cell)].stills);
  }

  /** The room's air, up the right-hand margin. */
  note(words: string) {
    const line = this.bench.querySelector("[data-note]")!;
    if (line.textContent === words) return;
    line.textContent = words;
    this.again(this.margins[1]);
  }

  /** A light's colour, for its glow. */
  glow(id: string, colour = "") {
    const lit = this.bench.querySelector<SVGElement>(`[data-glow="${CSS.escape(id)}"]`), c = this.cells.find((cell) => cell.d?.id === id);
    if (!lit || !c || lit.style.getPropertyValue("--lit") === colour) return;
    lit.style.setProperty("--lit", colour);
    this.again(...c.q("glow").looks);
  }

  /** A device stops answering (`away` is since when), or answers again. The sheet goes on
   * at once. It comes off when the bot has been round to pull it: until then its sign
   * says that the device is back. `now`: it was so when the page came, so nothing drops. */
  answers(id: string, away: string, now = false) {
    const c = this.cells.find((cell) => cell.d?.id === id), cover = c?.cover;
    if (!c || !cover || !away === !c.away) return;
    c.away = away;
    const sign = this.bench.querySelector(`[data-sign="${CSS.escape(id)}"]`)!;
    sign.querySelector("[data-word]")!.textContent = away ? "OUT OF ORDER" : "BACK IN ORDER";
    sign.querySelector("[data-since]")!.textContent = away ? `since ${away}` : "sheet coming off";
    this.again(...cover.sign.looks);

    if (away) {
      Object.assign(c, { sheeted: true, tubed: c.tubed || now });
      Object.assign(cover, { pull: 0, on: now });
      return;
    }
    this.bot.ask({
      x: c.x + S / 2 - 18, face: 1, floor: c.y + S - 4, rise: 170,
      start() {},
      // Should the device have stopped again by the time the bot gets here, it leaves the sheet be.
      work: (p) => void (c.away || (cover.pull = p)),
      done: () => void (c.away || (c.sheeted = false)),
    });
  }

  /** A press on a device that is not answering shakes its sign. */
  shake(id: string) {
    const cover = this.cells.find((c) => c.d?.id === id)?.cover;
    if (cover) cover.shake = 0.35;
  }

  /** Which tiles are in view, from the part of the sheet that is (in the drawing's units).
   * Worked out when the view changes, never frame by frame. A tile counts as in view a
   * tile's width before it gets there, so that a duck is already moving as it comes on. */
  look(left: number, right: number, top: number, foot: number) {
    for (const c of this.cells) {
      const wide = (c.tile.span ?? 1) * S, x = c.flip ? c.x + S - wide : c.x;
      c.seen = x < right + S && x + wide > left - S && c.y < foot + S && c.y + S > top - S;
    }
  }

  get seen() {
    return this.cells.filter((c) => c.seen).length;
  }

  /** One frame. `stale`: there is no word from the house, so the ducks slow to a stop where they are and go to sleep. */
  frame(pen: Pen, dt: number, now: number, stale: boolean) {
    const { cells } = this, fresh = clamp(spring(this.steam, stale ? 0 : 1, dt, 6, 5)), step = dt * fresh;

    // When the period comes round, each duck goes on to the tile its way out leads to (or
    // has left the game), and each tile fixes which way its new ducks are to go.
    this.ph += step / this.period;
    const p = this.ph % 1;
    if (p < this.was) {
      const arrived = new Map<Cell, Duck[]>(cells.map((c) => [c, []]));
      this.ducks = this.ducks.filter((k) => k.to >= 0);
      for (const k of this.ducks) {
        const way = k.cell.next[k.to];
        Object.assign(k, { cell: way.to, from: way.from });
        arrived.get(way.to)!.push(k);
      }
      for (const c of cells) {
        Object.assign(c, { on: mode(c), tubed: c.sheeted, turn: c.turn + 1 });
        this.deal(c, arrived.get(c)!);
      }
    }
    this.was = p;

    clear(pen);
    for (const margin of this.margins) put(pen, margin, SAME);
    for (const c of cells) if (c.seen) for (const still of c.stills) put(pen, still, c.m, c.turned);

    // A tile is covered from the moment its device stops answering until the bot has
    // pulled the sheet off and the last duck sent through its tube is out. Under the
    // sheet the machine stands still, unless it is a wide one that others share.
    for (const c of cells) {
      c.p = p + c.bend * Math.sin(Math.PI * p);
      if (!c.seen) continue;
      if (!(c.tubed || c.sheeted) || c.tile.wide) c.tile.pose?.(c.q, { p: c.p, on: c.on, dt: step, now: now * c.rate + c.lag, from: 0, to: 0, turn: c.turn });
      for (const part of c.tops) place(pen, part, c.m);
    }
    for (const c of cells) if (c.cover) this.covered(pen, c, c.cover, dt);

    for (const k of this.ducks) {
      const c = k.cell;
      if (!c.seen) continue;
      const at = c.tubed ? c.cover!.through(c.p) : c.tile.duck({ p: c.p, on: c.on, dt: step, now: now * c.rate + c.lag, from: k.from, to: k.to, turn: c.turn });
      // A mirrored tile's duck is mirrored with it; the tube is not, being drawn for the edges.
      const over = c.flip && !c.tubed, x = c.x + (over ? S - at.x : at.x), y = c.y + at.y, big = k.size * (k === this.goose ? 1.5 : 1);
      if (Math.abs(x - k.x) > 0.4) k.facing = Math.sign(x - k.x);
      Object.assign(k, { x, y });
      if (at.o === 0) continue;

      // Squashed (the mangle) and turned (the toaster) are never both at once: a bitmap
      // turned ahead of time can only be squashed square to the screen.
      Object.assign(k.body, { x, y, deg: (at.r ?? 0) * (over ? -1 : 1), sx: k.facing * (at.sx ?? 1) * big, sy: (at.sy ?? 1) * big });
      place(pen, k.body, SAME);
      if (fresh < 0.5) {
        move(this.zz, x, y);
        place(pen, this.zz, SAME, 1 - 2 * fresh);
      }
    }

    // Something silly, every half minute or so: one of the ducks is a goose for a while.
    if ((this.silly -= step) < 0) {
      this.goose = this.ducks[hash(`goose${this.sillies}`) % this.ducks.length];
      this.lap = this.period * 12;
      this.honking = 1.4;
      this.silly = 25 + (hash(`silly${this.sillies++}`) % 20);
    }
    if (this.goose && (this.lap -= step) < 0) this.goose = undefined;
    this.honking = Math.max(0, this.honking - dt);
    if (this.goose && this.honking && this.goose.cell.seen) {
      move(this.honk, this.goose.x, this.goose.y - 56);
      place(pen, this.honk, SAME);
    }

    this.loose(step, now);
    this.bot.tick(step, now);
    for (const part of this.extras) place(pen, part, SAME);
  }

  /** A device's cover, if it is on: the sheet dropping into place or being pulled off, the duck as a lump in the tube, and the sign. */
  private covered(pen: Pen, c: Cell, cover: Cover, dt: number) {
    const on = c.tubed || c.sheeted;
    if (on && !cover.on) cover.fell = 0;
    cover.on = on;
    if (!on || !c.seen) return;

    cover.fell = Math.min(1, cover.fell + dt / 0.45);
    move(cover.out, 0, -60 * (1 - cover.fell) ** 2 - 70 * cover.pull);
    show(cover.out, cover.fell * (1 - cover.pull));
    show(cover.lump, c.tubed ? 1 : 0);
    if (c.tubed) {
      const at = cover.through(c.p);
      move(cover.lump, at.x, at.y);
    }
    cover.shake = Math.max(0, cover.shake - dt);
    move(cover.sign, Math.sin(cover.shake * 36) * 5 * Math.min(1, cover.shake * 6), 0);
    place(pen, cover.out, c.plain);
  }
}
