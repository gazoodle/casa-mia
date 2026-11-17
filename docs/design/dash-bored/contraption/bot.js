// The unicycle bot. It rides the floor of each bay, goes between floors by the pole on
// the left, and puts right what the machine has used up: it stands dominoes back up,
// carries the marble to the top and ties a new string. It also goes to look at anything
// that is out of order, which it can't mend.
//
// A cell asks for it (`ask`). Nothing waits for it: a linkage that hasn't been reset is
// passed over by the cell's boxing glove (machine.js `fire`).
window.Bot = (() => {
  const { clamp, spring } = Kit;
  const POLE = -16, SPEED = 320, SLIDE = 1000, FLOOR = 186, WORK = 1.2; // px a second: riding, and on the pole
  const queue = [], lean = { x: 0, v: 0 };
  let el, q, x = 40, y = FLOOR, path = [], job = null, work = 0, facing = 1, roll = 0;

  // Where it stands to work on a cell, within the works.
  // A cell is drawn 200 wide and may be shown smaller.
  const spot = (c) => ({ x: c.el.offsetLeft + 78, y: c.el.offsetTop + (FLOOR * c.el.offsetWidth) / 200 });

  function build(into, first) {
    el = document.createElement("div");
    el.className = "bot";
    el.innerHTML = `<svg class="ink" width="46" height="62" viewBox="0 0 46 62"><g data-p="lean">
      <path d="M23,52 V34"/><path class="hatch" d="M15,16 h16 v18 h-16 z"/>
      <path class="fill" d="M17,16 q0,-10 6,-10 q6,0 6,10 z"/><circle class="solid" cx="26" cy="11" r="1.6"/>
      <path d="M20,6 l-3,-5 h12 l-3,5"/><circle class="puff fill" cx="23" cy="0" r="3"/>
      <path d="M15,22 L8,28"/><path class="fill" d="M3,27 h6 v6 h-6 z"/>
      <g transform="translate(31,22)"><g data-p="arm"><path d="M0,0 L11,6 M11,6 l4,-2 M11,6 l3,4"/></g></g>
      <g transform="translate(23,52)"><g data-p="wheel"><circle class="fill" r="8"/><path d="M-8,0 H8 M0,-8 V8"/></g><circle class="solid" r="1.5"/></g>
      </g></svg>`;
    into.append(el);
    q = (name) => el.querySelector(`[data-p="${name}"]`);
    y = spot(first).y;
  }

  const carrying = () => job?.marble?.state === "carried";

  function ask(c) { if (job !== c && !queue.includes(c)) queue.push(c); }

  function tick(dt, now) {
    let riding = 0;

    if (path.length) {
      const to = path[0], dx = to.x - x, dy = to.y - y, far = Math.hypot(dx, dy), step = (Math.abs(dx) > 1 ? SPEED : SLIDE) * dt;
      if (far <= step) {
        x = to.x; y = to.y; path.shift();
        if (to.pick) job.marble.state = "carried";
        if (!path.length) work = WORK;
      } else {
        x += (dx / far) * step; y += (dy / far) * step;
        if (Math.abs(dx) > 1) { facing = Math.sign(dx); riding = facing; roll += step * facing * 7; }
      }
    } else if (job) {
      // At work. A linkage runs backwards under its spanner; a marble is put back at
      // the top of its ramps.
      work -= dt;
      if (job.spent) { job.run = -1; if (!carrying()) job.p = clamp(work / WORK); }
      if (work <= 0) {
        if (carrying()) { job.marble.state = "home"; Marbles.place(job.marble, 0, 0); }
        if (job.spent) { job.spent = false; job.run = 0; job.p = 0; }
        job = null;
      }
    } else if (queue.length) {
      // To a cell: along this floor, or by the pole to another. For a marble, by way
      // of the sump it lies in, to pick it up.
      job = queue.shift();
      const to = spot(job), pole = (at) => ({ x: POLE, y: at });
      if (job.marble?.state === "sump") path = [pole(y), { ...pole(job.marble.sump.y), pick: true }, pole(to.y), to];
      else path = Math.abs(to.y - y) < 4 ? [to] : [pole(y), pole(to.y), to];
    }
    if (carrying()) Marbles.place(job.marble, x + 12 * facing, y - 34);

    // With nothing to do it rocks to and fro to stay up, as a unicyclist must.
    const idle = !path.length && !job ? Math.sin(now * 2.2) * 6 : 0;
    el.style.transform = `translate(${(x - 23 + idle).toFixed(1)}px,${(y - 60).toFixed(1)}px)`;
    q("lean").setAttribute("transform", `translate(23,52) rotate(${(spring(lean, riding * 10, dt, 60, 10) + idle).toFixed(1)}) scale(${facing},1) translate(-23,-52)`);
    q("wheel").setAttribute("transform", `rotate(${((roll + idle * 7) % 360).toFixed(1)})`);
    q("arm").setAttribute("transform", `rotate(${job && !path.length ? (Math.sin(now * 18) * 30).toFixed(1) : 0})`);
  }

  return { build, ask, tick };
})();
