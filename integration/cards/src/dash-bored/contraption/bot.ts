// The unicycle bot. It rides the floor of a row, and reaches what is higher up on lazy
// tongs. Something asks for it (`ask`) with a job: where, how high, and what to do as it
// works, `p` going from 0 to 1. Nothing waits for it. With no job it potters about
// attending to things that don't need it. It gets from one row's floor to another by the
// pole in the sheet's margin.
import { draw, hash, move, scissor, spring, toward, turn, type Part } from "./kit.ts";

export type Job = { x: number; floor: number; rise: number; face?: number; start(): void; work(p: number): void; done(): void };
/** Px a second riding, how far it roams, the floor it starts on and where the pole is. */
type Roam = { speed: number; lo: number; hi: number; floor: number; pole: number };
const LIFT = 460, WORK = 1.5; // px a second rising, and seconds at a job

// Its origin is where the wheel meets the floor. The wheel is kept out of the group that
// is mirrored to turn the bot round (`bot_flip`): mirrored, it turned backwards whenever
// the bot faced left. The body and the arm lean with the bot, so they are rings too.
export const BOT = `<g data-p="bot"><g data-p="bot_lean">
  <g transform="translate(0,-9)"><g data-p="bot_wheel" data-ring="90:18"><circle class="paper" r="9"/><path d="M-9,0 H9 M0,-9 V9"/><circle class="solid" r="1.6"/></g></g>
  <g data-p="bot_flip"><g transform="translate(0,-18) rotate(-90)"><path class="thin" data-p="bot_sc"/></g>
  <g data-p="bot_body" data-ring="-24..24:25"><path class="iron" d="M-9,0 h18 v-18 h-18 z"/><path class="brass" d="M-7,-18 q0,-11 7,-11 q7,0 7,11 z"/>
    <circle class="solid" cx="3" cy="-23" r="1.5"/><path d="M-3,-29 l-3,-5 h12 l-3,5"/>
    <path d="M-9,-12 l-7,6"/><path class="brass" d="M-21,-7 h6 v6 h-6 z"/>
    <g transform="translate(9,-12)"><g data-p="bot_arm" data-ring="-60..60:41"><path d="M0,0 l11,6 m0,0 l4,-2 m-4,2 l3,4"/></g></g></g>
  </g></g></g>`;

/** A bot on a sheet. `q` finds its parts; `tick` is one frame of it. */
export function bot(q: (name: string) => Part, roam: Roam) {
  const queue: Job[] = [], lean = { x: 0, v: 0 };
  let x = (roam.lo + roam.hi) / 2, y = roam.floor, h = 0, job: Job | null = null, stage = "idle", t = 1.5, goal = x, facing = 1, roll = 0, trips = 0;
  const elsewhere = () => !!job && job.floor !== y;

  function ask(j: Job) {
    if (job !== j && !queue.includes(j)) queue.push(j);
  }

  function tick(dt: number, now: number) {
    let riding = 0;
    t -= dt;

    if (stage === "idle") {
      if (queue.length) {
        job = queue.shift()!;
        goal = elsewhere() ? roam.pole : job.x;
        stage = "ride";
      } else if (t <= 0) {
        goal = roam.lo + (hash(`potter${trips++}`) % (roam.hi - roam.lo));
        stage = "ride";
      }
    } else if (stage === "ride") {
      const dx = goal - x, step = roam.speed * dt;
      if (Math.abs(dx) > step) {
        facing = Math.sign(dx);
        x += facing * step;
        riding = facing;
        roll += facing * step * 6.37; // degrees, for a wheel of radius 9
      } else if (elsewhere()) {
        x = goal;
        stage = "slide";
      } else {
        x = goal;
        stage = job ? "up" : "work";
        t = 0.9;
        facing = job?.face ?? facing;
        job?.start();
      }
    } else if (stage === "slide") {
      // On the pole, to the job's floor, and then on to the job.
      y = toward(y, job!.floor, LIFT * dt);
      if (y === job!.floor) {
        goal = job!.x;
        stage = "ride";
      }
    } else if (stage === "up") {
      h = Math.min(job!.rise, h + LIFT * dt);
      if (h >= job!.rise) {
        stage = "work";
        t = WORK;
      }
    } else if (stage === "work") {
      job?.work(1 - Math.max(0, t) / WORK);
      if (t <= 0) {
        job?.done();
        stage = job ? "down" : "idle";
        job = null;
        t = 2 + (hash(`rest${trips}`) % 30) / 10;
      }
    } else {
      h = Math.max(0, h - LIFT * dt);
      if (!h) {
        stage = "idle";
        t = 1;
      }
    }

    // With nothing to do it rocks to and fro to stay up, as a unicyclist must.
    const idle = stage === "idle" ? Math.sin(now * 2.2) * 6 : 0;
    move(q("bot"), x + idle, y);
    turn(q("bot_lean"), spring(lean, riding * 10, dt, 60, 10) + idle);
    q("bot_flip").sx = facing;
    turn(q("bot_wheel"), roll + idle * 7);
    draw(q("bot_sc"), scissor(10 + h, 8, 36));
    move(q("bot_body"), 0, -28 - h);
    turn(q("bot_arm"), stage === "work" ? Math.sin(now * 18) * 30 : 0);
  }

  return { ask, tick };
}
