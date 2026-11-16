// What the mock-ups of the Console's later eras (Nixie, Bargraph, Beige) share: the panel's
// layout, both kinds of meter, the figures of a digital display, and what a press or a
// drag does. A page gives its era's look in its stylesheet, and passes `Era` the few
// controls it draws its own way. Like house.js, a plain script, so a page opens from disk.
(() => {
  const H = window.House;
  const span = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
  // The segments of a bar: as many are lit as its `--frac` says (see `.segs` below).
  const segs = (n) => span(n, (i) => `<i style="--i:${i}"></i>`);

  // A figure in seven bars, the unlit ones still there to be seen.
  const LIT = { 0: "abcdef", 1: "bc", 2: "abged", 3: "abgcd", 4: "fgbc", 5: "afgcd", 6: "afgedc", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g" };
  const seg7 = (ch) => (ch === "." ? `<i class="dp"></i>` : ch === "°" ? `<i class="deg"></i>` : ch === "%" ? `<i class="pc">%</i>`
    : `<i class="d">${[..."abcdefg"].map((s) => `<b class="s${s}${(LIT[ch] ?? "").includes(s) ? " lit" : ""}"></b>`).join("")}</i>`);

  // An invented day of a room's temperature, for the chart.
  const day = Array.from({ length: 48 }, (_, i) => 19 + 2.2 * Math.sin(((i - 14) / 48) * 2 * Math.PI) + (i % 7 === 3 ? 0.4 : 0));

  // A needle meter's scale: 33° each way of a pivot that is well below its window.
  const at = (r, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [(60 + r * Math.cos(a)).toFixed(1), (96 + r * Math.sin(a)).toFixed(1)]; };
  const arc = (r, a, b, cls) => `<path class="${cls}" d="M${at(r, a)} A${r},${r} 0 0 1 ${at(r, b)}"/>`;
  const scale = (lo, hi) => arc(80, -33, 33, "arc") + arc(77.5, 20, 33, "red") + span(21, (i) => {
    const deg = -33 + i * 3.3, [x, y] = at(68, deg);
    return `<path class="tick" d="M${at(i % 5 ? 77 : 74, deg)} L${at(80, deg)}"/>` + (i % 5 ? "" : `<text x="${x}" y="${+y + 2}">${+(lo + ((hi - lo) * i) / 20).toFixed(1)}</text>`);
  });
  const BEATS = [0.85, 1.55, 0.98, 1.33, 1.14, 0.94, 1.42, 1.07]; // s: no two needles waver in step

  const CSS = `
    * { box-sizing: border-box; } html, body { margin: 0; }
    button { all: unset; cursor: pointer; text-align: center; }
    .mock { display: flex; gap: 8px; align-items: center; padding: 6px 12px; background: #111; color: #ccc; font: 12px system-ui, sans-serif; }
    .mock button { padding: 2px 9px; border: 1px solid #666; border-radius: 3px; } .mock button[aria-pressed="true"] { background: #e9dfc3; color: #111; }
    .top, .rooms, .works, .pair, .scenes, .pushes, .alerts { display: flex; flex-wrap: wrap; }
    .top { gap: 12px; align-items: stretch; margin-bottom: 12px; } .rooms { gap: 12px; align-items: flex-start; margin: 12px 0; }
    .bay { position: relative; padding: 12px; } .room { flex: 1 1 300px; max-width: 430px; text-align: center; }
    .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
    .works { justify-content: center; align-items: flex-start; gap: 10px 12px; margin-top: 12px; }
    .pair { gap: 12px; } .scenes { gap: 10px; align-items: center; } .pushes { gap: 8px; justify-content: center; margin-top: 8px; } .alerts { gap: 10px 24px; align-items: center; }
    .label { display: block; }
    /* A swap meter is the other kind from the rest: an era may put one in now and then. */
    body[data-meters="needle"] .follow:not(.swap) .display-m, body[data-meters="needle"] .follow.swap .needle-m, body[data-meters="display"] .follow:not(.swap) .needle-m, body[data-meters="display"] .follow.swap .display-m { display: none; }

    .meter { width: 170px; margin: 0 auto; text-align: center; }
    .win { position: relative; overflow: hidden; } .win svg { display: block; width: 100%; }
    .display-m .win { aspect-ratio: 120 / 70; display: flex; flex-wrap: wrap; align-items: center; align-content: center; justify-content: center; gap: 5px 6px; }
    /* The needle is a layer of its own over a face that never changes, so that its swing
       and its waver are transforms the browser need not paint again. */
    .swing { position: absolute; inset: 0; transform-origin: 50% 137.14%; transform: rotate(calc(var(--deg, -33) * 1deg)); transition: transform 1s cubic-bezier(.3, 1.5, .5, 1); }
    .waver { height: 100%; overflow: visible; transform-origin: 50% 137.14%; animation: waver var(--beat, 1.1s) ease-in-out infinite; }
    .waver line { stroke: var(--needle, #111); stroke-width: var(--needle-w, .5); }
    @keyframes waver { 14% { transform: rotate(calc(.5deg * var(--wob, 1))); } 29% { transform: rotate(calc(-.3deg * var(--wob, 1))); } 43% { transform: rotate(calc(.7deg * var(--wob, 1))); }
      57% { transform: rotate(calc(-.6deg * var(--wob, 1))); } 71% { transform: rotate(calc(.2deg * var(--wob, 1))); } 86% { transform: rotate(calc(-.4deg * var(--wob, 1))); } }
    .face text { text-anchor: middle; }
    .cowl { position: absolute; left: 0; right: 0; bottom: 0; }

    /* A bar of segments: those below its --frac of the --n are lit. */
    .segs > i { opacity: clamp(var(--dim, .14), calc((var(--frac, 0) * var(--n) - var(--i)) * 100), 1); }
    /* Every segment is a whole number of pixels, so that no two of a kind differ in size. */
    .sweep { display: flex; align-items: flex-end; justify-content: center; gap: 2px; width: 100%; } .sweep i { flex: none; width: 4px; height: 8px; }

    .figs { display: inline-flex; align-items: flex-end; font-size: var(--fig, 22px); }
    /* --t is a bar's thickness and --h an upright's length; a figure is two uprights and three bars high. */
    .d { --t: max(1px, round(.11em, 1px)); --h: round(calc((1em - 3 * var(--t)) / 2), 1px); position: relative; width: round(.56em, 1px); height: calc(2 * var(--h) + 3 * var(--t)); margin: 0 round(.09em, 1px); transform: skewX(-5deg); }
    .d b { position: absolute; background: var(--seg-off); border-radius: .04em; } .d b.lit { background: var(--seg-on); box-shadow: var(--seg-glow, none); }
    .sa, .sg, .sd { left: var(--t); right: var(--t); height: var(--t); } .sa { top: 0; } .sg { top: calc(var(--t) + var(--h)); } .sd { bottom: 0; }
    .sf, .sb, .se, .sc { width: var(--t); height: var(--h); } .sf, .sb { top: var(--t); } .se, .sc { bottom: var(--t); } .sf, .se { left: 0; } .sb, .sc { right: 0; }
    .dp { width: .12em; height: .12em; margin: 0 .03em; border-radius: 50%; background: var(--seg-on); box-shadow: var(--seg-glow, none); }
    .deg { align-self: flex-start; width: .26em; height: .26em; margin-left: .05em; border: .07em solid var(--seg-on); border-radius: 50%; }
    .pc { margin-left: .1em; color: var(--seg-on); font: 600 .5em sans-serif; }

    .dial { width: 96px; text-align: center; } .crank, .slide { position: relative; margin: 0 auto; touch-action: none; cursor: grab; }
    .turn { position: absolute; border-radius: 50%; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .25s; } .drag .turn { transition: none; }
    .toggle { width: 78px; } .sw { position: relative; display: inline-block; }
    .wheels { display: flex; justify-content: center; margin-top: 8px; } .wheel { display: flex; flex-direction: column; align-items: center; }
    .tv { text-align: center; } .tube { position: relative; width: 150px; aspect-ratio: 4 / 3; margin: 0 auto; } .tube svg { display: block; width: 100%; height: 100%; }
    .chartbox { max-width: 520px; } .chart svg { display: block; width: 100%; }
    @media (prefers-reduced-motion: reduce) { .waver { animation: none; } }`;

  // An invented picture for a camera's screen: a figure on a path to a door.
  const PICTURE = `<svg viewBox="0 0 80 60" preserveAspectRatio="xMidYMid slice"><rect width="80" height="60" fill="#8fb4d6"/><rect y="38" width="80" height="22" fill="#6d7a4f"/><path d="M0,60 L30,38 H50 L80,60 Z" fill="#9b958a"/>
    <rect x="48" y="8" width="32" height="34" fill="#b0563c"/><rect x="58" y="20" width="12" height="22" fill="#2f4f6a"/><circle cx="30" cy="27" r="4" fill="#e8c9a8"/><path d="M24,48 Q24,32 30,32 Q36,32 36,48 Z" fill="#c33"/></svg>`;
  const ALERTS = [["critical", "Cellar: water on the floor, since 14:05"], ["warning", "Greenhouse sensor: battery low, since 09:30"]];

  function build(own) {
    // The controls, each as an era draws it unless the page gives its own.
    const E = {
      fig: seg7, // a figure of a display
      num: (ch) => ch, // a figure of the alarm's code
      up: "▲", down: "▼",
      reads: false, // whether a knob's level is also shown in figures
      meters: "needle", // the kind of meter the rooms have
      odd: 0, // every which room has the other kind: none, if 0
      label: (text) => `<span class="label">${text}</span>`,
      lights: (r) => `<div class="lights segs" data-lights="${r.id}" style="--n:10">${segs(10)}</div>`,
      level: (d) => `<div class="dial"><div class="crank ${d.kind}" data-id="${d.id}" role="slider" tabindex="0" aria-label="${d.name}"><span class="turn"></span></div>${E.reads ? `<span class="figs" data-figs-for="${d.id}"></span>` : ""}${E.label(d.name)}</div>`,
      stat: (r) => `<div class="dial stat"><div class="crank heat" data-target="${r.id}" role="slider" tabindex="0" aria-label="${r.name} heating"><span class="turn"></span></div><span class="figs" data-figs-target="${r.id}"></span>${E.label("Heating")}</div>`,
      key: "", guard: `<i class="guard"></i>`,
      toggle: (d) => `<button class="toggle${d.kind === "lock" ? " guarded" : ""}" data-id="${d.id}"><span class="sw">${E.key}${d.kind === "lock" ? E.guard : ""}</span>${E.label(d.name)}</button>`,
      scene: (s) => `<button class="scene" data-scene="${s.id}"><span class="cap">${s.name}</span></button>`,
      alert: ([level, text]) => `<div class="alert ${level}"><i class="lamp"></i><span class="msg">${text}</span></div>`,
      tv: (name) => `<div class="tv"><div class="tube">${PICTURE}</div>${E.label(name)}</div>`,
      chart: () => `<div class="chart"><svg viewBox="0 0 240 80"><g class="grid">${span(3, (i) => `<line x1="0" x2="240" y1="${20 + i * 20}" y2="${20 + i * 20}"/>`)}${span(7, (i) => `<line y1="0" y2="80" x1="${30 + i * 30}" x2="${30 + i * 30}"/>`)}</g>
        ${["halo", "trace"].map((c) => `<polyline class="${c}" points="${day.map((v, i) => `${i * 5 + 2.5},${(70 - (v - 15) * 6).toFixed(1)}`).join(" ")}"/>`).join("")}</svg></div>`,
      ...own,
    };

    // What each meter reads, by its key: the two at the top, and a room's temperature.
    const READ = { mains: { title: "Mains draw", read: () => H.watts() / 1000, lo: 0, hi: 3, dp: 2, unit: "kW" }, outside: { title: "Outside air", read: () => H.rooms[5].temp, lo: -10, hi: 30, dp: 1, unit: "°C" } };
    for (const r of H.rooms) READ[r.id] = { title: `${r.temp.toFixed(1)}°`, read: () => r.temp, lo: 5, hi: 30, dp: 1, unit: "°C" };
    let beat = 0;
    const needle = (key, m = READ[key]) => `<div class="meter needle-m" data-meter="${key}"><div class="win"><svg class="face" viewBox="0 0 120 70">${scale(m.lo, m.hi)}<text class="unit" x="60" y="52">${m.unit}</text></svg>
      <div class="swing"><svg class="waver" viewBox="0 0 120 70" style="--beat:${BEATS[beat++ % BEATS.length]}s"><line x1="60" y1="96" x2="60" y2="19"/></svg></div><i class="cowl"></i></div>${E.label(m.title)}</div>`;
    const display = (key, m = READ[key]) => `<div class="meter display-m" data-meter="${key}"><div class="win"><span class="figs" data-figs></span><span class="unit">${m.unit}</span><div class="sweep segs" style="--n:20">${segs(20)}</div></div>${E.label(m.title)}</div>`;
    const levelled = (d) => d.kind === "light" || d.kind === "cover";

    document.head.insertAdjacentHTML("afterbegin", `<style>${CSS}</style>`);
    document.body.dataset.meters = E.meters;
    document.body.insertAdjacentHTML("beforeend", `<div class="mock">Mock-up only. Meters in the rooms: <button data-meters="needle">Needle</button><button data-meters="display">Display</button></div>
      <div class="panel">
        <div class="top">
          <div class="bay pair">${needle("mains")}${display("mains")}</div>
          <div class="bay follow">${needle("outside")}${display("outside")}</div>
          <div class="bay scenes">${H.scenes.map(E.scene).join("")}</div>
          <div class="bay alarm">${E.label("Alarm: unset")}<div class="wheels">${span(4, (i) => `<div class="wheel"><button data-wheel="${i}" data-by="1" aria-label="Digit ${i + 1} up">${E.up}</button><span class="num" data-num="${i}"></span><button data-wheel="${i}" data-by="-1" aria-label="Digit ${i + 1} down">${E.down}</button></div>`)}</div>
            <div class="pushes">${["Away", "Home", "Night"].map((n) => `<button class="push"><i class="key"></i>${E.label(n)}</button>`).join("")}</div></div>
          <div class="bay">${E.tv("Porch: person 14:32")}</div>
        </div>
        <div class="bay alerts">${ALERTS.map(E.alert).join("")}</div>
        <div class="rooms">${H.rooms.map((r, i) => `<section class="bay room"><div class="head">${E.lights(r)}${E.label(r.name)}</div>
          <div class="follow${E.odd && i % E.odd === E.odd - 1 ? " swap" : ""}">${needle(r.id)}${display(r.id)}</div>
          <div class="works">${E.stat(r)}${r.devices.filter(levelled).map(E.level).join("")}${r.devices.filter((d) => !levelled(d)).map(E.toggle).join("")}</div></section>`).join("")}</div>
        <div class="bay chartbox">${E.chart()}${E.label("Kitchen: the last day")}</div>
      </div>`);

    const panel = document.querySelector(".panel");
    const all = (q) => [...document.querySelectorAll(q)];
    // An era may draw a whole reading its own way (`figs`), or each figure of it (`fig`).
    const figs = (el, text) => (el.innerHTML = E.figs ? E.figs(text) : [...text].map(E.fig).join(""));
    const wheels = [0, 0, 0, 0];
    let armed = "", dropping, chosen = "";

    function paint() {
      for (const el of all("[data-id]")) {
        const d = H.find(el.dataset.id), lvl = d.on ? d.level : 0;
        // A lock's switch is thrown when it is unlocked; its guard is up then, and while it waits for its second press.
        el.classList.toggle("on", d.kind === "lock" ? !d.on : d.on);
        el.classList.toggle("up", d.kind === "lock" && (!d.on || armed === d.id));
        if (levelled(d)) el.parentElement.style.setProperty("--lvl", lvl);
      }
      for (const el of all("[data-figs-for]")) { const d = H.find(el.dataset.figsFor); figs(el, `${d.on ? d.level : 0}%`.padStart(4)); }
      for (const r of H.rooms) {
        const lights = H.lights(r), lit = lights.reduce((sum, d) => sum + (d.on ? d.level : 0), 0) / (lights.length * 100 || 1);
        all(`[data-lights="${r.id}"]`).forEach((el) => el.style.setProperty("--frac", lit.toFixed(2)));
        all(`[data-target="${r.id}"]`).forEach((el) => el.parentElement.style.setProperty("--lvl", ((r.target - 5) / 25) * 100));
        all(`[data-figs-target="${r.id}"]`).forEach((el) => figs(el, `${r.target.toFixed(1)}°`.padStart(5)));
      }
      for (const el of all("[data-meter]")) {
        const m = READ[el.dataset.meter], v = m.read(), frac = Math.min(1, Math.max(0, (v - m.lo) / (m.hi - m.lo)));
        el.style.setProperty("--deg", (-33 + 66 * frac).toFixed(1));
        el.style.setProperty("--frac", frac.toFixed(3));
        const shown = el.querySelector("[data-figs]");
        if (shown) figs(shown, v.toFixed(m.dp).padStart(4));
      }
      all("[data-num]").forEach((el) => (el.innerHTML = E.num(String(wheels[el.dataset.num]))));
      all("[data-scene]").forEach((el) => el.classList.toggle("closed", el.dataset.scene === chosen));
      all("[data-meters]").forEach((el) => el.setAttribute("aria-pressed", el.dataset.meters === document.body.dataset.meters));
    }

    // What a knob or a slider sets: a device's level, or a room's heating.
    const sets = (el) => {
      const r = H.rooms.find((x) => x.id === el.dataset.target);
      if (r) return { min: 5, max: 30, step: 0.5, get: () => r.target, set: (v) => { r.target = v; paint(); } };
      const d = H.find(el.dataset.id);
      return { min: 0, max: 100, step: 1, get: () => (d.on ? d.level : 0), set: (v) => H.set(d.id, v) };
    };
    const snap = (s, v) => Math.round(Math.min(s.max, Math.max(s.min, v)) / s.step) * s.step;

    panel.addEventListener("pointerdown", (e) => {
      const el = e.target.closest(".crank, .slide");
      if (!el) return;
      const s = sets(el), box = () => el.getBoundingClientRect();
      el.setPointerCapture(e.pointerId);
      el.classList.add("drag");
      // A knob is cranked: it turns as far as the finger goes round its middle. A slider goes where the finger is.
      const bearing = (ev) => (Math.atan2(ev.clientY - (box().top + box().height / 2), ev.clientX - (box().left + box().width / 2)) * 180) / Math.PI;
      const slide = (ev) => s.set(snap(s, s.min + (1 - (ev.clientY - box().top) / box().height) * (s.max - s.min)));
      let angle = bearing(e), level = s.get();
      if (el.matches(".slide")) slide(e);
      el.onpointermove = (ev) => {
        if (el.matches(".slide")) return slide(ev);
        const now = bearing(ev), turned = ((now - angle + 540) % 360) - 180;
        angle = now;
        level = Math.min(s.max, Math.max(s.min, level + (turned / 270) * (s.max - s.min)));
        s.set(snap(s, level));
      };
      el.onpointerup = el.onpointercancel = () => { el.onpointermove = null; el.classList.remove("drag"); };
    });
    panel.addEventListener("keydown", (e) => {
      const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key], el = e.target.closest(".crank, .slide");
      if (!by || !el) return;
      e.preventDefault();
      const s = sets(el);
      s.set(snap(s, s.get() + by * s.step * 5));
    });
    document.addEventListener("click", (e) => {
      const choice = e.target.closest("[data-meters]"), toggle = e.target.closest(".toggle"), scene = e.target.closest(".scene"), wheel = e.target.closest("[data-by]");
      if (choice) document.body.dataset.meters = choice.dataset.meters;
      if (scene) H.scene((chosen = scene.dataset.scene));
      if (wheel) wheels[wheel.dataset.wheel] = (wheels[wheel.dataset.wheel] + +wheel.dataset.by + 10) % 10;
      if (toggle) {
        const d = H.find(toggle.dataset.id);
        clearTimeout(dropping);
        // A lock at rest takes two presses: the first lifts its guard for a few seconds.
        if (d.kind === "lock" && d.on && armed !== d.id) {
          armed = d.id;
          dropping = setTimeout(() => { armed = ""; paint(); }, 6000);
        } else {
          armed = "";
          H.toggle(d.id);
        }
      }
      paint();
    });

    H.on(paint);
    paint();
  }

  window.Era = Object.assign(build, { segs, seg7, day });
})();
