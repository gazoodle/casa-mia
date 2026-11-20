// Digs' prank: every few minutes an imp turns up with a crate of TNT, puts it down, runs
// off and blows a hole in the place, and a repair bot flies in and mends it block by
// block. It is a show and nothing else: it takes no press, covers no device's block, and
// changes nothing in the house. The imp, the crate and the bot are our own drawings.
import { html, nothing } from "lit";
import { bg } from "./textures.ts";
import type { World } from "./world.ts";

export type Cell = { x: number; y: number };
/** One prank: where the crate is put, where the imp runs to, and the blocks it breaks. */
export type Plan = { tnt: Cell; imp: Cell; holes: Cell[] };

const FIRST = 20_000; // ms: the first prank after the page is opened
const [SOONEST, LATEST] = [180_000, 360_000]; // ms: between one prank and the next
// ms into a prank: the crate is put down and the imp runs, it goes off, the imp has had
// its laugh, the bot arrives, and how long the bot takes over each block.
const [DOWN, BANG, LAUGHED, BOT, MEND] = [1200, 4200, 5000, 7000, 800];
const RUN = 3; // blocks: how far the imp runs from its crate
const DEBRIS = ["#b98a4e", "#868686", "#7a5536", "#9a3b2e", "#ffd83a", "#26262a", "#b98a4e", "#868686"];

/** Where a prank happens. The crate stands on a room's floor or on the grass, where
 * nothing else is, and between the columns `from` and `to` (what is on the screen) if it
 * can. It breaks the blocks round it, never one that a device, a sign or a post has. */
export function plan(world: World, from: number, to: number, random: () => number): Plan | undefined {
  const taken = new Set<string>();
  const take = (x: number, y: number) => taken.add(`${x},${y}`);
  for (const { x, y, h, w = 1 } of world.slots.values()) for (let i = 0; i < h; i++) for (let k = 0; k < w; k++) take(x + k, y + i);
  for (const [, x, y] of world.deco) take(x, y);
  for (const { x, y } of [world.sign, { ...world.sign, x: world.sign.x + 1 }, ...[0, 1, 2].map((i) => ({ ...world.notice, x: world.notice.x + i })), ...world.signs]) take(x, y);

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
type Host = { after(ms: number, then: () => void): void; requestUpdate(): void; world(): World | undefined; seen(): [number, number]; still(): boolean };
const at = (c: Cell, more = "") => `--x:${c.x};--y:${c.y};${more}`;

export class Prank {
  private _plan?: Plan;
  private _stage = 0; // 0 nothing, 1 the imp has the crate, 2 it is down and lit, 3 it has gone off, 4 the dust settles, 5 the bot is mending
  private _mended = 0; // how many of the holes the bot has mended
  private _host: Host;

  constructor(host: Host) {
    this._host = host;
  }

  /** Begin again from nothing: the element is on the page. */
  start() {
    this._plan = undefined;
    this._stage = this._mended = 0;
    this._host.after(FIRST, this._begin);
  }

  /** Whether the crate has just gone off: the world shakes. */
  get shaking() {
    return this._stage === 3;
  }

  /** Where the prank is, while there is one, for the view to follow (follow.ts): its crate. */
  get spot() {
    return this._stage ? this._plan?.tnt : undefined;
  }

  private _set(stage: number, mended = this._mended) {
    this._stage = stage;
    this._mended = mended;
    this._host.requestUpdate();
  }

  /** One prank, as dates coming due. Nothing happens where less movement is asked for, or with nowhere for a crate. */
  private _begin = () => {
    const world = this._host.world();
    const found = world && !this._host.still() ? plan(world, ...this._host.seen(), Math.random) : undefined;
    const done = BOT + MEND * ((found?.holes.length ?? 0) + 2);
    this._host.after((found ? done : 0) + SOONEST + Math.random() * (LATEST - SOONEST), this._begin);
    if (!found) return;

    this._plan = found;
    this._set(1, 0);
    for (const [ms, stage] of [[DOWN, 2], [BANG, 3], [LAUGHED, 4], [BOT, 5]]) this._host.after(ms, () => this._set(stage));
    found.holes.forEach((_, i) => this._host.after(BOT + MEND * (i + 1), () => this._set(5, i + 1)));
    // The bot flies off, and then there is nothing to show.
    this._host.after(done, () => {
      this._plan = undefined;
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
