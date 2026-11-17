// The drawings Aurora's season and holiday skins are decorated with (seasons.ts says which
// skin has which). Four kinds: the machines that tidy the ground (MACHINES), what drifts over the page (GLYPHS, each drawn in a box of
// 24), what stands in the greeting tile's empty corner (HEROES, each in a box 200 by 160
// with the ground at its foot), and a strip along the foot of the page (FEET, each a
// pattern 240 by 74 that is repeated across). All are drawn here, by hand, in plain
// shapes: none is a picture file, and none is anyone else's drawing.
import { svg, type TemplateResult } from "lit";

const INK = "#2b2f3a";
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** A daisy: its petals round a yellow middle. */
const daisy = (x: number, y: number, r: number) => svg`<g transform="translate(${x} ${y})">
  ${range(10).map((i) => svg`<ellipse rx=${r * 0.28} ry=${r * 0.6} cy=${-r * 0.62} fill="#fff" stroke="#d9dfe8" stroke-width=".6" transform="rotate(${i * 36})"/>`)}
  <circle r=${r * 0.34} fill="#f5c542"/></g>`;
/** An egg with a band round it. */
const egg = (x: number, y: number, r: number, fill: string, band: string) => svg`<g transform="translate(${x} ${y})">
  <ellipse rx=${r} ry=${r * 1.3} fill=${fill}/><path d="M${-r * 0.96} ${-r * 0.2}q${r * 0.48} ${r * 0.5} ${r * 0.96} 0t${r * 0.96} 0" fill="none" stroke=${band} stroke-width=${r * 0.28}/></g>`;
/** A leaf, by its colour. */
const leaf = (x: number, y: number, turn: number, fill: string) => svg`<path transform="translate(${x} ${y}) rotate(${turn}) scale(.75)" d="M0-12C-8-6-9 4-4 12 6 10 12 2 10-8 6-11 3-12 0-12zM-4 12L5-3" fill=${fill} stroke="#7a3d12" stroke-width=".8"/>`;
const blades = (y: number) => svg`<path d="M6 ${y}l3-14 3 14m16 0l4-18 2 18m22 0l2-12 4 12m18 0l4-16 3 16m24 0l2-13 4 13m20 0l4-17 2 17m22 0l3-12 3 12m20 0l4-16 3 16m18 0l2-12 4 12" fill="none" stroke="#3f9a3f" stroke-width="2.4" stroke-linecap="round"/>`;
const drift = svg`<path d="M0 74V38q40-14 80 0t80-4 80 4v36z" fill="#dbe9f7"/><path d="M0 74V48q30-16 60-4t60-6 60 6 60-2v32z" fill="#fff"/>`;

/** What drifts over the page. Each is in the colour its skin gives it (`currentColor`). */
export const GLYPHS: Record<string, TemplateResult> = {
  flake: svg`<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 6l-2.5-2.500M12 6l2.5-2.500M12 18l-2.5 2.500M12 18l2.5 2.5" fill="none" stroke="#9cc4e8" stroke-width="3.4" stroke-linecap="round" opacity=".55"/>
    <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M12 6l-2.5-2.500M12 6l2.5-2.500M12 18l-2.5 2.500M12 18l2.5 2.5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
  petal: svg`<ellipse cx="12" cy="12" rx="5" ry="9" fill="#fff" stroke="currentColor" stroke-width="1.2" transform="rotate(25 12 12)"/>`,
  leaf: svg`<path d="M12 2C5 7 3 14 7 22c9-1 14-8 12-17-3-2-5-3-7-3zM7 22L15 9" fill="currentColor" stroke="#7a3d12" stroke-width="1"/>`,
  heart: svg`<path d="M12 21C5 15 2 11 2 7.500A5 5 0 0 1 12 6a5 5 0 0 1 10 1.500C22 11 19 15 12 21z" fill="currentColor"/>`,
  bat: svg`<path d="M12 9l-1.5-3-1 3.500C7 7 4 7 1 9c2 1 3 3 3 5 1.5-1 3-1 4 .500 1-1 2-.500 2.5 1L12 18l1.5-2.500c.500-1.5 1.5-2 2.5-1 1-1.5 2.5-1.5 4-.500 0-2 1-4 3-5-3-2-6-2-8.5.500l-1-3.500z" fill="currentColor"/>`,
  gull: svg`<path d="M1 14q6-9 11-1 5-8 11 1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  // A firework: sparks flying out from where it burst.
  burst: svg`${range(12).map((i) => svg`<path d="M12 7V2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" transform="rotate(${i * 30} 12 12)"/>`)}
    ${range(6).map((i) => svg`<circle cx="12" cy="5.5" r=".9" fill="#fff" transform="rotate(${i * 60 + 15} 12 12)"/>`)}`,
};

// A propeller on a mast: a machine flies from one ledge to the next by it, and it is shown only then (season-styles.ts).
const prop = (x: number, y: number) => svg`<g class="prop"><path d="M${x} ${y}V${y - 9}" stroke=${INK} stroke-width="1.6"/><ellipse class="whirr" cx=${x} cy=${y - 10} rx="17" ry="2.600" fill="#9aa3b2" opacity=".8" style="transform-origin: ${x}px ${y - 10}px"/></g>`;

/** What tidies the ledges (drift.ts), each in a box 60 by 56, facing right with its wheels at the foot and room over it for its propeller. */
export const MACHINES: Record<string, TemplateResult> = {
  // A robot that collects leaves and petals: a scoop in front, one eye, and a lamp on its aerial.
  robot: svg`${prop(30, 12)}<path d="M46 22l12 7v9H44z" fill="#9aa3b2" stroke=${INK} stroke-width="1.4" stroke-linejoin="round"/>
    <rect x="8" y="12" width="40" height="22" rx="7" fill="#e8ecf2" stroke=${INK} stroke-width="1.6"/><path d="M13 19h9" stroke="#3f9a3f" stroke-width="3" stroke-linecap="round"/>
    <circle cx="37" cy="21" r="5.500" fill="#fff" stroke=${INK} stroke-width="1.4"/><circle cx="38.500" cy="21" r="2.200" fill=${INK}/>
    <path d="M20 12V5" stroke=${INK} stroke-width="1.6"/><circle class="twinkle" cx="20" cy="4" r="2.800" fill="#e2483d"/>
    <circle cx="18" cy="36" r="6" fill=${INK}/><circle cx="18" cy="36" r="2" fill="#9aa3b2"/><circle cx="38" cy="36" r="6" fill=${INK}/><circle cx="38" cy="36" r="2" fill="#9aa3b2"/>`,
  // A snow blower: the auger in front, and a chute that throws the snow up behind it.
  blower: svg`${prop(36, 14)}<path d="M28 15V8q0-5-8-5" fill="none" stroke="#c9342c" stroke-width="6" stroke-linecap="round"/><path d="M13 20L3 9" stroke=${INK} stroke-width="2.600" stroke-linecap="round"/>
    <rect x="12" y="14" width="30" height="19" rx="4" fill="#e2483d" stroke=${INK} stroke-width="1.6"/>
    <path d="M42 17h11a5 5 0 0 1 5 5v16H42z" fill="#f5c542" stroke=${INK} stroke-width="1.6" stroke-linejoin="round"/><path d="M45 24l10 5m-10 2l10 5" stroke=${INK} stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="22" cy="36" r="6" fill=${INK}/><circle cx="22" cy="36" r="2" fill="#9aa3b2"/>`,
};

/** What stands in the greeting tile's corner. `at` is the time, for the one drawing that tells it. */
export const HEROES: Record<string, (at: Date) => TemplateResult> = {
  snowman: () => svg`<ellipse cx="100" cy="155" rx="84" ry="7" fill="#fff"/>
    <path d="M64 110L34 88m8 6l-2-12m2 12l-12 2M136 110l30-22m-8 6l2-12m-2 12l12 2" stroke="#6b4a2f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="100" cy="118" r="38" fill="#fff" stroke="#b9cfe6" stroke-width="1.5"/><circle cx="100" cy="66" r="27" fill="#fff" stroke="#b9cfe6" stroke-width="1.5"/>
    <rect x="80" y="24" width="40" height="22" rx="3" fill=${INK}/><rect x="70" y="42" width="60" height="6" rx="3" fill=${INK}/><rect x="80" y="36" width="40" height="5" fill="#d8413c"/>
    <circle cx="91" cy="62" r="3" fill=${INK}/><circle cx="109" cy="62" r="3" fill=${INK}/><path d="M100 68l22 5-22 4z" fill="#f08a24"/>
    <path d="M76 84q24 12 48 0v9q-24 12-48 0z" fill="#d8413c"/><path d="M112 90l8 26-10 2-6-24z" fill="#d8413c"/>
    ${[108, 124, 140].map((y) => svg`<circle cx="100" cy=${y} r="3.2" fill=${INK}/>`)}`,
  tree: () => svg`<rect x="62" y="132" width="12" height="22" fill="#6b4a2f"/>
    <path d="M68 14l26 40H80l24 36H88l26 42H22l26-42H32l24-36H42z" fill="#1f7a4a"/>
    <path d="M68 2l4 9 10 1-7.5 7 2 10-8.5-5-8.5 5 2-10L54 12l10-1z" fill="#f5c542"/>
    ${[[60, 60, "#d8413c"], [80, 80, "#f5c542"], [50, 100, "#4aa3df"], [86, 112, "#d8413c"], [66, 120, "#f5c542"], [40, 124, "#fff"]].map(([x, y, fill]) => svg`<circle class="twinkle" cx=${x} cy=${y} r="4.5" fill=${fill} style="animation-delay: -${Number(x) % 7}s"/>`)}
    <rect x="120" y="112" width="44" height="42" rx="3" fill="#d8413c"/><rect x="139" y="112" width="6" height="42" fill="#f5c542"/><rect x="120" y="128" width="44" height="6" fill="#f5c542"/>
    <path d="M142 112q-14-16-18-4t18 4q14-16 18-4t-18 4" fill="none" stroke="#f5c542" stroke-width="4"/>
    <rect x="160" y="128" width="32" height="26" rx="3" fill="#2f8fd0"/><rect x="174" y="128" width="5" height="26" fill="#fff"/>
    <rect x="100" y="136" width="24" height="18" rx="2" fill="#f5c542"/><rect x="110" y="136" width="4" height="18" fill="#d8413c"/>`,
  // The clock tells the time it is, so that midnight can be watched for.
  clock: (at) => svg`<path d="M20 150q20-50 8-96M176 150q-16-44-2-90" fill="none" stroke="#e8436e" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 9"/>
    <circle cx="100" cy="88" r="60" fill="#fff" stroke=${INK} stroke-width="5"/>
    ${range(12).map((i) => svg`<path d="M100 36v${i % 3 ? 6 : 12}" stroke=${INK} stroke-width=${i % 3 ? 2 : 4} stroke-linecap="round" transform="rotate(${i * 30} 100 88)"/>`)}
    <path d="M100 88V56" stroke=${INK} stroke-width="6" stroke-linecap="round" transform="rotate(${((at.getHours() % 12) + at.getMinutes() / 60) * 30} 100 88)"/>
    <path d="M100 88V42" stroke=${INK} stroke-width="3.5" stroke-linecap="round" transform="rotate(${at.getMinutes() * 6} 100 88)"/>
    <circle cx="100" cy="88" r="5" fill="#e8436e"/>
    <path d="M52 30l-8-18 18 8zM148 30l8-18-18 8z" fill="#f5c542"/>`,
  heart: () => svg`<path d="M8 124L192 38" stroke="#7a5a30" stroke-width="4" stroke-linecap="round"/><path d="M8 124l-4-13m4 13l-14 2m22-8l-4-13m4 13l-14 2" stroke="#7a5a30" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path class="beat" d="M100 150C40 104 20 76 20 50a36 36 0 0 1 80-14 36 36 0 0 1 80 14c0 26-20 54-80 100z" fill="#e8436e"/>
    <path d="M44 46a18 18 0 0 1 22-14" stroke="#fff" opacity=".6" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M192 38l-24 1 11 18z" fill="#7a5a30"/>`,
  daisies: () => svg`<path d="M0 160q100-22 200 0z" fill="#6cbf5a"/>
    <path d="M60 150q-6-50 4-84M110 152q4-60-6-104M150 150q8-40 0-66M86 150q-10-20-22-24M124 150q12-22 24-24" fill="none" stroke="#3f9a3f" stroke-width="3.5" stroke-linecap="round"/>
    ${daisy(64, 62, 24)}${daisy(104, 44, 30)}${daisy(150, 80, 22)}
    <g class="bob"><ellipse cx="166" cy="32" rx="11" ry="8" fill="#f5c542" stroke=${INK} stroke-width="1.5"/><path d="M162 25v14M168 25v14" stroke=${INK} stroke-width="2.5"/>
      <ellipse cx="160" cy="22" rx="7" ry="4.5" fill="#fff" opacity=".85" stroke="#9aa3ad" stroke-width=".8" transform="rotate(-25 160 22)"/><ellipse cx="170" cy="21" rx="7" ry="4.5" fill="#fff" opacity=".85" stroke="#9aa3ad" stroke-width=".8" transform="rotate(20 170 21)"/></g>`,
  bunny: () => svg`<path d="M0 160q100-20 200 0z" fill="#6cbf5a"/>
    <path d="M84 86q-16-60 4-68 14 8 10 68zM116 86q16-60-4-68-14 8-10 68z" fill="#f4efe9" stroke="#d9cfc4" stroke-width="1.5"/><path d="M86 76q-8-40 2-48 6 8 4 48zM114 76q8-40-2-48-6 8-4 48z" fill="#f7b6cf"/>
    <ellipse cx="100" cy="112" rx="38" ry="32" fill="#f4efe9" stroke="#d9cfc4" stroke-width="1.5"/>
    <circle cx="86" cy="104" r="4" fill=${INK}/><circle cx="114" cy="104" r="4" fill=${INK}/><path d="M96 114h8l-4 5z" fill="#f08aa8"/>
    <path d="M100 119v6m0 0q-6 5-11 1m11-1q6 5 11 1M72 116l-20-4m20 9l-20 4M128 116l20-4m-20 9l20 4" fill="none" stroke="#9a8f86" stroke-width="1.5" stroke-linecap="round"/>
    ${egg(38, 136, 15, "#f7b6cf", "#fff")}${egg(162, 138, 14, "#a8d8f0", "#fbe38a")}${egg(134, 144, 11, "#fbe38a", "#f08aa8")}${egg(66, 146, 10, "#c9b6f0", "#fff")}
    ${blades(160)}`,
  sandcastle: () => svg`<path d="M0 160q100-26 200 0z" fill="#ecd29a"/>
    <path d="M100 44V12" stroke="#7a5a30" stroke-width="2.5" stroke-linecap="round"/><path class="wave" d="M100 12l26 7-26 9z" fill="#e2483d"/>
    <rect x="85" y="44" width="30" height="52" fill="#e3bd76"/>${[85, 97, 109].map((x) => svg`<rect x=${x} y="36" width="6" height="9" fill="#e3bd76"/>`)}
    <rect x="56" y="86" width="88" height="62" fill="#e3bd76"/>${[56, 73, 90, 107, 124, 138].map((x) => svg`<rect x=${x} y="77" width="9" height="10" fill="#e3bd76"/>`)}
    ${[38, 132].map((x) => svg`<rect x=${x} y="62" width="30" height="88" fill="#d9b166"/>${[0, 11, 22].map((dx) => svg`<rect x=${x + dx} y="53" width="8" height="10" fill="#d9b166"/>`)}<rect x=${x + 11} y="78" width="8" height="14" rx="4" fill="#a9824a"/>`)}
    <rect x="96" y="58" width="8" height="14" rx="4" fill="#a9824a"/><path d="M88 148v-22a12 12 0 0 1 24 0v22z" fill="#a9824a"/>
    <path d="M170 126l4 26h18l4-26z" fill="#e2483d"/><path d="M170 126q13-18 26 0" fill="none" stroke="#e2483d" stroke-width="2.5"/>
    <path d="M22 108l10 40" stroke="#2f8fd0" stroke-width="3.5" stroke-linecap="round"/><path d="M27 142l10 8-4 10-10-4z" fill="#2f8fd0"/>`,
  hedgehog: () => svg`<path d="M0 160q100-20 200 0z" fill="#b5651d" opacity=".55"/>
    <path d="M44 122l-12-14 17 5-5-19 17 12 0-21 14 16 7-21 10 18 12-16 5 20 14-11-2 19 15-5-8 17" fill="#5b3a1d" stroke="#5b3a1d" stroke-width="4" stroke-linejoin="round"/>
    <path d="M40 152q-6-50 48-54t62 36q4 10-2 18z" fill="#7a4f2a"/><path d="M136 126q32 2 48 24-12 4-48 2z" fill="#e6c9a0"/>
    <circle cx="184" cy="149" r="4.5" fill=${INK}/><circle cx="158" cy="134" r="3.2" fill=${INK}/><path d="M60 152v6m24-6v6m30-6v6" stroke="#5b3a1d" stroke-width="5" stroke-linecap="round"/>
    <path d="M12 154v-22h10v22z" fill="#f3ead8"/><path d="M-2 134q19-32 38 0z" fill="#d8413c"/><circle cx="12" cy="124" r="2.5" fill="#fff"/><circle cx="24" cy="128" r="2" fill="#fff"/>
    ${leaf(170, 110, 30, "#e0872a")}${leaf(28, 100, -40, "#c94f1d")}${leaf(120, 84, 80, "#e3b23c")}`,
  lantern: () => svg`<ellipse cx="80" cy="154" rx="70" ry="6" fill="#000" opacity=".25"/>
    <path d="M76 72q0-14 12-18l4 6q-6 4-6 12z" fill="#4c7a2a"/>
    <ellipse cx="80" cy="112" rx="62" ry="44" fill="#ee7a1c"/><ellipse cx="80" cy="112" rx="38" ry="44" fill="#f59330"/><ellipse cx="80" cy="112" rx="13" ry="44" fill="#ee7a1c"/>
    <g class="twinkle"><path d="M46 98l18-12 4 18zM114 98l-18-12-4 18zM74 110h12l-6-9z" fill="#ffe27a"/>
      <path d="M42 120l10 8 8-8 10 9 10-9 10 9 10-9 8 8 10-8q-8 28-38 28t-38-28z" fill="#ffe27a"/></g>
    <g class="bob"><path d="M150 150V92a22 22 0 0 1 44 0v58l-7.5-8-7 8-7.5-8-7 8-7.5-8z" fill="#fff" opacity=".93"/>
      <circle cx="165" cy="92" r="4" fill=${INK}/><circle cx="180" cy="92" r="4" fill=${INK}/><ellipse cx="172" cy="107" rx="4" ry="6" fill=${INK}/></g>`,
};

/** What runs along the foot of the page, either side of the bar. */
export const FEET: Record<string, TemplateResult> = {
  drift,
  presents: svg`${drift}
    <rect x="28" y="38" width="26" height="24" rx="2" fill="#d8413c"/><rect x="39" y="38" width="4" height="24" fill="#f5c542"/><path d="M41 38q-8-9-10-2t10 2q8-9 10-2t-10 2" fill="none" stroke="#f5c542" stroke-width="2.5"/>
    <path d="M118 62V40a8 8 0 0 1 16 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M118 62V40a8 8 0 0 1 16 0" fill="none" stroke="#d8413c" stroke-width="6" stroke-dasharray="5 6"/>
    <rect x="176" y="44" width="22" height="20" rx="2" fill="#1f7a4a"/><rect x="185" y="44" width="4" height="20" fill="#fff"/><rect x="196" y="50" width="18" height="16" rx="2" fill="#2f8fd0"/><rect x="203" y="50" width="4" height="16" fill="#f5c542"/>`,
  meadow: svg`<path d="M0 74V58q60-14 120 0t120 0v16z" fill="#6cbf5a"/>
    <path d="M30 60V38M96 58V28M150 60V42M210 58V32" stroke="#3f9a3f" stroke-width="2.5" stroke-linecap="round"/>
    ${daisy(30, 36, 11)}${daisy(96, 26, 13)}${daisy(150, 40, 10)}${daisy(210, 30, 12)}${blades(66)}`,
  eggs: svg`<path d="M0 74V58q60-14 120 0t120 0v16z" fill="#6cbf5a"/>
    ${egg(34, 54, 9, "#f7b6cf", "#fff")}${egg(104, 50, 10, "#a8d8f0", "#fbe38a")}${egg(168, 55, 8, "#fbe38a", "#f08aa8")}${egg(214, 52, 9, "#c9b6f0", "#fff")}${blades(68)}`,
  sea: svg`<path d="M162 34l22 4-22 6zM160 22v26" fill="#fff" stroke="#fff" stroke-width="2"/><path d="M146 48h32l-6 9h-20z" fill="#e2483d"/>
    <path d="M0 74V46q15-10 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v28z" fill="#4aa9dc"/><path d="M0 74V58q15-9 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0v16z" fill="#8fd0ee"/>`,
  leaves: svg`<path d="M0 74V58q30-14 60-4t60-6 60 6 60-2v22z" fill="#b5651d"/>
    ${[[14, 56, 20, "#e0872a"], [40, 50, -50, "#c94f1d"], [70, 60, 70, "#e3b23c"], [98, 50, 10, "#e0872a"], [128, 58, -30, "#a8421a"], [156, 50, 100, "#e3b23c"], [186, 58, -70, "#c94f1d"], [220, 52, 40, "#e0872a"]].map(([x, y, turn, fill]) => leaf(Number(x), Number(y), Number(turn), String(fill)))}
    <path d="M108 66v-12h6v12z" fill="#f3ead8"/><path d="M100 56q11-18 22 0z" fill="#d8413c"/>`,
  graves: svg`<path d="M0 74V60q60-8 120 0t120 0v14z" fill="#2a2033"/>
    <path d="M40 64V40a11 11 0 0 1 22 0v24z" fill="#6b6877"/><path d="M47 46h8m-4-4v12" stroke="#2a2033" stroke-width="2"/>
    <path d="M100 66V34m14 32V38m14 28V32m14 34V40M96 46h50M96 56h50" stroke="#2a2033" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="190" cy="56" rx="15" ry="11" fill="#ee7a1c"/><ellipse cx="190" cy="56" rx="6" ry="11" fill="#f59330"/><path d="M189 46q0-6 5-7" fill="none" stroke="#4c7a2a" stroke-width="3"/>
    <path d="M183 53l5-3 1 5zM197 53l-5-3-1 5zM183 60q7 5 14 0" fill="#ffe27a"/>`,
  skyline: svg`<path d="M0 74V44h18V30h20v20h14V22h22v30h12V38h24v18h12V16h20v36h14V34h22v22h12V26h18v30h14V42h18v32z" fill="#1d2033"/>
    ${[[24, 38], [30, 46], [58, 30], [66, 40], [58, 50], [96, 46], [108, 54], [140, 24], [146, 36], [140, 46], [170, 42], [182, 50], [208, 34], [214, 46], [230, 52]].map(([x, y]) => svg`<rect x=${x} y=${y} width="4" height="5" fill="#ffe27a"/>`)}`,
};
