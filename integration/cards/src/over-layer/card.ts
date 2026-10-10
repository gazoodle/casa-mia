// The Over layer card: one card of its own, shown over the dashboard while the card is
// visible (HA's Visibility tab decides: hui-card disconnects a hidden card, and so this
// takes its layer down), and while the sections round it are shown by their own Visibility
// (HA hides a section with CSS, its cards still connected, so this asks). The layer covers the view (a Tablet Layout's, or any view's) or the
// whole window; its backdrop can take every tap, so what's beneath is seen, not touched.
// Being edited, it is an ordinary card in its place, with a badge saying what it does, so
// it is never live while the dashboard is edited. It takes no room out of edit mode, and in
// a Tablet Layout never holds a panel open (garnish.ts: counts).
import { LitElement, css, html, nothing } from "lit";
import type { CardConfig, Hass } from "../ha.ts";
import { type Config, TYPE, anchorFor, badge, placement, withDefaults } from "./common.ts";
import { DOOR_STYLE, Door, editButton } from "./door.ts";

/** The view this card is in (through shadow roots): what "the view" covers. */
function viewOf(el: Element): HTMLElement | null {
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
    if ((n as Element).tagName === "HUI-VIEW") return n as HTMLElement;
  return null;
}

/** The sections round this card (through shadow roots), nested ones too. */
function sectionsOf(el: Element): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
    if ((n as Element).tagName === "HUI-SECTION") out.push(n as HTMLElement);
  return out;
}

/** Whether a section round this card is hidden by its own Visibility: its conditions not met,
 * or switched off. What HA decided, not why: its `hidden` attribute, set once its answer is
 * final (core's, for conditions on states). HA never hides a section holding this card for
 * its content (this card shows), but garnish everywhere may, which marks those
 * (cmGarnishHidden): they don't count. A Tablet Layout hides its panels its own way. */
function sectionOff(el: Element): boolean {
  return sectionsOf(el).some((s: any) => s.hasAttribute("hidden") && !s.cmGarnishHidden);
}

const LAYER = `
  :host { all: initial; }
  .layer { position: fixed; z-index: 7; display: flex; box-sizing: border-box; pointer-events: none; }
  .layer.scroll { position: absolute; }
  .backdrop { position: absolute; inset: 0; }
  .holder { position: relative; box-sizing: border-box; width: 100%; }
  .layer.full .holder { height: 100%; }
  .layer.full .holder > * { height: 100%; }
${DOOR_STYLE}`;

export class OverLayerCard extends LitElement {
  static properties = { _config: { state: true }, _editing: { state: true } };
  _config?: Config;
  _editing = false;
  private _hass?: Hass;
  private _child?: HTMLElement & { hass?: Hass; setConfig?(c: CardConfig): void };
  private _childFor = ""; // the card config the child was made from
  private _host?: HTMLElement; // the layer, in the page's body
  private _layer?: HTMLElement;
  private _watch?: () => void;
  private _door?: Door; // an admin's way to the edit button (door.ts)
  private _sectionOff = false; // a section round it hidden by its own Visibility
  private _unwatchSections?: () => void;

  static getStubConfig() {
    return { card: { type: "markdown", content: "**Over layer.** This card shows over the dashboard while its Visibility conditions hold." } };
  }

  static getConfigElement() {
    return document.createElement("casa-mia-over-layer-editor");
  }

  setConfig(config: Config) {
    if (config.card !== undefined && (typeof config.card !== "object" || !config.card.type)) throw new Error("card: one card, with its type");
    this._config = config;
    this._makeChild();
    this._place();
  }

  set hass(hass: Hass) {
    const first = !this._hass;
    this._hass = hass;
    if (this._child) this._child.hass = hass;
    this._checkSections();
    if (first) this._style(); // who's looking: an admin gets the door
  }

  // hui-card sets both while the dashboard is edited (and in the card editor's preview).
  set preview(on: boolean) {
    this._setEditing(on);
  }
  set editMode(on: boolean) {
    this._setEditing(on);
  }

  getCardSize() {
    return this._editing ? 3 : 0;
  }

  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  connectedCallback() {
    super.connectedCallback();
    // HA evaluates a section's conditions in core, so its answer comes a moment later, and
    // it says so (section-visibility-changed on the section): look again then.
    const sections = sectionsOf(this);
    const look = () => this._checkSections();
    for (const s of sections) s.addEventListener("section-visibility-changed", look);
    this._unwatchSections = () => sections.forEach((s) => s.removeEventListener("section-visibility-changed", look));
    this._place();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unwatchSections?.();
    this._takeDown(); // hidden by its Visibility, the view left, or edit mode
  }

  /** Its sections' own Visibility, looked at again (it follows states, and core's answers). */
  private _checkSections() {
    const off = sectionOff(this);
    if (off === this._sectionOff) return;
    this._sectionOff = off;
    console.info(`CASA-MIA CARDS: over layer: a section round it is ${off ? "hidden by its own Visibility: down" : "shown again: up"}`);
    this._place();
  }

  private _setEditing(on: boolean) {
    if (on === this._editing) return;
    this._editing = on;
    this._place();
  }

  private async _makeChild() {
    const card = this._config?.card;
    const key = JSON.stringify(card ?? null);
    if (key === this._childFor) return;
    this._childFor = key;
    this._child = undefined;
    if (card) {
      const helpers = await (window as any).loadCardHelpers();
      if (key !== this._childFor) return; // changed again meanwhile
      this._child = helpers.createCardElement(card);
      if (this._hass) this._child!.hass = this._hass;
    }
    this._layer?.querySelector(".holder")?.replaceChildren(...(this._child && !this._editing ? [this._child] : []));
    this.requestUpdate();
  }

  /** The layer up while connected and not edited, else down; the child where it shows. */
  private _place() {
    // No way round it from the address: the way out is HA's own edit mode (an admin's
    // ?edit=1 opens the dashboard in it), where this is an ordinary card.
    const live = this.isConnected && !this._editing && !!this._config && !(this._sectionOff = sectionOff(this));
    if (!live) {
      this._takeDown();
      this.requestUpdate();
      return;
    }
    if (!this._host) this._putUp();
    this._style();
  }

  private _putUp() {
    this._host = document.createElement("casa-mia-over-layer-host");
    const root = this._host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${LAYER}</style><div class="layer"><div class="backdrop"></div><div class="holder"></div></div>`;
    this._layer = root.querySelector(".layer") as HTMLElement;
    if (this._child) this._layer.querySelector(".holder")!.append(this._child);
    this._door = new Door(root);
    document.body.append(this._host);
    // Covering the view: follow it as it moves or changes size (the window, the sidebar).
    const follow = () => this._style();
    const view = viewOf(this);
    const sizes = new ResizeObserver(follow);
    if (view) sizes.observe(view);
    addEventListener("resize", follow);
    addEventListener("scroll", follow, { capture: true, passive: true });
    this._watch = () => {
      sizes.disconnect();
      removeEventListener("resize", follow);
      removeEventListener("scroll", follow, { capture: true });
    };
    setTimeout(follow, 500); // HA's toolbar drawn by then: the door finds its button
    console.info(`CASA-MIA CARDS: over layer shown (${badge(this._config!)})`);
    this.requestUpdate();
  }

  private _takeDown() {
    if (!this._host) return;
    this._watch?.();
    this._door?.remove();
    this._host.remove();
    this._host = this._layer = this._watch = this._door = undefined;
    console.info("CASA-MIA CARDS: over layer taken down");
  }

  /** Where the layer stands and how it looks, from the options and the view's place. */
  private _style() {
    if (!this._layer || !this._config) return;
    const o = withDefaults(this._config);
    const layer = this._layer;
    layer.className = `layer ${o.mode}`;
    const view = o.cover === "view" ? viewOf(this) : null;
    const r = view?.getBoundingClientRect();
    if (o.mode === "scroll") {
      // In the page, so it scrolls with it: over the view's whole height.
      const top = (r?.top ?? 0) + scrollY;
      Object.assign(layer.style, { left: `${(r?.left ?? 0) + scrollX}px`, top: `${top}px`, width: r ? `${r.width}px` : "100%", height: r ? `${r.height}px` : "100%", right: "", bottom: "" });
    } else if (r) {
      // The part of the view on screen.
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, innerHeight);
      Object.assign(layer.style, { left: `${r.left}px`, top: `${top}px`, width: `${r.width}px`, height: `${Math.max(bottom - top, 0)}px`, right: "", bottom: "" });
    } else Object.assign(layer.style, { left: "0", top: "0", right: "0", bottom: "0", width: "", height: "" });
    const [cr, cg, cb] = o.backdrop_color;
    const backdrop = layer.querySelector(".backdrop") as HTMLElement;
    const look = { background: `rgba(${cr}, ${cg}, ${cb}, ${o.backdrop_opacity / 100})`, backdropFilter: o.backdrop_blur ? `blur(${o.backdrop_blur}px)` : "" };
    // The backdrop takes the taps when it blocks; else they pass through round the card.
    Object.assign(backdrop.style, { ...look, pointerEvents: o.block ? "auto" : "none" });
    // Over the whole window and blocking: an admin's door to the edit button.
    const door = o.block && o.cover === "window" && !!this._hass?.user?.is_admin;
    // Where the card sits (float, scroll), its offset in from the edges it's anchored to.
    const at = placement(anchorFor(o.mode, o.anchor));
    Object.assign(layer.style, o.mode === "full" ? { justifyContent: "", alignItems: "", padding: "" } : { justifyContent: at.justify, alignItems: at.align, padding: `${o.offset_y}px ${o.offset_x}px` });
    const holder = layer.querySelector(".holder") as HTMLElement;
    Object.assign(holder.style, { maxWidth: o.mode === "full" ? "" : `${o.width}px`, pointerEvents: "auto" });
    this._door?.place([backdrop, holder], door ? editButton(this) : null, look);
  }

  render() {
    if (!this._config) return nothing;
    if (!this._editing) return nothing; // its card is in the layer
    return html`<div class="badge">${badge(this._config)}</div>
      ${this._child ?? html`<div class="empty">No card yet: pick one in the editor.</div>`}`;
  }

  static styles = css`
    :host {
      display: block;
    }
    .badge {
      display: inline-block;
      margin: 0 0 6px;
      padding: 2px 8px;
      border-radius: 10px;
      font: 11px/16px var(--ha-font-family-code, monospace);
      color: var(--text-primary-color, #fff);
      background: var(--primary-color);
    }
    .empty {
      padding: 16px;
      color: var(--secondary-text-color);
      border: 1px dashed var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }
  `;
}

export { TYPE };
