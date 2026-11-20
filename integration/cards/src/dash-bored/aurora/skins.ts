// Aurora's skins: varieties of colour (owner, 2026-11-16), after HA Dial's themes of the
// same names (../ha-dial, scene.py THEMES). A skin is data: the hues of the sky's three
// lights, how far each moves as the house's lights come on, the hue of the warm light
// that brightens with them, how strong the colours are, and the hues the rooms' tiles
// glow. A skin changes no size and no place, so the screens are the same in every one.
// styles.ts draws from the custom properties `paint` gives.

/** `dark` is for a skin of the night: its page is dark whatever Home Assistant's theme (owner, 2026-11-17).
 * `sky` is each light's hue in oklch and `moves` how many degrees it turns by the time every light is on. */
export type Skin = { id: string; name: string; sky: [number, number, number]; moves: [number, number, number]; warm: number; strength: number; rooms: number[]; dark?: boolean };
/** A skin for a season or a holiday is a skin's colours and decorations of the same name (seasons.ts DECORS). */
export const ALMANAC = "almanac"; // the choice that wears whichever of them the date calls for

export const SKINS: Skin[] = [
  // The first is the mock-up's: a sky that turns from cold to warm.
  { id: "aurora", name: "Aurora", sky: [265, 190, 330], moves: [-60, -120, 50], warm: 85, strength: 1, rooms: [70, 45, 150, 200, 320, 130] },
  // The rest keep their colour, and brighten.
  { id: "ember", name: "Ember", sky: [45, 70, 25], moves: [10, 10, 15], warm: 85, strength: 1, rooms: [55, 75, 35, 90] },
  { id: "verdant", name: "Verdant", sky: [165, 145, 190], moves: [-10, -15, -15], warm: 130, strength: 0.9, rooms: [165, 140, 185, 120] },
  { id: "cobalt", name: "Cobalt", sky: [255, 235, 280], moves: [-10, -15, 10], warm: 215, strength: 1, rooms: [250, 225, 280, 205] },
  { id: "rose", name: "Rose", sky: [5, 345, 35], moves: [10, 15, 15], warm: 55, strength: 1, rooms: [10, 350, 40, 60] },
  { id: "acid", name: "Acid", sky: [125, 110, 145], moves: [-10, -10, -20], warm: 105, strength: 1.1, rooms: [125, 105, 140, 95] },
  { id: "alloy", name: "Alloy", sky: [240, 225, 255], moves: [0, 0, 0], warm: 230, strength: 0.18, rooms: [230, 240, 220, 250] },
];

// The seasons and the holidays, in the order of a northern year (owner, 2026-11-16).
export const SEASONAL: Skin[] = [
  { id: "snow", name: "Snow", sky: [230, 210, 250], moves: [-5, -5, 5], warm: 215, strength: 0.6, rooms: [220, 200, 240] },
  { id: "christmas", name: "Christmas", sky: [150, 25, 90], moves: [-5, 5, 0], warm: 85, strength: 1, rooms: [25, 150, 85] },
  { id: "fireworks", name: "Fireworks", sky: [290, 260, 330], moves: [10, -10, 10], warm: 60, strength: 1.1, rooms: [300, 60, 200, 20], dark: true },
  { id: "valentine", name: "Valentine", sky: [0, 350, 20], moves: [5, 5, 10], warm: 30, strength: 1.1, rooms: [0, 340, 20] },
  { id: "spring", name: "Spring", sky: [135, 100, 200], moves: [-5, 0, -10], warm: 100, strength: 0.9, rooms: [135, 100, 200, 330] },
  { id: "easter", name: "Easter", sky: [320, 100, 200], moves: [5, 0, -5], warm: 95, strength: 0.7, rooms: [320, 100, 200, 60] },
  { id: "summer", name: "Summer", sky: [230, 210, 85], moves: [-10, -5, 0], warm: 85, strength: 1, rooms: [85, 60, 210, 30] },
  { id: "autumn", name: "Autumn", sky: [50, 30, 80], moves: [5, 5, 5], warm: 75, strength: 1, rooms: [45, 25, 70, 100] },
  { id: "halloween", name: "Halloween", sky: [300, 45, 280], moves: [-10, 5, 10], warm: 50, strength: 1.1, rooms: [50, 300, 130], dark: true },
];

/** A skin by its id, a season's among them. The Almanac is no skin of its own: `ALMANAC` is asked for by name. */
export const skinned = (id?: string | null) => [...SKINS, ...SEASONAL].find((s) => s.id === id);

/** A skin as the custom properties the stylesheet draws the sky from. */
export const paint = (s: Skin) => `${s.sky.map((hue, i) => `--h${i + 1}: ${hue}; --m${i + 1}: ${s.moves[i]}`).join("; ")}; --hw: ${s.warm}; --strength: ${s.strength}`;

/** A skin in small, for the button that chooses it: its sky's three colours. */
export const swatch = (s: Skin) => `background: conic-gradient(${[...s.sky, s.sky[0]].map((hue) => `oklch(.72 ${(0.19 * s.strength).toFixed(3)} ${hue})`).join(", ")})`;
