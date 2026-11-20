// The unicycle bot. It rides the floor, and reaches what is higher up on lazy tongs. A
// machine asks for it (`ask`) with a job: { x, rise, start(), work(p), done() }, where
// `p` goes from 0 to 1 as it works. Nothing waits for it. With no job it potters about
// the room attending to things that don't need it.
//
// A page with more than one floor says so (`setup`) and gives each job its `floor`; the
// bot gets from one to another by a pole at `pole`. A job may also say which way the
// bot is to `face` as it works.
window.Bot = (() => {
  const { spring, scissor, hash, toward } = Kit;
  const LIFT = 460, WORK = 1.5; // px a second rising, and seconds at a job
  // Px a second riding, how far it roams, the floor it starts on (the room's, if none is
  // given) and where the pole is.
  const roam = { speed: 260, lo: 330, hi: 1140, floor: null, pole: 0 };
  const queue = [], lean = { x: 0, v: 0 }, parts = {};
  let x = 600, y = null, h = 0, job = null, stage = "idle", t = 1.5, goal = 600, facing = 1, roll = 0, trips = 0;

  // Its origin is where the wheel meets the floor.
  // The wheel is kept out of the group that is mirrored to turn the bot round (`bot_flip`):
  // mirrored, it turned backwards whenever the bot faced left.
  const art = () => `<g data-p="bot"><g data-p="bot_lean">
    <g transform="translate(0,-9)"><g data-p="bot_wheel"><circle class="paper" r="9"/><path d="M-9,0 H9 M0,-9 V9"/></g><circle class="solid" r="1.6"/></g>
    <g data-p="bot_flip"><path class="thin" data-p="bot_sc" transform="translate(0,-18) rotate(-90)"/>
    <g data-p="bot_body"><path class="iron" d="M-9,0 h18 v-18 h-18 z"/><path class="brass" d="M-7,-18 q0,-11 7,-11 q7,0 7,11 z"/>
      <circle class="solid" cx="3" cy="-23" r="1.5"/><path d="M-3,-29 l-3,-5 h12 l-3,5"/><circle class="puff paper" cx="0" cy="-36" r="3"/>
      <path d="M-9,-12 l-7,6"/><path class="brass" d="M-21,-7 h6 v6 h-6 z"/>
      <g transform="translate(9,-12)"><g data-p="bot_arm"><path d="M0,0 l11,6 m0,0 l4,-2 m-4,2 l3,4"/></g></g></g>
    </g></g></g>`;

  function ask(j) { if (job !== j && !queue.includes(j)) queue.push(j); }
  function setup(more) { Object.assign(roam, more); x = goal = (roam.lo + roam.hi) / 2; y = roam.floor; }

  function tick(q, dt, now) {
    let riding = 0;
    t -= dt;
    y ??= Room.FLOOR;
    const elsewhere = () => job && (job.floor ?? y) !== y;

    if (stage === "idle") {
      if (queue.length) { job = queue.shift(); goal = elsewhere() ? roam.pole : job.x; stage = "ride"; }
      else if (t <= 0) { goal = roam.lo + (hash(`potter${trips++}`) % (roam.hi - roam.lo)); stage = "ride"; }
    } else if (stage === "ride") {
      const dx = goal - x, step = roam.speed * dt;
      if (Math.abs(dx) > step) { facing = Math.sign(dx); x += facing * step; riding = facing; roll += facing * step * 6.37; } // degrees, for a wheel of radius 9
      else if (elsewhere()) { x = goal; stage = "slide"; }
      else { x = goal; stage = job ? "up" : "work"; t = 0.9; facing = job?.face ?? facing; job?.start(); }
    } else if (stage === "slide") {
      // On the pole, to the job's floor, and then on to the job.
      y = toward(y, job.floor, LIFT * dt);
      if (y === job.floor) { goal = job.x; stage = "ride"; }
    } else if (stage === "up") {
      h = Math.min(job.rise, h + LIFT * dt);
      if (h >= job.rise) { stage = "work"; t = WORK; }
    } else if (stage === "work") {
      job?.work(1 - Math.max(0, t) / WORK);
      if (t <= 0) { job?.done(); stage = job ? "down" : "idle"; job = null; t = 2 + (hash(`rest${trips}`) % 30) / 10; }
    } else {
      h = Math.max(0, h - LIFT * dt);
      if (!h) { stage = "idle"; t = 1; }
    }

    // With nothing to do it rocks to and fro to stay up, as a unicyclist must.
    const idle = stage === "idle" ? Math.sin(now * 2.2) * 6 : 0, part = (name) => (parts[name] ??= q(name));
    part("bot").setAttribute("transform", `translate(${(x + idle).toFixed(1)},${y.toFixed(1)})`);
    part("bot_lean").setAttribute("transform", `rotate(${(spring(lean, riding * 10, dt, 60, 10) + idle).toFixed(1)})`);
    part("bot_flip").setAttribute("transform", `scale(${facing},1)`);
    part("bot_wheel").setAttribute("transform", `rotate(${((roll + idle * 7) % 360).toFixed(1)})`);
    part("bot_sc").setAttribute("d", scissor(10 + h, 8, 36));
    part("bot_body").setAttribute("transform", `translate(0,${(-28 - h).toFixed(1)})`);
    part("bot_arm").setAttribute("transform", `rotate(${stage === "work" ? (Math.sin(now * 18) * 30).toFixed(1) : 0})`);
  }

  return { art, ask, setup, tick };
})();
