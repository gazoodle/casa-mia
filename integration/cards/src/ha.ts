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

const all: Record<string, Option> = {
  ...main,
  ...panel,
  // The Tablet layout's own shape (not a commander option: a commander's card sizes itself)
  aspect: { label: "Shape", help: "Width:height where it is not the whole screen (in a column): e.g. 16:10, 4:3." },
};
export const label = (s: { name: string }) => all[s.name]?.label ?? s.name;
export const helper = (s: { name: string }) => all[s.name]?.help?.replaceAll("{item}", "card");

// --- how big a card may be: one rule for every Casa Mia card ----------------------------
// HA passes a card its width, never a height: a dashboard is a page that scrolls. So each
// card sizes itself, all the same way:
//   locked (alone in a Panel view): exactly the screen below its top edge;
//   given a size by a container (a Tablet layout tile): that size;
//   otherwise (a column): its own shape from its width, at most the screen below its top.
// In an editor's preview: its own shape, uncapped.

const MIN_ROOM = 100; // px: never squeezed below this, however low on the page it sits

/** The element above `el` that holds it: its parent, or its shadow root's host. */
const up = (el: Node): Node | null => (el as Element).parentElement ?? ((el.getRootNode() as ShadowRoot).host || null);

/** Alone in a Panel view: the first card container above it (past its own hui-card and
 * plain wrappers) is HA's panel view. A card inside a Tablet layout is not. */
export function locked(el: Element): boolean {
  for (let n = up(el); n; n = up(n)) {
    const tag = (n as Element).tagName ?? "";
    if (tag === "HUI-PANEL-VIEW") return true;
    if (tag.includes("-") && tag !== "HUI-CARD") return false; // some other container
  }
  return false;
}

/** Inside one of HA's dialogs (the card editor's preview), not on the dashboard. */
export function inDialog(el: Element): boolean {
  for (let n: Node | null = el; n; n = up(n))
    if ((n as Element).tagName?.startsWith("HUI-DIALOG") || (n as Element).tagName === "HA-DIALOG") return true;
  return false;
}

/** The screen below its top edge, CSS px: measured in the page (scrolling changes
 * nothing), against the visible window (on a phone, with its toolbars as they are). */
export function room(el: Element): number {
  const top = el.getBoundingClientRect().top + window.scrollY;
  const tall = window.visualViewport?.height ?? window.innerHeight;
  return Math.max(MIN_ROOM, Math.floor(tall - top));
}

/** Where a card stands now: locked to the screen, and the room it has. */
export type Fit = { locked: boolean; room: number; preview: boolean };
export function fitOf(el: Element): Fit {
  return { locked: locked(el), room: room(el), preview: inDialog(el) };
}

/** Its height for a width and its own shape (width / height), by the rule above. */
export function heightFor(fit: Fit, width: number, shape: number): number {
  if (fit.preview) return Math.round(width / shape);
  return fit.locked ? fit.room : Math.min(Math.round(width / shape), fit.room);
}

/** Call `on` whenever the room may have changed: the window resized or rotated, or a
 * phone's toolbars came or went. Returns the stop. */
export function watchRoom(on: () => void): () => void {
  window.addEventListener("resize", on);
  window.visualViewport?.addEventListener("resize", on);
  return () => {
    window.removeEventListener("resize", on);
    window.visualViewport?.removeEventListener("resize", on);
  };
}

/** The view being edited is a Panel view (its card locked to the screen): for editors,
 * which are not on the page themselves. From the dashboard's config and the address. */
export function editingPanelView(lovelace: any): boolean {
  const views: any[] = lovelace?.config?.views ?? [];
  const at = decodeURIComponent(location.pathname.split("/").filter(Boolean)[1] ?? "");
  const view = views.find((v, i) => (v.path ?? String(i)) === at) ?? views[Number(at)] ?? views[0];
  return view?.type === "panel";
}
