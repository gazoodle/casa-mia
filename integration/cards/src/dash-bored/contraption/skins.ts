// Contraption's skins. A skin is a set of materials: the paper, the line, and what brass,
// iron, wood, glass, cloth and copper look like. A drawing names its parts by what they
// are made of and never by how they are drawn, so a skin needs no new art. The values are
// here as data because they are wanted twice: by the page, and by each bitmap, which is a
// document of its own and takes them with it (sprites.ts).

/** `wob`: its still lines wobble, as if drawn by hand. */
export type Skin = { id: string; name: string; line: string; w: number; wob?: boolean; vars: Record<string, string> };

export const SKINS: Skin[] = [
  {
    id: "patent", name: "Patent engraving", line: "#2b2118", w: 1.7, wob: true,
    vars: {
      bg: "#eadcbc", font: '"Bradley Hand", "Segoe Print", "Chalkboard SE", cursive', title: '"Snell Roundhand", "Apple Chancery", "Lucida Calligraphy", cursive',
      paper: "#eadcbc", brass: "#dcc694", copper: "#d4b17c", iron: "url(#cross)", wood: "url(#hatch)", glass: "rgba(255,255,255,.28)",
      cloth: "#c79a8a", flame: "#e98a2b", lit: "#f2c84b", duck: "#f3ead3", label: "#f3ead3", water: "#4f8996", red: "#a8452f",
    },
  },
  {
    id: "blueprint", name: "Blueprint", line: "#e8f1ff", w: 1.2,
    vars: {
      bg: "#1d4f91", font: '"Courier New", ui-monospace, monospace', title: '"Courier New", ui-monospace, monospace',
      paper: "#1d4f91", brass: "#1d4f91", copper: "#1d4f91", iron: "url(#blue)", wood: "#1d4f91", glass: "rgba(255,255,255,.07)",
      cloth: "url(#blue)", flame: "rgba(255,255,255,.3)", lit: "#fff3b0", duck: "#1d4f91", label: "#1d4f91", water: "#9fd0ff", red: "#e8f1ff",
    },
  },
  {
    id: "tin", name: "Tin toy", line: "#1c2a4a", w: 2.6,
    vars: {
      bg: "#f3e6c4", font: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif', title: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
      paper: "#fff8e6", brass: "#f0b830", copper: "#e2703a", iron: "#8da0b3", wood: "#c0703a", glass: "rgba(170,228,232,.6)",
      cloth: "#d8352a", flame: "#ff7a1a", lit: "#ffe14d", duck: "#ffd21f", label: "#fff8e6", water: "#19a3d1", red: "#d8352a",
    },
  },
];

/** A skin's values as custom properties, for a style attribute. */
export const worn = (skin: Skin) => `--line:${skin.line};--w:${skin.w};${Object.entries(skin.vars).map(([name, value]) => `--${name}:${value.replaceAll('"', "'")}`).join(";")}`;

/** How a drawing is inked, whatever the skin: on the page's unseen bench, where a tile is
 * measured, and in every bitmap. No rule here hides anything: what shows is the frame's to say. */
export const INK = `
.ink * { stroke: var(--line); stroke-width: var(--w); stroke-linecap: round; stroke-linejoin: round; fill: none; }
.ink .paper, .ink .fill { fill: var(--paper); }
.ink .solid { fill: var(--line); }
.ink .brass { fill: var(--brass); }
.ink .copper { fill: var(--copper); }
.ink .iron { fill: var(--iron); }
.ink .wood { fill: var(--wood); }
.ink .glass { fill: var(--glass); }
.ink .cloth { fill: var(--cloth); }
.ink .bare { stroke: none; }
.ink .spark { fill: var(--lit); }
.ink .drop { stroke: none; fill: var(--water); }
.ink .duck { fill: var(--duck); }
.ink .flame { fill: var(--flame); }
.ink .label { fill: var(--label); }
.ink .shine * { stroke: none; fill: var(--lit); }
.ink .ghost * { fill: none; stroke-dasharray: 2.2 2.2; stroke-width: calc(var(--w) * .5); }
.ink .rope { stroke-width: calc(var(--w) * .8); }
.ink .thin { stroke-width: calc(var(--w) * .6); }
.ink .tube { stroke-width: 26; stroke-linecap: butt; }
.ink .bore { stroke: var(--paper); stroke-width: 21; stroke-linecap: butt; }
.ink text, .ink tspan { stroke: var(--bg); stroke-width: 4px; paint-order: stroke; fill: var(--line); font-size: 14px; font-family: var(--font); }
.ink .title { font-size: 23px; font-family: var(--title); }
.ink tspan.state { font-size: 12px; font-style: italic; }
.ink .small { font-size: 9px; }
.ink .said { font-style: italic; }
`;

/** What a drawing's fills point at: the engraving's hatching, the blueprint's, and the
 * wobble that makes the engraving's still lines look drawn by hand. */
export const DEFS = `
<filter id="wobble" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4"/>
  <feDisplacementMap in="SourceGraphic" scale="3"/></filter>
<pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
  <rect width="5" height="5" fill="#eadcbc"/><line y2="5" stroke="#2b2118" stroke-width="1"/></pattern>
<pattern id="cross" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="4" height="4" fill="#eadcbc"/><path d="M0,0 V4 M0,0 H4" stroke="#2b2118" stroke-width=".9"/></pattern>
<pattern id="blue" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="6" height="6" fill="#1d4f91"/><line y2="6" stroke="#e8f1ff" stroke-width=".7"/></pattern>
`;
