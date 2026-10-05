// What the cards borrow from Home Assistant's frontend: its card wrapper (hui-card, which
// applies each card's `visibility` and edit-mode preview), its stack editor (pick, edit,
// move and delete child cards) and ha-form. None are public API, but HA's own stack cards
// use them the same way; if an HA update breaks one, it breaks here first.
import LAYOUT from "../../../app/src/casa_mia/layout.json" with { type: "json" };

export type State = { state: string; attributes: Record<string, any> };
export type Hass = {
  states: Record<string, State>;
  callService(domain: string, service: string, data?: object, target?: object): Promise<unknown>;
  [key: string]: any;
};
export type CardConfig = { type: string; [key: string]: any };
/** hui-card: one child card, shown or hidden by its `visibility` (and its own wish). */
export type HuiCard = HTMLElement & { hass?: Hass; preview?: boolean; config?: CardConfig; load(): void };

export function fire(el: EventTarget, type: string, detail?: unknown): void {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

export async function huiCard(config: CardConfig, hass: Hass | undefined, preview: boolean): Promise<HuiCard> {
  await customElements.whenDefined("hui-card");
  const el = document.createElement("hui-card") as HuiCard;
  el.hass = hass;
  el.preview = preview;
  el.config = config;
  el.load();
  return el;
}

/** Shown: hui-card hides itself (hidden attribute) when its card or conditions say so. */
export const shown = (el: Element) => !el.hasAttribute("hidden") && (el as HTMLElement).style.display !== "none";

export function navigate(path: string): void {
  history.pushState(null, "", path);
  fire(window, "location-changed", { replace: false });
}

/** HA's stack editor (the vertical stack's): a child card list with picker and editors. */
export type StackEditor = HTMLElement & { hass?: Hass; lovelace?: unknown; setConfig(c: CardConfig): void };
export async function stackEditor(): Promise<StackEditor> {
  const helpers = await (window as any).loadCardHelpers();
  await helpers.createCardElement({ type: "vertical-stack", cards: [] }); // loads its module
  await customElements.whenDefined("hui-vertical-stack-card");
  return (customElements.get("hui-vertical-stack-card") as any).getConfigElement();
}

export function register(type: string, name: string, description: string): void {
  const w = window as any;
  w.customCards ||= [];
  if (!w.customCards.some((c: { type: string }) => c.type === type))
    w.customCards.push({ type, name, description, preview: false, documentationURL: "https://github.com/gazoodle/casa-mia" });
}

// --- ha-form schemas from the shared layout options (app/src/casa_mia/layout.json) -------

type Option = { label: string; help?: string; default?: unknown; min?: number; max?: number; options?: string[][]; when?: string[]; for?: string; edge?: boolean };
const main = LAYOUT.main as Record<string, Option>;
const panel = LAYOUT.panel as Record<string, Option>;

function field(name: string, o: Option): object {
  if (o.options) return { name, selector: { select: { mode: "dropdown", options: o.options.map(([value, label]) => ({ value, label })) } } };
  if (typeof o.default === "boolean" || o.edge) return { name, selector: { boolean: {} } };
  if (o.min !== undefined) return { name, selector: { number: { min: o.min, max: o.max, mode: "box" } } };
  return { name, selector: { text: {} } };
}

/** The main options for a layout, those that apply to its main fit now. */
export function mainSchema(fit: string): object[] {
  return Object.entries(main)
    .filter(([, o]) => (!o.when || o.when.includes(fit)) && (!o.for || o.for === "tablet"))
    .map(([k, o]) => field(k, o));
}

/** A panel's options: top and bottom have their anchors. */
export function panelSchema(p: string): object[] {
  return Object.entries(panel)
    .filter(([, o]) => (!o.edge || p === "top" || p === "bottom") && (!o.for || o.for === "tablet"))
    .map(([k, o]) => field(k, o));
}

const all = { ...main, ...panel };
export const label = (s: { name: string }) => all[s.name]?.label ?? s.name;
export const helper = (s: { name: string }) => all[s.name]?.help?.replaceAll("{item}", "card");
