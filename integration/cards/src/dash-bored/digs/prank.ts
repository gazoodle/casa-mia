// Digs' prank: every few minutes an imp turns up with a crate of TNT, puts it down, runs
// off and blows a hole in the place, and a repair bot flies in and mends it block by
// block. It is a show and nothing else: it takes no press, covers no device's block, and
// changes nothing in the house. The imp, the crate and the bot are our own drawings.
// The board in the garden, "Follow the imp", gives him GOES goes one after another,
// anywhere in the house, with the view after him; the last crate he puts down by the
// board itself, which goes up with it and so is switched off (owner, 2026-11-20).
import { html, nothing } from "lit";
import { bg } from "./textures.ts";
import { boards, type World } from "./world.ts";

export type Cell = { x: number; y: number };
/** One prank: where the crate is put, where the imp runs to, and the blocks it breaks. */
export type Plan = { tnt: Cell; imp: Cell; holes: Cell[] };

const FIRST = 20_000; // ms: the first prank after the page is opened
const [SOONEST, LATEST] = [180_000, 360_000]; // ms: between one prank and the next
// ms into a prank: the crate is put down and the imp runs, it goes off, the imp has had
// its laugh, the bot arrives, and how long the bot takes over each block.
const [DOWN, BANG, LAUGHED, BOT, MEND] = [1200, 4200, 5000, 7000, 800];
const RUN = 3; // blocks: how far the imp runs from its crate
export const GOES = 5; // pranks the board asks for
const SOON = 3000; // ms: between one of them and the next
const DEBRIS = ["#b98a4e", "#868686", "#7a5536", "#9a3b2e", "#ffd83a", "#26262a", "#b98a4e", "#868686"];

/** Where a prank happens. The crate stands on a room's floor or on the grass, where
 * nothing else is, and between the columns `from` and `to` (what is on the screen) if it
 * can. It breaks the blocks round it, never one that a device, a sign or a post has. */
export function plan(world: World, from: number, to: number, random: () => number): Plan | undefined {
  const taken = new Set<string>();
  const take = (x: number, y: number) => taken.add(`${x},${y}`);
  for (const { x, y, h, w = 1 } of world.slots.values()) for (let i = 0; i < h; i++) for (let k = 0; k < w; k++) take(x + k, y + i);
  for (const [, x, y] of world.deco) take(x, y);
  for (const { x, y } of boards(world)) take(x, y);

  // Each place a crate can stand, with how far along its floor the imp can run.
  const open = Array.from({ length: world.w }, (_, x) => x).filter((x) => !world.blocks[world.ground - 1][x]);
  const spots = [
    ...world.zones.flatMap((z) => Array.from({ length: z.x1 - z.x0 + 1 }, (_, i) => ({ x: z.x0 + i, y: z.y1, min: z.x0, max: z.x1 }))),
    ...open.map((x) => ({ x, y: world.ground - 1, min: Math.min(...open), max: Math.max(...open) })),
  ].filter((s) => !taken.has(`${s.x},${s.y}`));
  const seen = spots.filter((s) => s.x >= from && s.x <= to);
  const pool = seen.length ? seen : spots;
  if (!pool.length) return undefined;

  const tnt = pool[Math.floor(random() * pool.length)];
  // The imp runs to one side, or to the other if a wall is in the way.
  const side = random() < 0.5 ? -RUN : RUN;
  const run = (by: number) => Math.max(tnt.min, Math.min(tnt.max, tnt.x + by));
  const imp = { x: run(side) === tnt.x ? run(-side) : run(side), y: tnt.y };
  const near = [-1, 0, 1].flatMap((dy) => [-2, -1, 0, 1, 2].map((dx) => ({ x: tnt.x + dx, y: tnt.y + dy }))).filter((c) => Math.abs(c.x - tnt.x) < 2 || (c.y === tnt.y + 1 && random() < 0.5));
  const holes = near.filter((c) => world.blocks[c.y]?.[c.x] && !taken.has(`${c.x},${c.y}`));
  return { tnt: { x: tnt.x, y: tnt.y }, imp, holes };
}

/** What the prank needs of the element it is on. */
type Host = { after(ms: number, then: () => void): void; requestUpdate(): void; world(): World | undefined; seen(): [number, number]; still(): boolean; began(): void };
const at = (c: Cell, more = "") => `--x:${c.x};--y:${c.y};${more}`;

export class Prank {
  private _plan?: Plan;
  private _stage = 0; // 0 nothing, 1 the imp has the crate, 2 it is down and lit, 3 it has gone off, 4 the dust settles, 5 the bot is mending
  private _mended = 0; // how many of the holes the bot has mended
  private _chase = 0; // how many goes the board has still asked for
  private _blows = false; // whether this prank's crate is the board's last, by the board
  private _at?: Cell; // where the latest crate was put down: the view waits there between goes
  private _turn = 0; // which wait for the next prank is the one that counts: the board's press puts it sooner
  private _ends = 0; // ms: when the prank on now is over
  private _host: Host;

  constructor(host: Host) {
    this._host = host;
  }

  /** Begin again from nothing: the element is on the page. */
  start() {
    this._plan = this._at = undefined;
    this._stage = this._mended = this._chase = this._ends = 0;
    this._blows = false;
    this._next(FIRST);
  }

  /** The board was pressed: GOES pranks, one after another, from as soon as the one on now is over. */
  chase() {
    if (this._chase) return;
    this._chase = GOES;
    this._next(Math.max(0, this._ends - Date.now()) + SOON);
    this._host.requestUpdate();
  }

  /** How many goes the board has still asked for; one while its last is on, until it goes up. */
  get chasing() {
    return this._chase || (this._blows && this._stage > 0 && this._stage < 3 ? 1 : 0);
  }

  /** Whether the board is in bits: from the bang until the bot has gone. */
  get blown() {
    return this._blows && this._stage >= 3;
  }

  /** The next prank, after `ms`, in place of any wait before it. */
  private _next(ms: number) {
    const turn = ++this._turn;
    this._host.after(ms, () => turn === this._turn && this._begin());
  }

  /** Whether the crate has just gone off: the world shakes. */
  get shaking() {
    return this._stage === 3;
  }

  /** Where the prank is, while there is one, for the view to follow (follow.ts): its crate,
   * and between the board's goes, where the last one was. */
  get spot() {
    return this._stage || this._chase ? this._at : undefined;
  }

  private _set(stage: number, mended = this._mended) {
    this._stage = stage;
    this._mended = mended;
    this._host.requestUpdate();
  }

  /** One prank, as dates coming due. Nothing happens where less movement is asked for, or with nowhere for a crate.
   * One of the board's is anywhere in the house, and its last on the grass beside the board. */
  private _begin = () => {
    const world = this._host.world();
    const last = this._chase === 1, by = world && world.chase.x + 2;
    const where: [number, number] = !world ? [0, 0] : last ? [by!, by!] : this._chase ? [0, world.w - 1] : this._host.seen();
    const found = world && !this._host.still() ? plan(world, ...where, Math.random) : undefined;
    const done = BOT + MEND * ((found?.holes.length ?? 0) + 2);
    const chased = !!found && this._chase > 0;
    this._ends = Date.now() + (found ? done : 0);
    this._next((found ? done : 0) + (chased && !last ? SOON : SOONEST + Math.random() * (LATEST - SOONEST)));
    if (!found) return;

    if (chased) this._chase--;
    this._blows = chased && last;
    this._plan = found;
    this._at = found.tnt;
    this._set(1, 0);
    this._host.began();
    for (const [ms, stage] of [[DOWN, 2], [BANG, 3], [LAUGHED, 4], [BOT, 5]]) this._host.after(ms, () => this._set(stage));
    found.holes.forEach((_, i) => this._host.after(BOT + MEND * (i + 1), () => this._set(5, i + 1)));
    // The bot flies off, and then there is nothing to show.
    this._host.after(done, () => {
      this._plan = undefined;
      this._blows = false;
      this._set(0, 0);
    });
  };

  /** The prank as it stands, to draw in the world. */
  draw() {
    const p = this._plan, stage = this._stage;
    if (!p || !stage) return nothing;
    const left = p.holes.slice(this._mended);
    // The bot hovers over the hole it is mending, and goes up and away when none is left.
    const bot = left[0] ? { x: left[0].x, y: left[0].y - 1 } : { x: p.tnt.x, y: -3 };
    return html`<div class="prank" aria-hidden="true">
      ${stage >= 3 ? left.map((c) => html`<i class="at hole" style="${at(c)}background-image:${bg("hole")}"></i>`) : nothing}
      ${stage < 3 ? html`<i class="at tnt ${stage === 2 ? "lit" : ""}" style="${at(stage === 1 ? { x: p.tnt.x, y: p.tnt.y - 1 } : p.tnt)}background-image:${bg("tnt")}"></i>` : nothing}
      ${stage < 5 ? html`<i class="at imp ${stage > 2 ? "laugh" : ""}" style="${at(stage === 1 ? p.tnt : p.imp)}background-image:${bg("imp")}"></i>` : nothing}
      ${stage === 3 ? html`<i class="at bang" style=${at(p.tnt)}>${DEBRIS.map((colour, i) => html`<b style="--a:${i * 45 + 20}deg;background:${colour}"></b>`)}</i>` : nothing}
      ${stage === 5 ? html`<i class="at bot" style="${at(bot)}background-image:${bg("bot")}"></i>` : nothing}
    </div>`;
  }
}
