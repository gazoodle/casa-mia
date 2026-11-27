// NEVER TEST THIS: the script of a design mock-up (../jukebox-mockup.html). It only pretends:
// the music, rooms and guests are invented and nothing here is the card's code.
"use strict";

// ===== Icons (Material's shapes) =====
const I = {
  play: "M8 5v14l11-7z",
  pause: "M6 5h4v14H6zM14 5h4v14h-4z",
  next: "M6 6l8.5 6L6 18zM16 6h2v12h-2z",
  prev: "M18 6l-8.5 6L18 18zM6 6h2v12H6z",
  heart: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  loathe: "M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z",
  lock: "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
  search: "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  shuffle: "M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
  repeat: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  queue: "M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z",
  rooms: "M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 1.99 2 1.99L17 22c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2c-1.11 0-2-.9-2-2s.89-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
  down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  drag: "M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z",
  dots: "M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  volume: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z",
  lyrics: "M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
};
const icon = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${I[n]}"/></svg>`;

// ===== The invented music =====
const COLOURS = {
  "The Marigolds": ["#f2a23a", "#c2410c"], "Saltwater Radio": ["#2aa6b8", "#1e3a8a"],
  "Velvet Arcade": ["#d946a8", "#5b21b6"], "Ines Calloway": ["#f97360", "#9f1239"],
  "Brass Meridian": ["#eab308", "#15803d"], "Juniper & Vine": ["#4ade80", "#0f766e"],
  "The Quiet Engines": ["#94a3b8", "#334155"],
};
const SONGS = [
  ["Paper Lanterns", "The Marigolds", 212], ["Low Tide Motel", "Saltwater Radio", 245],
  ["Borrowed Sunglasses", "Velvet Arcade", 194], ["Kitchen at Midnight", "Ines Calloway", 228],
  ["Electric Orchard", "Brass Meridian", 261], ["Second Hand Disco", "Velvet Arcade", 236],
  ["Honey on the Dial", "The Marigolds", 178], ["Slow Train to Somewhere", "Juniper & Vine", 280],
  ["Glitterball Heart", "Brass Meridian", 205], ["Tangerine Sky", "Ines Calloway", 219],
  ["Last Bus Home", "The Quiet Engines", 252], ["Parquet Floor", "Velvet Arcade", 183],
  ["Postcards from Nowhere", "Saltwater Radio", 231], ["Dancing in the Hallway", "The Marigolds", 200],
  ["Blue Hour", "Juniper & Vine", 302], ["Neon Allotment", "The Quiet Engines", 224],
].map(([title, artist, secs], i) => ({ id: `s${i}`, title, artist, secs, art: COLOURS[artist] }));
const song = Object.fromEntries(SONGS.map((s) => [s.id, s]));
song.guest = { id: "guest", title: "Somebody Else's Banger", artist: "From a guest's phone", secs: 200, art: ["#ef4444", "#111827"] };
const PLAYLISTS = [
  { id: "p0", title: "Garden Party", art: ["#84cc16", "#be185d"], songs: [8, 5, 2, 13, 0, 11, 4, 9] },
  { id: "p1", title: "Friday Night", art: ["#f43f5e", "#4c1d95"], songs: [5, 8, 11, 2, 15, 13] },
  { id: "p2", title: "Slow Sunday", art: ["#fbbf24", "#78350f"], songs: [7, 14, 3, 10, 1] },
  { id: "p3", title: "Dinner for Eight", art: ["#38bdf8", "#312e81"], songs: [3, 9, 6, 14, 12, 7, 1] },
].map((p) => ({ ...p, songs: p.songs.map((i) => `s${i}`), sub: `Playlist · ${p.songs.length} songs` }));
const STATIONS = [
  { id: "r0", title: "Harbour FM", sub: "Radio · soul and funk", art: ["#06b6d4", "#7c2d12"], now: [["Honey on the Dial", "The Marigolds"], ["Glitterball Heart", "Brass Meridian"], ["Adverts", "Harbour FM"]] },
  { id: "r1", title: "Radio Meridian", sub: "Radio · new music", art: ["#a3e635", "#1e40af"], now: [["Neon Allotment", "The Quiet Engines"], ["Tangerine Sky", "Ines Calloway"]] },
  { id: "r2", title: "Sunday Soul", sub: "Radio · slow and easy", art: ["#fb923c", "#581c87"], now: [["Blue Hour", "Juniper & Vine"], ["Low Tide Motel", "Saltwater Radio"]] },
];
const ROOMS = ["Kitchen", "Den", "Snug", "Garden", "Porch", "Loft"];
const LYRICS = ["Paper lanterns on the garden wall", "We said we'd only stay for one", "Now the kitchen light is the morning sun", "And nobody wants to go home", "Turn it up, turn it up", "Let the neighbours learn the song"];
const NOTHING = { title: "Nothing playing", artist: "Search for something to play", secs: 0, art: ["#57534e", "#1c1917"] };

// ===== What the pretend house is doing =====
let keys = 0;
const entry = (id) => ({ k: ++keys, id }); // a song can be in a queue twice, so each place has its own key
const state = {
  device: "phone", open: null, panel: null, lyrics: false, q: "", filter: "all", menu: null, dialog: null, anim: null,
  vol: { Kitchen: 22, Den: 30, Snug: 24, Garden: 18, Porch: 15, Loft: 20 },
  undone: [],
  groups: [
    { id: "g1", kind: "queue", rooms: ["Den", "Snug"], queue: PLAYLISTS[0].songs.map(entry), at: 2, pos: 47, playing: true, party: false, loved: {} },
    { id: "g2", kind: "radio", rooms: ["Kitchen"], station: STATIONS[0], tick: 0, secs: 0, queue: [], at: 0, pos: 0, playing: true, party: false, loved: {} },
  ],
};

const $ = (s) => document.querySelector(s);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const group = (id = state.open) => state.groups.find((g) => g.id === id);
const tablet = () => state.device === "tablet";
const hue = (a) => `style="--a:${a[0]};--b:${a[1]}"`;
const art = (x) => `<span class="art" ${hue(x.art)}><i>${esc(x.title.split(" ").slice(0, 2).map((w) => w[0]).join(""))}</i></span>`;
const average = (g) => Math.round(g.rooms.reduce((n, r) => n + state.vol[r], 0) / g.rooms.length);
const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

/** What a group is playing: a station's current song, the queue's current song, or nothing. */
function now(g) {
  if (g.kind === "radio") {
    const [title, artist] = g.station.now[g.tick % g.station.now.length];
    return { title, artist, art: g.station.art, secs: 0 };
  }
  return g.queue.length ? song[g.queue[g.at].id] : NOTHING;
}

function toast(text, back = false) {
  const el = $("#toast");
  el.textContent = text;
  el.className = `toast on${back ? " back" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (el.className = "toast"), 3200);
}

// ===== Drawing =====
function mini(g) {
  const n = now(g);
  const where = `${g.rooms.join(" + ")}${g.kind === "radio" ? ` · ${g.station.title}` : ""}${g.party ? " · Party" : ""}`;
  return `<div class="mini" ${hue(n.art)}>
    <button data-do="open" data-g="${g.id}">${art(n)}</button>
    <button class="meta" data-do="open" data-g="${g.id}"><b>${esc(n.title)}</b><span>${esc(n.artist)}</span><small>${esc(where)}</small></button>
    <div class="tp"><button class="ib" data-do="toggle" data-g="${g.id}">${icon(g.playing ? "pause" : "play")}</button><button class="ib" data-do="next" data-g="${g.id}">${icon("next")}</button></div>
    <div class="volrow">${icon("volume")}<input type="range" min="0" max="100" value="${average(g)}" data-gvol="${g.id}"></div>
    ${n.secs ? `<i class="prog" data-bar="${g.id}" style="width:${(100 * g.pos) / n.secs}%"></i>` : ""}
  </div>`;
}

function page() {
  const idle = ROOMS.filter((r) => !state.groups.some((g) => g.rooms.includes(r)));
  // A phone shows Home Assistant's own top bar; a wall tablet runs with no bar and no sidebar,
  // so the way back to a known place has to be on the page itself, on both.
  const bar = `<div class="habar"><button class="ib" data-do="nav" data-v="open Home Assistant's menu">${icon("menu")}</button><b>Casa Mia</b></div>`;
  const nav = `<div class="nav"><button class="ib" data-do="nav" data-v="go back to the page you came from" title="Back">${icon("back")}</button><h2>Music</h2><button class="ib" data-do="nav" data-v="go to the dashboard's first page" title="Home">${icon("home")}</button></div>`;
  return `<div class="page">${tablet() ? "" : bar}${nav}
    <div class="minis">${state.groups.map(mini).join("")}</div>
    ${idle.length ? `<h3>Quiet rooms: tap one to play something there</h3><div class="idle">${idle.map((r) => `<button data-do="start" data-r="${r}">${icon("rooms")}${r}</button>`).join("")}</div>` : ""}
  </div>`;
}

function tabs() {
  const tab = (v, label, on) => `<button data-do="${v === "lyrics" ? "lyrics" : "panel"}" data-v="${v}" class="${on ? "on" : ""}">${icon(v)}${label}</button>`;
  return `<div class="tabs">${tab("rooms", "Rooms", state.panel === "rooms")}${tab("queue", "Queue", state.panel === "queue")}${tab("search", "Search", state.panel === "search")}${tab("lyrics", "Lyrics", state.lyrics)}</div>`;
}

function big(g) {
  const n = now(g), radio = g.kind === "radio";
  const line = n.secs ? Math.min(LYRICS.length - 1, Math.floor((g.pos / n.secs) * LYRICS.length)) : 0;
  const lyrics = `<span class="lyr" id="lyr">${LYRICS.map((l, i) => `<span class="${i === line ? "on" : ""}">${l}</span>`).join("")}<small>Invented words. Real ones would come from a service outside the house.</small></span>`;
  const seek = radio
    ? `<div class="seek"><span class="live">LIVE · ${esc(g.station.title.toUpperCase())}</span></div>`
    : `<div class="seek"><span id="t0">${mmss(g.pos)}</span><div class="track"><i id="bar" style="width:${n.secs ? (100 * g.pos) / n.secs : 0}%"></i></div><span>${mmss(n.secs)}</span></div>`;
  return `<div class="big${state.anim === "big" ? " in" : ""}" ${hue(n.art)}>
    <div class="now">
      <div class="bar">
        <button class="ib" data-do="close">${icon("down")}</button>
        <div class="where"><small>Playing in</small><b>${esc(g.rooms.join(" + "))}</b></div>
        <button class="pill${g.party ? " party" : ""}" data-do="party">${icon("lock")}${g.party ? "Party on" : "Party"}</button>
      </div>
      <div class="cover"><span class="art" ${hue(n.art)}><i>${esc(n.title.split(" ").slice(0, 2).map((w) => w[0]).join(""))}</i>${state.lyrics ? lyrics : ""}</span></div>
      <div class="title">
        <button class="ib" data-do="loathe" title="Loathe it">${icon("loathe")}</button>
        <div><b>${esc(n.title)}</b><span>${esc(n.artist)}</span></div>
        <button class="ib${g.loved[n.title] ? " loved" : ""}" data-do="love" title="Love it">${icon("heart")}</button>
      </div>
      ${seek}
      <div class="tp">
        <button class="ib sm${g.shuffle ? " on" : ""}" data-do="flag" data-v="shuffle">${icon("shuffle")}</button>
        <button class="ib" data-do="prev">${icon("prev")}</button>
        <button class="ib play" data-do="toggle">${icon(g.playing ? "pause" : "play")}</button>
        <button class="ib" data-do="next">${icon("next")}</button>
        <button class="ib sm${g.repeat ? " on" : ""}" data-do="flag" data-v="repeat">${icon("repeat")}</button>
      </div>
      <div class="gvol">${icon("volume")}<input type="range" min="0" max="100" value="${average(g)}" data-gvol="${g.id}"></div>
      ${tablet() ? "" : tabs()}
    </div>
    ${state.panel ? `<div class="side${state.anim === "side" ? " in" : ""}">${tablet() ? tabs() : ""}${PANELS[state.panel](g)}</div>` : ""}
  </div>`;
}

const head = (title, sub, extra = "") =>
  `<div class="head"><b>${title}<small>${sub}</small></b>${extra}${tablet() ? "" : `<button class="ib" data-do="panel" data-v="">${icon("close")}</button>`}</div>`;

const PANELS = {
  rooms(g) {
    const row = (r) => {
      const inn = g.rooms.includes(r), other = state.groups.find((o) => o !== g && o.rooms.includes(r));
      const note = inn ? "Playing this" : other ? `Playing ${esc(now(other).title)}: tap to bring it here` : "Quiet: tap to add it";
      return `<div class="room${inn ? " in" : ""}">
        <button class="tick" data-do="room" data-r="${r}">${icon(inn ? "check" : "plus")}</button>
        <button class="t" data-do="room" data-r="${r}" style="text-align:left"><b>${r}</b><small>${note}</small></button>
        ${inn ? `<input type="range" min="0" max="100" value="${state.vol[r]}" data-vol="${r}"><output data-v="${r}">${state.vol[r]}</output>` : ""}
      </div>`;
    };
    const order = [...g.rooms, ...ROOMS.filter((r) => !g.rooms.includes(r))];
    return `${head("Rooms", "Tap a room to add it or take it out. Each has its own volume.")}<div class="scroll" data-scroll="rooms">${order.map(row).join("")}</div>`;
  },

  queue(g) {
    if (g.kind === "radio" && !g.queue.length) {
      return `${head("Queue", "A radio station has no queue")}<div class="scroll" data-scroll="queue"><h3>Change station</h3><div class="tiles">${STATIONS.map(tile).join("")}</div></div>`;
    }
    const mins = Math.round(g.queue.reduce((n, e) => n + song[e.id].secs, 0) / 60);
    const row = (e, i) => {
      const s = song[e.id], cur = g.kind === "queue" && i === g.at;
      return `<div class="row${cur ? " cur" : i < g.at ? " past" : ""}" data-i="${i}">
        <span class="handle">${icon("drag")}</span>
        <button data-do="jump" data-i="${i}">${art(s)}</button>
        <button class="t" data-do="jump" data-i="${i}"><b>${esc(s.title)}</b><span>${esc(s.artist)}</span></button>
        <span class="end">${mmss(s.secs)}<button class="ib" data-do="remove" data-i="${i}" title="Take it out">${icon("close")}</button></span>
      </div>`;
    };
    const sub = `${g.queue.length} songs · ${mins} min${g.party ? " · locked to this card" : ""}${g.kind === "radio" ? " · waiting while the radio is on" : ""}`;
    const body = g.queue.length ? g.queue.map(row).join("") : `<p class="empty">The queue is empty. Use Search to add to it.</p>`;
    return `${head("Queue", sub, `<button class="add" data-do="panel" data-v="search">Add songs</button>`)}<div class="scroll q" data-scroll="queue">${body}</div>`;
  },

  search() {
    const chip = (v, label) => `<button data-do="filter" data-v="${v}" class="${state.filter === v ? "on" : ""}">${label}</button>`;
    return `${head("Search", "Songs, playlists and stations, from everywhere at once")}
      <label class="find">${icon("search")}<input data-in="q" placeholder="What do you want to hear?" value="${esc(state.q)}" autocomplete="off"></label>
      <div class="chips">${chip("all", "All")}${chip("songs", "Songs")}${chip("playlists", "Playlists")}${chip("stations", "Stations")}</div>
      <div class="scroll" id="results" data-scroll="search">${results()}</div>`;
  },
};

const tile = (x) => `<button data-do="${x.now ? "station" : "menu"}" data-id="${x.id}">${art(x)}<b>${esc(x.title)}</b><small>${esc(x.sub)}</small></button>`;

function results() {
  const q = state.q.trim().toLowerCase(), f = state.filter;
  const has = (...texts) => texts.some((t) => t.toLowerCase().includes(q));
  const songRow = (s) => `<div class="row"><span></span>${art(s)}<span class="t"><b>${esc(s.title)}</b><span>${esc(s.artist)}</span></span>
    <span class="end"><button class="add" data-do="add" data-id="${s.id}" data-w="next">Next</button><button class="add" data-do="add" data-id="${s.id}" data-w="end">End</button><button class="ib" data-do="menu" data-id="${s.id}">${icon("dots")}</button></span></div>`;
  const listRow = (x) => `<div class="row"><span></span>${art(x)}<span class="t"><b>${esc(x.title)}</b><span>${esc(x.sub)}</span></span>
    <span class="end">${x.now ? `<button class="add" data-do="station" data-id="${x.id}">Play</button>` : `<button class="add" data-do="add" data-id="${x.id}" data-w="end">Add all</button><button class="ib" data-do="menu" data-id="${x.id}">${icon("dots")}</button>`}</span></div>`;

  if (!q && f === "all") {
    return `<h3>Favourites</h3><div class="tiles">${[...PLAYLISTS, ...STATIONS].map(tile).join("")}</div><h3>Played a lot here</h3>${SONGS.slice(0, 6).map(songRow).join("")}`;
  }
  const songs = f === "all" || f === "songs" ? SONGS.filter((s) => has(s.title, s.artist)) : [];
  const lists = f === "all" || f === "playlists" ? PLAYLISTS.filter((p) => has(p.title)) : [];
  const stations = f === "all" || f === "stations" ? STATIONS.filter((s) => has(s.title, s.sub)) : [];
  const part = (title, rows) => (rows.length ? `<h3>${title}</h3>${rows.join("")}` : "");
  return part("Playlists", lists.map(listRow)) + part("Stations", stations.map(listRow)) + part("Songs", songs.map(songRow))
    || `<p class="empty">Nothing found for "${esc(state.q)}".</p>`;
}

/** The choices for one song or playlist. Replacing the queue is kept apart and asks again. */
function menu() {
  const x = song[state.menu] ?? PLAYLISTS.find((p) => p.id === state.menu);
  return `<div class="veil" data-do="shut"><div class="sheet">
    <h4>${esc(x.title)}</h4><p>${esc(x.artist ?? x.sub)}</p>
    <div class="acts">
      <button class="main" data-do="add" data-id="${x.id}" data-w="next">Play next</button>
      <button data-do="add" data-id="${x.id}" data-w="end">Add to the end of the queue</button>
      <button class="sep" data-do="add" data-id="${x.id}" data-w="replace">Play now in place of the queue</button>
    </div></div></div>`;
}

function dialog() {
  const d = state.dialog;
  return `<div class="veil"><div class="sheet">
    <p class="warn">${d.warn}</p><p>${d.text}</p>
    <div class="acts"><button class="main" data-do="shut">${d.no}</button><button class="danger" data-do="yes">${d.yes}</button></div>
  </div></div>`;
}

function outside() {
  const party = state.groups.some((g) => g.party);
  const ents = state.groups.map((g) => `<div><code>sensor.jukebox_${g.rooms[0].toLowerCase()}</code><b>${g.playing ? esc(`${now(g).title} · ${now(g).artist}`) : "paused"}</b></div>`).join("");
  return `<div class="box"><h2>Be a guest with the Sonos app</h2>
      <p>These act on the Den's music from outside the card. Try them with Party off, then with it on.</p>
      <div class="btns">
        <button data-do="guest" data-v="remove">Take three songs out of the queue</button>
        <button data-do="guest" data-v="own">Play a song of their own</button>
        <button data-do="guest" data-v="loud">Turn the volume up to 90</button>
        <button data-do="guest" data-v="pull">Take a room out of the group</button>
      </div>
      ${state.undone.length ? `<ul class="undone">${state.undone.map((u) => `<li><time>${u.at}</time>Put back: someone ${u.what}</li>`).join("")}</ul>` : ""}
    </div>
    <div class="box"><span class="ball${party ? " on" : ""}">🪩</span><h2>What Home Assistant sees</h2>
      <p>Sensors for automations, such as a disco ball that follows the party. The names are a proposal.</p>
      <div class="ents">
        <div><code>binary_sensor.jukebox_party</code><b class="${party ? "on" : ""}">${party ? "on" : "off"}</b></div>
        ${ents}
        <div><code>sensor.jukebox_changes_put_back</code><b>${state.undone.length}</b></div>
      </div>
    </div>`;
}

function render() {
  // What a redraw would lose: where each list was scrolled to, and the cursor in the search box.
  const scrolls = [...document.querySelectorAll("[data-scroll]")].map((el) => [el.dataset.scroll, el.scrollTop]);
  const typing = document.activeElement?.dataset?.in;
  const g = group();

  $("#device").className = `device ${state.device}`;
  $("#screen").innerHTML = page() + (g ? big(g) : "") + (state.menu ? menu() : "") + (state.dialog ? dialog() : "");
  $("#outside").innerHTML = outside();
  document.querySelectorAll("#devices button").forEach((b) => b.classList.toggle("on", b.dataset.v === state.device));

  for (const [name, top] of scrolls) {
    const el = document.querySelector(`[data-scroll="${name}"]`);
    if (el) el.scrollTop = top;
  }
  if (typing) {
    const box = document.querySelector(`[data-in="${typing}"]`);
    box?.focus();
    box?.setSelectionRange(box.value.length, box.value.length);
  }
  state.anim = null;
}

// ===== What a tap does =====
function advance(g, by = 1) {
  if (g.kind === "radio") return void g.tick++;
  if (!g.queue.length) return;
  g.pos = 0;
  g.at += by;
  if (g.at >= g.queue.length) [g.at, g.playing] = g.repeat ? [0, g.playing] : [g.queue.length - 1, false];
  g.at = Math.max(0, g.at);
}

function leave(room) {
  for (const o of state.groups) o.rooms = o.rooms.filter((r) => r !== room);
  state.groups = state.groups.filter((o) => o.rooms.length);
}

function add(g, x, where) {
  const ids = x.songs ?? [x.id], what = x.songs ? `${x.title} (${ids.length} songs)` : x.title;
  if (where === "replace") {
    g.queue = ids.map(entry);
    Object.assign(g, { kind: "queue", at: 0, pos: 0, playing: true });
    return toast(`Playing ${what}`);
  }
  const empty = !g.queue.length;
  g.queue.splice(where === "next" && !empty ? g.at + 1 : g.queue.length, 0, ...ids.map(entry));
  if (empty && g.kind === "queue") g.playing = true;
  toast(g.kind === "radio" ? `Added ${what}. The radio is still on: tap a song in the queue to start it.` : `${where === "next" ? "Playing next" : "Added to the end"}: ${what}`);
}

const DO = {
  device(d) { state.device = d.v; if (tablet() && state.open && !state.panel) state.panel = "queue"; },
  open(d) { Object.assign(state, { open: d.g, panel: tablet() ? "queue" : null, anim: "big" }); },
  close() { Object.assign(state, { open: null, panel: null, lyrics: false }); },
  panel(d) { state.panel = d.v === state.panel && !tablet() ? null : d.v || null; state.anim = "side"; },
  lyrics() { state.lyrics = !state.lyrics; },
  nav(d) { toast(`In Home Assistant this would ${d.v}.`); },
  toggle(d) { const g = group(d.g); g.playing = !g.playing; },
  next(d) { advance(group(d.g)); },
  prev() { const g = group(); g.pos > 5 ? (g.pos = 0) : advance(g, -1); },
  flag(d) { const g = group(); g[d.v] = !g[d.v]; },
  filter(d) { state.filter = d.v; },
  menu(d) { state.menu = d.id; },
  shut(d, el, e) { if (e.target === el) Object.assign(state, { menu: null, dialog: null }); },
  yes() { const act = state.dialog.act; Object.assign(state, { menu: null, dialog: null }); act(); },
  jump(d) { const g = group(); Object.assign(g, { kind: "queue", at: +d.i, pos: 0, playing: true }); },

  party() {
    const g = group();
    g.party = !g.party;
    toast(g.party ? "Party on. The queue, the rooms and the volume can only be changed from this card." : "Party off. Other apps can change things again.");
  },
  love() { const g = group(), t = now(g).title; g.loved[t] = !g.loved[t]; if (g.loved[t]) toast("Loved. Love it or Loathe it will remember."); },
  loathe() {
    const g = group(), t = now(g).title;
    advance(g);
    toast(g.kind === "radio" ? `Loathed "${t}". Love it or Loathe it finds something better.` : `Loathed "${t}": skipped, and it won't be chosen again.`);
  },
  room(d) {
    const g = group(), inn = g.rooms.includes(d.r);
    if (inn && g.rooms.length === 1) return toast("That is the last room. Pause the music to stop it.");
    leave(d.r);
    if (!inn) g.rooms.push(d.r);
  },
  remove(d) {
    const g = group(), i = +d.i;
    g.queue.splice(i, 1);
    if (i < g.at) g.at--;
    else if (i === g.at) g.pos = 0;
    if (g.at >= g.queue.length) [g.at, g.playing] = [Math.max(0, g.queue.length - 1), false];
  },
  add(d) {
    const g = group(), x = song[d.id] ?? PLAYLISTS.find((p) => p.id === d.id);
    state.menu = null;
    // Not asked about: the real player keeps the queue and offers to put it back.
    add(g, x, d.w);
  },
  station(d) {
    const g = group(), st = STATIONS.find((s) => s.id === d.id);
    Object.assign(g, { kind: "radio", station: st, tick: 0, secs: 0, playing: true });
    toast(g.queue.length ? `Playing ${st.title}. The queue is kept for later.` : `Playing ${st.title}`);
  },
  start(d) {
    const g = { id: `g${++keys}`, kind: "queue", rooms: [d.r], queue: [], at: 0, pos: 0, playing: false, party: false, loved: {} };
    state.groups.push(g);
    Object.assign(state, { open: g.id, panel: "search", anim: "big" });
  },

  /** Something done from outside the card. With Party on it is put back and written down. */
  guest(d) {
    const g = state.groups.find((o) => o.rooms.includes("Den")) ?? state.groups[0];
    const made = GUEST[d.v](g);
    if (!made) return toast("There is nothing there for a guest to change.");
    const [what, undo] = made;
    if (!g.party) return toast(`Someone ${what}. Party is off, so it stays.`);
    setTimeout(() => {
      undo();
      state.undone.unshift({ what, at: clock() });
      toast(`Put back: someone ${what}`, true);
      render();
    }, 1200);
  },
};

// Each returns what was done and how to undo it, or nothing when it can't be done.
const GUEST = {
  remove(g) {
    const gone = g.queue.splice(g.at + 1, 3);
    return gone.length && [`took ${gone.length} songs out of the queue`, () => g.queue.splice(g.at + 1, 0, ...gone)];
  },
  own(g) {
    const was = { kind: g.kind, pos: g.pos };
    g.queue.splice(g.at, 0, entry("guest"));
    Object.assign(g, { kind: "queue", pos: 0 });
    return ["played a song of their own", () => { g.queue.splice(g.queue.findIndex((e) => e.id === "guest"), 1); Object.assign(g, was); }];
  },
  loud(g) {
    const was = Object.fromEntries(g.rooms.map((r) => [r, state.vol[r]]));
    for (const r of g.rooms) state.vol[r] = 90;
    return ["turned the volume up to 90", () => Object.assign(state.vol, was)];
  },
  pull(g) {
    if (g.rooms.length < 2) return null;
    const room = g.rooms.pop();
    return [`took the ${room} out of the group`, () => { leave(room); g.rooms.push(room); }];
  },
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-do]");
  if (!el) return;
  DO[el.dataset.do](el.dataset, el, e);
  render();
});

// Sliders and the search box change what they must without a redraw, which would end the drag
// or move the cursor; the redraw comes when the slider is let go.
document.addEventListener("input", (e) => {
  const d = e.target.dataset, v = +e.target.value;
  if (d.in) {
    state.q = e.target.value;
    $("#results").innerHTML = results();
  } else if (d.vol) {
    state.vol[d.vol] = v;
    document.querySelector(`output[data-v="${d.vol}"]`).textContent = v;
  } else if (d.gvol) {
    // Sonos has a volume for each room, so the one slider moves every room by the same amount.
    const g = group(d.gvol), by = v - average(g);
    for (const r of g.rooms) state.vol[r] = Math.max(0, Math.min(100, state.vol[r] + by));
  }
});
document.addEventListener("change", (e) => e.target.type === "range" && render());

// ===== Dragging a song to a new place in the queue =====
const ROW = 56;
let drag = null;
document.addEventListener("pointerdown", (e) => {
  const handle = e.target.closest(".handle");
  if (!handle) return;
  const row = handle.closest(".row"), from = +row.dataset.i;
  drag = { row, from, to: from, y: e.clientY };
  row.classList.add("drag");
  e.preventDefault();
});
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dy = e.clientY - drag.y, rows = [...document.querySelectorAll(".q .row")];
  drag.to = Math.max(0, Math.min(rows.length - 1, drag.from + Math.round(dy / ROW)));
  for (const r of rows) {
    const i = +r.dataset.i;
    const shift = r === drag.row ? dy : drag.from < i && i <= drag.to ? -ROW : drag.to <= i && i < drag.from ? ROW : 0;
    r.style.transform = shift ? `translateY(${shift}px)` : "";
  }
});
document.addEventListener("pointerup", () => {
  if (!drag) return;
  const g = group(), current = g.queue[g.at];
  g.queue.splice(drag.to, 0, ...g.queue.splice(drag.from, 1));
  g.at = g.queue.indexOf(current);
  drag = null;
  render();
});

// ===== Time passing: songs play on, and a station moves to its next song =====
setInterval(() => {
  let changed = false;
  for (const g of state.groups) {
    if (!g.playing) continue;
    if (g.kind === "radio") {
      if (++g.secs % 25 === 0) changed = !!++g.tick;
    } else if (g.queue.length && ++g.pos >= now(g).secs) {
      advance(g);
      changed = true;
    }
    const n = now(g), bar = document.querySelector(`[data-bar="${g.id}"]`);
    if (bar && n.secs) bar.style.width = `${(100 * g.pos) / n.secs}%`;
  }
  if (changed && !drag) return render();

  const g = group();
  if (!g || g.kind === "radio" || !$("#bar")) return;
  const n = now(g);
  $("#bar").style.width = `${n.secs ? (100 * g.pos) / n.secs : 0}%`;
  $("#t0").textContent = mmss(g.pos);
  const line = Math.min(LYRICS.length - 1, Math.floor((g.pos / (n.secs || 1)) * LYRICS.length));
  document.querySelectorAll("#lyr > span").forEach((el, i) => el.classList.toggle("on", i === line));
}, 1000);

render();
