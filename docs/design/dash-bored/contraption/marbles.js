// The marble return. A marble that has run its ramps drops through the floor into the
// gutter under its bay and rolls to the pipe down the left of the works. Each bay has a
// sump beside the pipe, and a gate that turns a falling marble into it. The marble then
// asks for the bot, which carries it back up (bot.js).
//
// Which gate is shut depends on what is on screen: the one at the lowest sump in view,
// so a marble always comes to rest where it can be seen. Scrolling knocks every gate
// about before they settle. The bottom gate is always shut, so no marble is lost.
//
// The gutters run along each row's floor and the pipe down the side, so this works
// however the cells wrap. Marbles, sumps and gates are placed within the works, as the
// bot is.
window.Marbles = (() => {
  const { hash, spring } = Kit;
  const ROLL = 300, FALL = 1100, PIPE = -8, SHUT = 38; // px a second along a gutter and down the pipe; a shut gate's angle
  const rolling = [], sumps = [];
  let works;

  // A sump and its gate for each bay, at the floor of the bay's last row.
  function lay(into) {
    works = into;
    for (const bay of works.querySelectorAll(".bay")) {
      const last = bay.lastElementChild, y = last.offsetTop + (186 * last.offsetWidth) / 200 + 9;
      works.insertAdjacentHTML("beforeend", `<div class="sump" style="top:${y - 7}px"></div><div class="gate" style="top:${y - 26}px"></div>`);
      sumps.push({ y, gate: works.lastElementChild, shut: false, swing: { x: 0, v: 0 } });
    }
    addEventListener("scroll", aim, { passive: true });
    aim();
  }

  // Shut the gate of the lowest sump in view, and knock them all: by how much is fixed
  // by where the page has been scrolled to, so it looks like chance and isn't.
  function aim() {
    const top = works.getBoundingClientRect().top, seen = sumps.filter((s) => top + s.y > 0 && top + s.y < innerHeight);
    const target = seen.at(-1) ?? sumps.at(-1);
    sumps.forEach((s, i) => {
      s.shut = s === target || s === sumps.at(-1);
      s.swing.v += ((hash(`${i}:${Math.round(scrollY / 30)}`) % 200) - 100) / 25;
    });
  }

  // A cell's marble: at `home` it is the one drawn in the cell's own ramps, and this one
  // is hidden. `sump` is the one it came to rest in.
  function make() {
    const el = document.createElement("i");
    el.className = "marble";
    works.append(el);
    return { el, x: 0, y: 0, path: [], state: "home", sump: null };
  }

  function place(m, x, y) {
    m.x = x; m.y = y;
    m.el.style.transform = `translate(${(x - 4).toFixed(1)}px,${(y - 4).toFixed(1)}px)`;
    m.el.style.opacity = m.state === "home" ? 0 : 1;
  }

  // Out of the cup of cell `c` (drawn 200 wide, perhaps shown smaller) and as far as
  // the pipe. Which sump it falls to is settled when it gets there (`fall`).
  function drop(c) {
    const k = c.el.offsetWidth / 200, gutter = c.el.offsetTop + 191 * k, m = c.marble;
    m.state = "rolling";
    place(m, c.el.offsetLeft + 113 * k, c.el.offsetTop + 155 * k);
    m.path = [{ x: m.x, y: gutter }, { x: PIPE, y: gutter, pipe: true }];
    rolling.push(c);
  }

  // Down the pipe to the first shut gate below, and off it into that sump.
  function fall(m) {
    m.sump = sumps.find((s) => s.y > m.y && s.shut);
    m.path.push({ x: PIPE, y: m.sump.y - 12 }, { x: PIPE - 12, y: m.sump.y });
  }

  function tick(dt) {
    for (const s of sumps) s.gate.style.transform = `rotate(${(SHUT * spring(s.swing, s.shut ? 1 : 0, dt, 90, 7)).toFixed(1)}deg)`;

    for (const c of [...rolling]) {
      const m = c.marble, to = m.path[0], dx = to.x - m.x, dy = to.y - m.y, far = Math.hypot(dx, dy), step = (dx ? ROLL : FALL) * dt;
      if (far > step) { place(m, m.x + (dx / far) * step, m.y + (dy / far) * step); continue; }

      place(m, to.x, to.y);
      m.path.shift();
      if (to.pipe) fall(m);
      if (!m.path.length) { m.state = "sump"; rolling.splice(rolling.indexOf(c), 1); Bot.ask(c); }
    }
  }

  return { lay, make, place, drop, tick };
})();
