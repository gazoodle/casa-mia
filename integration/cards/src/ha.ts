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

/** HA's ha-form, loaded: HA loads it with its card editors, so ask for one (the entities
 * card's) and its module brings ha-form with it. */
export async function haForm(): Promise<void> {
  if (customElements.get("ha-form")) return;
  const helpers = await (window as any).loadCardHelpers();
  const card = await helpers.createCardElement({ type: "entities", entities: [] });
  await (card.constructor as any).getConfigElement?.();
  await customElements.whenDefined("ha-form");
}

/** HA's Sections view class. HA loads it only when a Sections view is first shown, so a
 * hidden hui-view showing an empty one makes it load. */
export async function sectionsView(): Promise<CustomElementConstructor> {
  if (!customElements.get("hui-sections-view")) {
    await customElements.whenDefined("hui-view");
    const view = document.createElement("hui-view") as any;
    view.style.display = "none";
    view.lovelace = { config: { views: [{ type: "sections", sections: [] }] }, editMode: false };
    view.index = 0;
    document.body.append(view);
    await customElements.whenDefined("hui-sections-view");
    view.remove();
  }
  return customElements.get("hui-sections-view")!;
}

/** Define a custom element, once: a second copy of this file (cm-streams.js loads it
 * again when the first load failed) finds it defined and leaves it. A failure says so in
 * the console, which Kiosk Satellite keeps (getConsole), so a dead card has a reason. */
export function define(tag: string, element: CustomElementConstructor): void {
  if (customElements.get(tag)) return;
  try {
    customElements.define(tag, element);
  } catch (err) {
    console.error(`CASA-MIA CARDS failed: defining ${tag}: ${err}`);
  }
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
    .filter(([, o]) => (!o.when || o.when.includes(fit)) && (!o.for || o.for === "view"))
    .map(([k, o]) => field(k, o));
}

/** A panel's options: top and bottom have their anchors. */
export function panelSchema(p: string): object[] {
  return Object.entries(panel)
    .filter(([, o]) => (!o.edge || p === "top" || p === "bottom") && (!o.for || o.for === "view"))
    .map(([k, o]) => field(k, o));
}

const all: Record<string, Option> = {
  ...main,
  ...panel,
};
export const label = (s: { name: string }) => all[s.name]?.label ?? s.name;
export const helper = (s: { name: string }) => all[s.name]?.help?.replaceAll("{item}", "card");

// --- how big a card may be: one rule for every Casa Mia card ----------------------------
// HA passes a card its width, never a height: a dashboard is a page that scrolls. So each
// card sizes itself, all the same way, by where it stands (its mode):
//   screen:  alone in a Panel view. It is given the whole space, from the sidebar's edge to
//            the screen's right and from the header's foot to the screen's bottom, and only
//            fills it: no shape, aspect or fit of its own;
//   tile:    filling a Tablet Layout's panel: it fills it;
//   cell:    in a section with its rows set (HA's Layout tab): it fills its cell;
//   column:  anywhere else: its own shape from its width, as HA's Picture glance card
//            (its rows "auto");
//   preview: in an editor's preview: its own shape from its width.
// Its width is always all of its space (HA's Layout tab sets that): only the height is
// decided here.

export type Mode = "screen" | "tile" | "cell" | "column" | "preview";
export type Fit = { mode: Mode; room: number; container: string };
const MIN_ROOM = 100; // px: never squeezed below this, however low on the page it sits

/** The element above `el` that holds it: its parent, or its shadow root's host. */
const up = (el: Node): Node | null => (el as Element).parentElement ?? ((el.getRootNode() as ShadowRoot).host || null);

/** The card container holding `el`: the first custom element above it past its own
 * hui-card (HUI-PANEL-VIEW, a sections grid...). */
export function container(el: Element): string {
  for (let n = up(el); n; n = up(n)) {
    const tag = (n as Element).tagName ?? "";
    if (tag.includes("-") && tag !== "HUI-CARD") return tag;
  }
  return "";
}

/** Filling a Tablet Layout's panel: its hui-card is marked so (view.ts, cm-fill). */
function filling(el: Element): boolean {
  for (let n = up(el); n; n = up(n)) if ((n as Element).tagName === "HUI-CARD") return (n as Element).hasAttribute("cm-fill");
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

/** The mode for a card's container (see above). */
export function modeOf(holder: string, preview: boolean, rows = false): Mode {
  if (preview) return "preview";
  if (holder === "HUI-PANEL-VIEW") return "screen";
  return holder === "CASA-MIA-TABLET-LAYOUT" ? "tile" : rows ? "cell" : "column";
}

/** Where a card stands now, and the room below it. `rows`: its rows are set (HA's Layout
 * tab: the card's `layout` is "grid" and its grid_options.rows a number, as HA's Picture
 * glance card tells). */
export function fitOf(el: Element, rows = false): Fit {
  const holder = filling(el) ? "CASA-MIA-TABLET-LAYOUT" : container(el);
  return { mode: modeOf(holder, inDialog(el), rows), room: room(el), container: holder.toLowerCase() };
}

/** Its height for its width and its own shape (width / height); null in a tile or a cell,
 * which it fills whatever its shape. */
export function heightFor(fit: Pick<Fit, "mode" | "room">, width: number, shape: number): number | null {
  switch (fit.mode) {
    case "screen":
      return fit.room;
    case "tile":
    case "cell":
      return null;
    default:
      return Math.round(width / shape);
  }
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

/** Whether this page can show the compositor's own (LAN, http://) address: it reached
 * Home Assistant over plain http (an http:// picture on an https page is blocked) at an
 * address on the home network (a private IP, a .local or bare name). */
export function atHome(loc: { protocol: string; hostname: string }): boolean {
  const h = loc.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    loc.protocol === "http:" &&
    (!h.includes(".") && !h.includes(":") ||
      /^(127|10|192\.168|172\.(1[6-9]|2\d|3[01])|169\.254)\./.test(h) ||
      /^(::1|f[cd][0-9a-f]{0,2}:.*|fe80:.*)$/.test(h) ||
      /\.(local|lan|home|internal|home\.arpa)$/.test(h))
  );
}

export type Sharpness = "full" | "balanced" | "light" | "saver";
// The most pixels per CSS pixel asked for through Home Assistant.
const SHARPNESS: Record<Sharpness, number> = { full: Infinity, balanced: 1.5, light: 1, saver: 0.75 };

/** The pixel ratio to ask for: the screen's own, at most `sharpness`'s through Home Assistant. */
export function ratioFor(dpr: number, viaHa: boolean, sharpness: Sharpness = "balanced"): number {
  return viaHa ? Math.min(dpr, SHARPNESS[sharpness] ?? SHARPNESS.balanced) : dpr;
}

/** The channel a live main camera plays (the compositor's ladder, compositor.choose):
 * going up its channels, smallest first ([entity, width, height]; 0 x 0 not known), the
 * first at least the place's size (device pixels), so the video is only made smaller;
 * none: the largest known; none known: the last. `whole`: fitted inside the place (one
 * side reaching it is enough), else filling it (both). */
export function liveChannel(channels: [string, number, number][], place: [number, number], whole: boolean): string | undefined {
  const known = channels.filter(([, w, h]) => w > 0 && h > 0);
  const enough = ([, w, h]: [string, number, number]) => (whole ? w >= place[0] || h >= place[1] : w >= place[0] && h >= place[1]);
  return (known.find(enough) ?? known[known.length - 1] ?? channels[channels.length - 1])?.[0];
}
