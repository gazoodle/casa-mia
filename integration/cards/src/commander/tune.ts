// Tuning a Camera Commander card's sizes on one device, while its commander's debug is on
// (owner, 2026-11-27: "get a grip" on the sizes, from real devices, not guesses). The
// debug box gives the figures the rules worked out; its EDIT button opens one small
// dialog that can be dragged about, where each size (the tiles' names, the main camera's
// name, the controls, the motion dot) is set by hand and shown at once. Nothing is saved:
// the sizes last until the page is refreshed, and only on this device. Record sends them,
// with the rules' sizes and the device's figures, to the app's log under a reference that
// the owner and the agent can both quote (the integration's live.py: tuning).
import { css, html, nothing, type TemplateResult } from "lit";
import type { Hass } from "../ha.ts";
import { CONTROLS_HEIGHT } from "../../../../app/web/src/cameras/controls.ts";

export type Item = "tile" | "main" | "controls" | "dot";
export const ITEMS: [Item, string][] = [
  ["tile", "Tile names"],
  ["main", "Main name"],
  ["controls", "Controls"],
  ["dot", "Motion dot"],
];
/** What each can be set to, px: the controls are a pill's height, the rest a name's or
 * the dot's. */
const RANGE: Record<Item, [number, number]> = { tile: [6, 40], main: [8, 48], controls: [12, 80], dot: [3, 40] };

/** Where the card is: in the page or with the whole screen (its Full screen button), and
 * whether the main camera is shown full screen on top. Each is tuned on its own: the
 * owner saw the sizes differ between them. */
export type Where = string;
export const whereOf = (screen: boolean, full: boolean): Where =>
  `${screen ? "commander full screen" : "page"}${full ? ", main camera full screen" : ""}`;

type Sizes = Partial<Record<Item, number>>;
/** The sizes set by hand, by commander (its select) and where: kept for this page only. */
const TUNED = new Map<string, Record<Where, Sizes>>();
/** The dialog: whether it is open, which size it shows, where it stands, whether it is
 * folded down to its title bar, and a drag under way (where the pointer and the dialog
 * were when it began). Kept here, not in the function that draws it: each move redraws
 * the dialog, and a drag held there was forgotten after its first step (b12). */
const DIALOG = { open: "", item: "main" as Item, x: -1, y: -1, folded: false, from: null as [number, number, number, number] | null };
/** The debug box folded down to its buttons, to see the tiles past it on a phone. */
const BOX = { folded: false };
/** Track motion, turned off by the dialog (its switch), to be turned on again. */
let paused = "";

export const tunedAt = (entity: string, where: Where): Sizes => TUNED.get(entity)?.[where] ?? {};

/** The sizes in use where the card is: each one set by hand, else the rule's. The controls
 * are linked to the main name (owner, 2026-11-27: the main name's pill, controls.ts):
 * unless set by hand they follow the main name in use (CONTROLS_HEIGHT of it), set by hand
 * or not, so moving the
 * main name moves them too. `follow`: they are following it. The card draws them so,
 * and the debug box, the dialog and a record all say it from here. */
export function inUse(rules: Record<Item, number>, set: Sizes): Record<Item, number> & { follow: boolean } {
  const main = set.main ?? rules.main;
  const follow = set.controls === undefined;
  return {
    main,
    tile: set.tile ?? rules.tile,
    dot: set.dot ?? rules.dot,
    controls: follow ? Math.round(main * CONTROLS_HEIGHT) : set.controls!,
    follow,
  };
}

/** A reference for a record: the date and time to the second, and three letters. */
export function reference(now = new Date(), random = Math.random): string {
  const two = (n: number) => String(n).padStart(2, "0");
  const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(random() * 26))).join("");
  return `T-${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}-${letters}`;
}

/** The commander's Track motion switch: on the same device as its select. */
function trackMotion(hass: Hass, select: string): string | undefined {
  const entities = (hass.entities ?? {}) as Record<string, { entity_id: string; device_id?: string; translation_key?: string }>;
  const device = entities[select]?.device_id;
  return device ? Object.values(entities).find((e) => e.device_id === device && e.translation_key === "track_motion")?.entity_id : undefined;
}

/** Open or close the dialog. Opening turns the commander's Track motion off, so the main
 * camera doesn't move while sizes are set (it is every device's switch: the debug box
 * says so while it is off); closing turns it on again if the dialog turned it off. */
export function toggleDialog(hass: Hass, select: string, open: boolean): void {
  DIALOG.open = open ? select : "";
  const sw = trackMotion(hass, select);
  if (open && sw && hass.states[sw]?.state === "on") {
    paused = sw;
    void hass.callService("switch", "turn_off", {}, { entity_id: sw });
    console.info(`casa-mia: tuning: ${sw} off while the sizes are set`);
  } else if (!open && paused) {
    void hass.callService("switch", "turn_on", {}, { entity_id: paused });
    console.info(`casa-mia: tuning: ${paused} on again`);
    paused = "";
  }
}

export const dialogOpen = (select: string) => DIALOG.open === select;

/** The figures a card gives its debug box and a record: what the rules worked out. */
export type Figures = {
  where: Where;
  box: [number, number];
  place: [number, number];
  tile: [number, number];
  rules: Record<Item, number>;
  sums: { main: string; tile: string; dot: string };
};

/** The debug box: the figures, each size as the rule gave it and as set by hand, the
 * EDIT and Record buttons, and what came of the last record. */
export function debugBox(o: {
  hass: Hass;
  select: string;
  colour: string;
  head: TemplateResult;
  figures: Figures;
  note: string;
  record: () => void;
  changed: () => void;
}): TemplateResult {
  const { figures: f, select } = o;
  const set = tunedAt(select, f.where);
  const sw = trackMotion(o.hass, select);
  const size = (item: Item) => (set[item] !== undefined ? html`<b>${set[item]} px</b> (rule ${f.rules[item]})` : `${f.rules[item]} px`);
  const use = inUse(f.rules, set);
  const controls = use.follow
    ? `controls follow the main name: ${use.controls} px high`
    : html`controls <b>${use.controls} px</b> high, set by hand (following the main name: ${Math.round(use.main * CONTROLS_HEIGHT)})`;
  const buttons = html`<div class="debug-buttons">
    <button
      class="debug-fold"
      @click=${() => ((BOX.folded = !BOX.folded), o.changed())}
      aria-label=${BOX.folded ? "Show the figures" : "Fold the figures away"}
    >
      ${BOX.folded ? "+" : "−"}
    </button>
    <button @click=${() => (toggleDialog(o.hass, select, !dialogOpen(select)), o.changed())}>${dialogOpen(select) ? "DONE" : "EDIT"}</button>
    <button @click=${o.record}>RECORD</button>
  </div>`;
  // Folded: its buttons alone, and what came of the last record.
  if (BOX.folded) return html`<div class="debug folded" style="color:${o.colour}">${buttons}${o.note ? html`${o.note}` : nothing}</div>`;
  return html`<div class="debug" style="color:${o.colour}">
    ${buttons}
    ${o.head}<br />
    ${f.where}: card ${f.box.map(Math.round).join(" x ")}, main camera ${f.place.map(Math.round).join(" x ")} px<br />
    main name ${size("main")}: ${f.sums.main}<br />
    ${controls}<br />
    smallest tile ${f.tile.map(Math.round).join(" x ")} px: names ${size("tile")}: ${f.sums.tile}<br />
    motion dot ${size("dot")}: ${f.sums.dot}
    ${sw && o.hass.states[sw]?.state === "off" ? html`<br /><span class="debug-warn">Track motion is off${paused ? " while sizes are set" : ""}: every device's</span>` : nothing}
    ${o.note ? html`<br />${o.note}` : nothing}
  </div>`;
}

/** The dialog: four chips for which size, its slider and number, the rule's size, and a
 * Reset to the rule (for the controls: following the main name again). Dragged by its
 * title bar, and kept on the screen. */
export function tuneDialog(o: { hass: Hass; select: string; where: Where; rules: Record<Item, number>; changed: () => void }): TemplateResult | typeof nothing {
  if (!dialogOpen(o.select)) return nothing;
  if (DIALOG.x < 0) [DIALOG.x, DIALOG.y] = [Math.max(8, innerWidth - 300), 60];
  const sizes = TUNED.get(o.select) ?? {};
  TUNED.set(o.select, sizes);
  const here = (sizes[o.where] ??= {});
  const item = DIALOG.item;
  const [lo, hi] = RANGE[item];
  const use = inUse(o.rules, here);
  const value = use[item];
  // The controls' "rule" is the link: the main name in use, as a pill.
  const linked = item === "controls";
  const set = (n: number) => {
    here[item] = Math.min(hi, Math.max(lo, Math.round(n)));
    o.changed();
  };
  const done = (e: PointerEvent) => {
    DIALOG.from = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const title = html`<div
    class="tune-title"
    @pointerdown=${(e: PointerEvent) => {
      // A press on a button is the button's: captured for a drag, Safari gave its click
      // to the title bar, and the × never closed the dialog (b12).
      if ((e.target as Element).closest("button")) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      DIALOG.from = [e.clientX, e.clientY, DIALOG.x, DIALOG.y];
    }}
    @pointermove=${(e: PointerEvent) => {
      const from = DIALOG.from;
      if (!from) return;
      DIALOG.x = Math.min(innerWidth - 120, Math.max(0, from[2] + e.clientX - from[0]));
      DIALOG.y = Math.min(innerHeight - 40, Math.max(0, from[3] + e.clientY - from[1]));
      o.changed();
    }}
    @pointerup=${done}
    @pointercancel=${done}
  >
    <button @click=${() => ((DIALOG.folded = !DIALOG.folded), o.changed())} aria-label=${DIALOG.folded ? "Open the sizes" : "Fold the sizes away"}>
      ${DIALOG.folded ? "+" : "−"}
    </button>
    <span>${DIALOG.folded ? "Sizes" : `Sizes here: ${o.where}`}</span>
    <button @click=${() => (toggleDialog(o.hass, o.select, false), o.changed())} aria-label="Close">×</button>
  </div>`;
  // Folded: the title bar alone, to see the tiles past it, and still dragged by it.
  if (DIALOG.folded) return html`<div class="tune folded" style="left:${DIALOG.x}px;top:${DIALOG.y}px">${title}</div>`;
  return html`<div class="tune" style="left:${DIALOG.x}px;top:${DIALOG.y}px">
    ${title}
    <div class="tune-items">
      ${ITEMS.map(
        ([key, label]) =>
          html`<button class=${key === item ? "on" : ""} @click=${() => ((DIALOG.item = key), o.changed())}>
            ${label}${here[key] !== undefined ? " •" : ""}
          </button>`,
      )}
    </div>
    <div class="tune-value">
      <input type="range" min=${lo} max=${hi} step="1" .value=${String(value)} @input=${(e: Event) => set(Number((e.target as HTMLInputElement).value))} />
      <input type="number" min=${lo} max=${hi} .value=${String(value)} @change=${(e: Event) => set(Number((e.target as HTMLInputElement).value))} />
      <span>px</span>
    </div>
    <div class="tune-rule">
      ${linked ? `Follows the main name: ${Math.round(use.main * CONTROLS_HEIGHT)} px` : `Rule: ${o.rules[item]} px`}
      <button
        ?disabled=${here[item] === undefined}
        @click=${() => {
          delete here[item];
          o.changed();
        }}
      >
        ${linked ? "Follow the main name" : "Back to the rule"}
      </button>
    </div>
  </div>`;
}

/** A record of this device's sizes: the figures and the rules here, the sizes in use here
 * and whether the controls were following the main name, every size set by hand on this
 * page (each where), and the device. */
export function recordOf(o: { ref: string; select: string; figures: Figures; main: string; version: string; desk: boolean }) {
  const { follow, ...use } = inUse(o.figures.rules, tunedAt(o.select, o.figures.where));
  return {
    ref: o.ref,
    at: new Date().toISOString(),
    version: o.version,
    commander: o.select,
    main_camera: o.main,
    where: o.figures.where,
    device: {
      screen: `${screen.width}x${screen.height}`,
      window: `${innerWidth}x${innerHeight}`,
      dpr: devicePixelRatio,
      pointer: o.desk ? "mouse" : "touch",
      agent: navigator.userAgent.slice(0, 160),
    },
    card: o.figures.box.map(Math.round),
    main_place: o.figures.place.map(Math.round),
    smallest_tile: o.figures.tile.map(Math.round),
    rules: o.figures.rules,
    in_use: use,
    controls_follow_main_name: follow,
    sums: o.figures.sums,
    tuned: TUNED.get(o.select) ?? {},
  };
}

export const tuneStyles = css`
  .debug button {
    pointer-events: auto;
    padding: 1px 6px;
    border: 1px solid currentColor;
    border-radius: 4px;
    background: #000;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .debug-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-bottom: 4px;
  }
  /* The fold at the top left, the others at the right. */
  .debug-fold {
    margin-right: auto;
  }
  .debug.folded {
    padding: 4px 6px;
  }
  .debug.folded .debug-buttons {
    margin-bottom: 0;
  }
  .debug b {
    color: #fff;
  }
  .debug-warn {
    color: #ff6b6b;
  }
  /* Above the full screen (z-index 10) and anything else of the card's. */
  .tune {
    position: fixed;
    z-index: 30;
    width: 280px;
    box-sizing: border-box;
    padding: 0 10px 10px;
    border: 1px solid #555;
    border-radius: 8px;
    background: rgb(20 20 20 / 0.94);
    color: #eee;
    font: 13px/1.4 ui-monospace, monospace;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.5);
  }
  .tune button {
    padding: 2px 6px;
    border: 1px solid #666;
    border-radius: 4px;
    background: #222;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .tune button.on {
    border-color: #ffd60a;
    color: #ffd60a;
  }
  .tune button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .tune.folded {
    width: auto;
    padding-bottom: 0;
  }
  .tune.folded .tune-title {
    margin-bottom: 0;
    border-bottom: none;
  }
  .tune-title span {
    flex: 1;
  }
  .tune-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin: 0 -10px 8px;
    padding: 6px 10px;
    border-bottom: 1px solid #444;
    cursor: move;
    touch-action: none;
    user-select: none;
  }
  .tune-items {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .tune-value {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .tune-value input[type="range"] {
    flex: 1;
  }
  .tune-value input[type="number"] {
    width: 52px;
    background: #111;
    color: inherit;
    border: 1px solid #555;
    font: inherit;
  }
  .tune-rule {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }
`;
