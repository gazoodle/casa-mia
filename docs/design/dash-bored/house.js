// The invented house every Dash-Bored mock-up shows. Nothing here is real: the rooms,
// devices and numbers are made up, and no page talks to Home Assistant.
//
// A plain script (not a module) so the pages open straight from disk.
window.House = (() => {
  const rooms = [
    { id: "kitchen", name: "Kitchen", temp: 21.4, target: 21, humidity: 48, devices: [
      { id: "k_ceiling", name: "Ceiling", kind: "light", on: true, level: 80, watts: 42 },
      { id: "k_counter", name: "Counter", kind: "light", on: false, level: 60, watts: 18 },
      { id: "k_kettle", name: "Kettle", kind: "switch", on: false, watts: 2200 },
      { id: "k_blind", name: "Blind", kind: "cover", on: true, level: 70, watts: 0 } ] },
    { id: "sitting", name: "Sitting Room", temp: 20.1, target: 21, humidity: 44, devices: [
      { id: "s_lamp", name: "Reading lamp", kind: "light", on: true, level: 45, watts: 9 },
      { id: "s_ceiling", name: "Ceiling", kind: "light", on: false, level: 100, watts: 36 },
      { id: "s_tv", name: "Television", kind: "switch", on: true, watts: 110 },
      { id: "s_curtain", name: "Curtains", kind: "cover", on: false, level: 0, watts: 0 } ] },
    { id: "study", name: "Study", temp: 19.2, target: 20, humidity: 41, devices: [
      { id: "st_desk", name: "Desk lamp", kind: "light", on: false, level: 70, watts: 12 },
      { id: "st_shelf", name: "Shelves", kind: "light", on: false, level: 30, watts: 8 },
      { id: "st_printer", name: "Printer", kind: "switch", on: false, watts: 35 } ] },
    { id: "hall", name: "Hall", temp: 18.6, target: 19, humidity: 46, devices: [
      { id: "h_ceiling", name: "Ceiling", kind: "light", on: false, level: 100, watts: 20 },
      { id: "h_porch", name: "Porch", kind: "light", on: true, level: 100, watts: 14 },
      { id: "h_lock", name: "Front door", kind: "lock", on: true, watts: 0 } ] },
    { id: "bedroom", name: "Bedroom", temp: 17.8, target: 18, humidity: 50, devices: [
      { id: "b_bedside", name: "Bedside", kind: "light", on: false, level: 25, watts: 6 },
      { id: "b_ceiling", name: "Ceiling", kind: "light", on: false, level: 100, watts: 30 },
      { id: "b_blind", name: "Blind", kind: "cover", on: false, level: 0, watts: 0 } ] },
    { id: "garden", name: "Garden", temp: 9.3, target: 9.3, humidity: 81, devices: [
      { id: "g_path", name: "Path lights", kind: "light", on: true, level: 60, watts: 24 },
      { id: "g_pond", name: "Pond pump", kind: "switch", on: true, watts: 45 },
      { id: "g_water", name: "Sprinkler", kind: "switch", on: false, watts: 15 } ] },
  ];

  const scenes = [
    { id: "evening", name: "Evening", on: ["k_ceiling", "s_lamp", "h_porch", "g_path"] },
    { id: "film", name: "Film", on: ["s_tv", "s_lamp"] },
    { id: "bedtime", name: "Bedtime", on: ["b_bedside", "h_porch"] },
    { id: "away", name: "Away", on: ["h_porch"] },
  ];

  const energy = { solar: 0.4, battery: 72, base: 310 };
  const listeners = new Set();
  const devices = rooms.flatMap((r) => r.devices.map((d) => Object.assign(d, { room: r })));
  const byId = Object.fromEntries(devices.map((d) => [d.id, d]));

  const emit = (d) => listeners.forEach((fn) => fn(d));

  return {
    rooms, scenes, energy, devices,
    find: (id) => byId[id],
    // Every change goes through here, so a page only has to listen in one place.
    toggle(id) { const d = byId[id]; d.on = !d.on; emit(d); return d; },
    set(id, level) { const d = byId[id]; d.level = Math.round(level); d.on = level > 0; emit(d); return d; },
    scene(id) {
      const want = new Set(scenes.find((s) => s.id === id).on);
      devices.filter((d) => d.kind === "light" || d.kind === "switch")
        .forEach((d) => { if (d.on !== want.has(d.id)) { d.on = !d.on; emit(d); } });
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    lightsOn: (room) => room.devices.filter((d) => d.kind === "light" && d.on).length,
    lights: (room) => room.devices.filter((d) => d.kind === "light"),
    // Watts drawn now: a base load plus whatever is switched on.
    watts: () => energy.base + devices.reduce((w, d) =>
      w + (d.on ? d.watts * (d.kind === "light" ? d.level / 100 : 1) : 0), 0),
    state(d) {
      if (d.kind === "cover") return d.on ? `${d.level}% open` : "closed";
      if (d.kind === "lock") return d.on ? "locked" : "unlocked";
      if (d.kind === "light") return d.on ? `${d.level}%` : "off";
      return d.on ? "on" : "off";
    },
  };
})();
