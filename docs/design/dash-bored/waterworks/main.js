// Puts the Kitchen together and runs it: the room's waterworks (room.js), its valves and
// machines (works.js), the cords for trying things, the skins, and the one loop that
// moves everything.
(() => {
  const { clamp, spring, hash } = Kit;
  const room = House.rooms.find((r) => r.id === "kitchen"), works = Works.build(room);
  const stage = document.getElementById("stage"), notice = document.getElementById("notice"), found = {};
  const q = (name) => (found[name] ??= stage.querySelector(`[data-p="${name}"]`));

  // Two drawings, one over the other: what stands still, and what moves. The still one
  // (`wob`) is what the patent skin shows with a hand-drawn wobble (bake.js).
  stage.innerHTML = `<div class="sheet">
    <svg class="ink wob" viewBox="0 0 1200 780">${Room.still(room)}${works.still}</svg>
    <svg class="ink" viewBox="0 0 1200 780">${Room.live()}${works.live}${Bot.art()}</svg></div>`;
  Works.controls(stage, works);

  // ---- The cords: things to try that would otherwise need a real house.
  let stale = "";
  Page.cords({
    "Someone else switches the counter light": () => House.toggle("k_counter"),
    "The blind stops answering": () => { const c = works.cellOf("k_blind"); c.away = c.away ? "" : Page.clock(); },
    "The data stops": () => { stale = stale ? "" : Page.clock(); },
    "Something silly": () => Room.surprise(),
  });
  Page.skins((skin) => { if (skin === "patent") Bake.start(stage.querySelector(".wob")); });

  // ---- The loop.
  const steam = { x: 1, v: 0 };
  let last = 0, silly = 12, sillies = 0;

  function frame(ms) {
    const now = ms / 1000, dt = Math.min(0.05, now - last);
    last = now;

    const fresh = clamp(spring(steam, stale ? 0 : 1, dt, 6, 5));
    Room.tick(q, fresh, dt, now);
    document.body.classList.toggle("stale", !!stale);
    notice.textContent = stale ? `The tank has been dry since ${stale}. Nothing shown here is current.` : "";

    Works.tick(q, works, fresh, dt, now);
    Bot.tick(q, dt, now);

    // Every half minute or so, something silly.
    if ((silly -= dt) < 0) { Room.surprise(); silly = 25 + (hash(`silly${sillies++}`) % 20); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
