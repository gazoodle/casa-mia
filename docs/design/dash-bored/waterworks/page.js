// What the water pages share around the drawing: the choice of skin, and the cords for
// trying things that would otherwise need a real house.
window.Page = (() => {
  const SKINS = { patent: "Patent engraving", blueprint: "Blueprint", tin: "Tin toy" };

  // The skin buttons. The skin asked for in the address (`?skin=`) is worn, or else the
  // one worn last time, or else the engraving. `worn(skin)` is called each time one is put on.
  function skins(worn) {
    const el = document.getElementById("skins");
    const wear = (skin) => {
      document.body.dataset.skin = skin;
      try { localStorage.setItem("waterworks-skin", skin); } catch { /* a private window: it just isn't remembered */ }
      for (const b of el.querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.skin === skin);
      worn(skin);
    };

    el.innerHTML = Object.entries(SKINS).map(([id, name]) => `<button data-skin="${id}">${name}</button>`).join("");
    el.addEventListener("click", (e) => { if (e.target.dataset.skin) wear(e.target.dataset.skin); });
    let saved = null;
    try { saved = localStorage.getItem("waterworks-skin"); } catch { /* as above */ }
    const asked = new URLSearchParams(location.search).get("skin") ?? saved;
    wear(SKINS[asked] ? asked : "patent");
  }

  // A cord for each thing in `TRY`, a name and what pulling it does.
  function cords(TRY) {
    const el = document.getElementById("cords");
    el.innerHTML = Object.keys(TRY).map((name) => `<button class="cord" data-try="${name}"><span>${name}</span></button>`).join("");
    el.addEventListener("click", (e) => {
      const cord = e.target.closest(".cord");
      if (!cord) return;
      cord.classList.remove("pulled"); void cord.offsetWidth; cord.classList.add("pulled");
      TRY[cord.dataset.try]();
    });
  }

  const clock = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return { skins, cords, clock };
})();
