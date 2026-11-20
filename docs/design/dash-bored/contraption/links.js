// The linkages: what happens between a lever being pulled and the thing it works. Each
// is drawn in a space 70 wide and 150 tall, takes its pull from the left and ends by
// striking the paddle on its right.
//
// `pose(q, p)` draws it a fraction `p` of the way through its run. `hit` is the moment
// in the run that the paddle is struck. `secs` is how long the run takes. One that
// `resets` stays as it fell until the unicycle bot has put it right; the others spring
// back by themselves.
window.Links = (() => {
  const { ease, phase, set, move, turn, show } = Kit;
  const each = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join("");

  // Where the ball goes: down three ramps and into the cup.
  const RUN = [[6, 34], [58, 48], [62, 62], [12, 76], [8, 90], [58, 104], [63, 119]];

  return [
    { name: "dominoes", how: "the fall of six dominoes", secs: 1.1, hit: 1, resets: true,
      art: `<path d="M2,128 H66"/><path class="thin" d="M8,128 v8 M60,128 v8"/>` +
        each(6, (i) => `<rect data-p="dom${i}" class="fill" x="${6 + i * 10}" y="106" width="4" height="22"/>`),
      pose(q, p) {
        for (let i = 0; i < 6; i++) turn(q(`dom${i}`), 66 * ease(phase(p, i * 0.14, i * 0.14 + 0.3)), 10 + i * 10, 128);
      } },

    { name: "ball", how: "a marble, by three ramps", secs: 1.6, hit: 1, resets: true,
      art: `<path d="M4,40 L60,54 M64,68 L10,82 M4,96 L60,110"/><path d="M55,122 q8,9 16,0"/>
        <circle data-p="ball" class="solid" r="4"/>`,
      pose(q, p) {
        const u = p * (RUN.length - 1), i = Math.min(Math.floor(u), RUN.length - 2), f = u - i;
        move(q("ball"), RUN[i][0] + (RUN[i + 1][0] - RUN[i][0]) * f, RUN[i][1] + (RUN[i + 1][1] - RUN[i][1]) * f);
      } },

    { name: "tongs", how: "a boxing glove on lazy tongs", secs: 0.7, hit: 0.5, resets: false,
      art: `<path class="hatch" d="M0,88 h8 v26 h-8 z"/><path data-p="tong"/>
        <g data-p="glove"><path class="fill" d="M0,-8 q13,-2 13,8 q0,9 -13,8 z"/><path d="M4,-8 q2,-6 7,-3"/></g>`,
      pose(q, p) {
        const out = Math.sin(Math.PI * p), w = 3 + 9 * out, h = 9 - 5 * out;
        let d = "";
        for (let i = 0; i < 5; i++) {
          const a = 8 + i * w, b = a + w;
          d += `M${a},${101 - h} L${b},${101 + h} M${a},${101 + h} L${b},${101 - h} `;
        }
        set(q("tong"), "d", d);
        move(q("glove"), 8 + 5 * w, 101);
      } },

    { name: "string", how: "a candle that burns a string", secs: 2, hit: 1, resets: true,
      art: `<path d="M30,6 H62 M48,6 V10 M2,46 H40"/><path class="thin" d="M48,10 V30"/>
        <g data-p="drop"><path class="thin" d="M0,30 V52"/><path class="hatch" d="M-10,52 h20 l-3,16 h-14 z"/></g>
        <path data-p="burn" class="flame" d="M48,33 q-4,-6 0,-11 q4,5 0,11 z"/>
        <g data-p="trolley"><rect class="fill" x="-4" y="-22" width="8" height="18"/>
          <path class="flame flick" d="M0,-24 q-5,-7 0,-14 q5,7 0,14 z"/>
          <circle class="fill" cx="-4" cy="-2" r="2.5"/><circle class="fill" cx="4" cy="-2" r="2.5"/></g>`,
      pose(q, p) {
        move(q("trolley"), 8 + 34 * ease(phase(p, 0, 0.35)), 46);
        show(q("burn"), phase(p, 0.35, 0.45) * (1 - phase(p, 0.7, 0.8)));
        move(q("drop"), 48, 62 * phase(p, 0.7, 1) ** 2);
      } },

    { name: "bellows", how: "bellows, and a windmill", secs: 1, hit: 0.6, resets: false,
      art: `<path data-p="jaw" class="fill"/><path d="M44,116 h7 M60,96 V150"/>
        <circle data-p="gust" class="fill" r="4"/>
        <g transform="translate(60,96)"><g data-p="mill"><path class="fill" d="M0,0 L0,-12 L6,-6 Z M0,0 L12,0 L6,6 Z M0,0 L0,12 L-6,6 Z M0,0 L-12,0 L-6,-6 Z"/></g></g>`,
      pose(q, p) {
        const top = 94 + 22 * Math.sin(Math.PI * phase(p, 0, 0.5)), g = phase(p, 0.2, 0.6);
        set(q("jaw"), "d", `M44,112 L6,${top} L6,126 L44,120 Z M14,${top + 3} V124 M24,${top + 8} V122 M34,${(top + 112) / 2 + 4} V121`);
        move(q("gust"), 52 + 6 * g, 114 - 10 * g);
        show(q("gust"), g > 0 && g < 1 ? 0.8 : 0);
        turn(q("mill"), 900 * ease(phase(p, 0.3, 1)));
      } },
  ];
})();
