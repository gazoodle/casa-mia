// The engine house: what the whole house has to say, as opposed to one room. The kettle
// and flywheel that turn the line shaft (faster, the more the house draws), a governor
// and a gauge for the power, a weather frog, a hat peg for each of the household, the
// whistle that Sensor Watch blows, and the parts left over after assembly (devices that
// are in no room).
window.Engine = (() => {
  const { clamp, spring, turn, move, show, wheel } = Kit;
  // How far up its ladder the frog sits, for Home Assistant's word for the sky.
  const FROG = { sunny: 326, "clear-night": 330, partlycloudy: 346, cloudy: 360, fog: 368, rainy: 384, pouring: 390, snowy: 390 };
  const SKY = { sunny: "fine", partlycloudy: "fair", cloudy: "dull", rainy: "wet", pouring: "very wet" };
  // The scene barrel: a column of pins for each scene, a pin for each device it sets.
  // `turns` is how many times it has been asked to go round.
  const barrel = { x: 0, v: 0 }, found = {};
  let el, q, turns = 0;
  const pins = (fn) => House.scenes.map((s, i) => s.on.map((_, j) => fn(i, j, s.on.length)).join("")).join("");

  const hat = (p, i) => `<path d="M${94 + i * 36},308 v9"/>
    <g data-p="hat${i}" transform="translate(${94 + i * 36},317)"><path class="fill" d="M-7,0 v-11 h14 v11 z"/><path d="M-11,0 h22"/></g>
    <text x="${94 + i * 36}" y="344" text-anchor="middle">${p.name}</text>`;

  function build(into) {
    el = into;
    el.innerHTML = `<svg class="ink" width="190" height="416" viewBox="0 0 190 416">
      <ellipse class="wash" cx="84" cy="212" rx="78" ry="50"/>
      <path d="M150,10 H190 M150,15 H190"/>
      <!-- the scene barrel, and the rod it works, which runs along every bay -->
      <path class="thin" d="M100,30 L132,24 H190 M56,26 H100 V30"/><path d="M52,50 H104"/>
      <path class="fill" d="M58,28 h40 v44 h-40 z"/>${pins((i, j) => `<circle class="solid" data-p="pin${i}_${j}" r="1.7"/>`)}
      <path class="thin" d="M136,12 L80,122 M164,12 L160,122"/>${wheel(150, 12, 14, 1)}${wheel(120, 122, 40, 0.35)}
      <path d="M120,122 L74,168 M120,162 V266 M104,266 H136"/><circle class="solid" cx="74" cy="168" r="3"/>
      <!-- the governor: its balls fly out as the house draws more -->
      <path d="M40,22 V86 M28,86 H52"/>
      <g transform="translate(40,30)"><g data-p="armL"><path d="M0,0 V26"/><circle class="solid" cy="30" r="5"/></g>
        <g data-p="armR"><path d="M0,0 V26"/><circle class="solid" cy="30" r="5"/></g></g>
      <!-- the kettle, its stove, its steam and its whistle -->
      <g data-p="steam"><circle class="puff fill" cx="104" cy="156" r="7"/><circle class="puff fill" cx="104" cy="156" r="7" style="animation-delay:.8s"/>
        <circle class="puff fill" cx="104" cy="156" r="7" style="animation-delay:1.6s"/></g>
      <path class="fill" d="M20,222 q-4,-46 38,-46 q42,0 38,46 z"/><path d="M92,200 q14,-6 12,-38 M26,194 q-24,6 -8,26 M42,176 q16,-12 32,0"/>
      <circle class="solid" cx="58" cy="167" r="3"/><path class="hatch" d="M12,222 h92 v10 h-92 z"/><path d="M22,232 v34 M94,232 v34"/>
      <g data-p="fire"><path class="flame flick" d="M42,260 q-8,-12 2,-22 q8,10 -2,22 z"/><path class="flame flick" d="M58,260 q-8,-14 2,-26 q8,12 -2,26 z" style="animation-delay:.1s"/>
        <path class="flame flick" d="M74,260 q-8,-12 2,-22 q8,10 -2,22 z" style="animation-delay:.2s"/></g>
      <path d="M78,180 v-34 h10 v8"/><g data-p="toot"><circle class="puff fill" cx="88" cy="150" r="6"/><path d="M96,140 l8,-8 M98,150 h10 M96,160 l8,8"/></g>
      <g transform="translate(160,206)"><circle class="fill" r="20"/><path class="thin" d="M-15,-8 l3,2 M0,-18 v4 M15,-8 l-3,2"/>
        <path data-p="kw" d="M0,5 V-15" stroke-width="2"/><circle class="solid" cy="5" r="2"/><text x="-7" y="15">kW</text></g>
      <path d="M4,266 H186"/><path class="thin" d="M10,272 l8,-6 M60,272 l8,-6 M150,272 l8,-6"/>
      <!-- the weather frog in its jar -->
      <path class="fill" d="M14,404 V318 q0,-8 8,-8 h24 q8,0 8,8 V404 z"/>
      <path class="thin" d="M26,400 V322 M42,400 V322 M26,332 h16 M26,346 h16 M26,360 h16 M26,374 h16 M26,388 h16"/>
      <g data-p="frog"><ellipse class="solid" rx="8" ry="5"/><circle class="solid" cx="-5" cy="-5" r="2.5"/><circle class="solid" cx="5" cy="-5" r="2.5"/></g>
      <!-- hats on pegs, and the tray of parts left over -->
      <path class="hatch" d="M76,300 h108 v8 h-108 z"/>${House.people.map(hat).join("")}
      <path class="fill" d="M78,384 h104 l-6,20 h-92 z"/>
      <path d="M96,378 l10,6 M118,376 q4,-6 8,0 q4,6 8,0 M150,380 h12 M156,374 v12"/><circle class="fill" cx="96" cy="376" r="3"/>
      <path d="M4,404 H186"/></svg>
      <p class="fig" data-line="power"></p><p class="fig" data-line="frog"></p><p class="fig" data-line="hats"></p>
      <p class="fig" data-line="loose"></p><ul class="labels"></ul><p class="notice"></p>`;
    q = (name) => (found[name] ??= el.querySelector(`[data-p="${name}"]`));
  }

  // What changes only when the house does. `since` is when the data stopped coming,
  // or nothing while it is coming.
  function paint(kw, since) {
    const line = (name, html) => { el.querySelector(`[data-line="${name}"]`).innerHTML = html; };
    const out = House.outside, home = House.people.filter((p) => p.home).map((p) => p.name);

    line("power", `Fig. 1. The motive power<i>the house is drawing ${kw.toFixed(2)} kW</i>`);
    line("frog", `The weather frog<i>${out.temp}° outside, and ${SKY[out.sky] ?? out.sky}</i>`);
    line("hats", `A hat on its peg is someone in<i>${home.join(" and ") || "nobody"} at home</i>`);
    line("loose", `Left over after assembly<i>${House.loose.length} parts that belong to no room</i>`);
    move(q("frog"), 34, FROG[out.sky] ?? 360);
    House.people.forEach((p, i) => show(q(`hat${i}`), p.home ? 1 : 0));

    show(q("toot"), House.alerts.length ? 1 : 0);
    el.querySelector(".labels").innerHTML = House.alerts.map((a) => `<li>${a.text}<i>since ${a.since}</i></li>`).join("");
    el.querySelector(".notice").textContent = since ? `No steam since ${since}. Nothing shown here is current.` : "";
    show(q("fire"), since ? 0 : 1); show(q("steam"), since ? 0 : 1);
  }

  // `steam` is 1 while the data is coming and falls to 0 when it stops.
  function tick(kw, steam, dt) {
    const out = 12 + 50 * clamp(kw / 3) * steam;
    turn(q("armL"), out); turn(q("armR"), -out);
    turn(q("kw"), -60 + 120 * clamp(kw / 3), 0, 5);

    // The barrel is seen from the side: a pin goes up and down as it comes round, and
    // is out of sight while it is at the back.
    const round = spring(barrel, turns, dt, 14, 7) * 2 * Math.PI;
    pins((i, j, n) => {
      const a = round + (j / n) * 2 * Math.PI + i;
      move(q(`pin${i}_${j}`), 63 + i * 10, 50 + 20 * Math.sin(a));
      show(q(`pin${i}_${j}`), Math.cos(a) > 0 ? 1 : 0);
      return "";
    });
  }

  // A scene was set: the barrel goes round once.
  function pull() { turns += 1; }

  return { build, paint, tick, pull };
})();
