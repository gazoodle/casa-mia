// Section card: child cards on a section's grid (12 columns; each card as wide as its
// grid_options say, or its own default: a tile half, most cards all of it; rows of 56px for
// cards that set rows), hidden while none of the cards that count is showing. A card counts
// unless it says `view_layout: {counts: false}`: a "Warnings" heading over conditional
// warnings shows only while one of them does, with no condition of its own. Hidden, it
// tells its parent (hui-card hides it; a Tablet layout panel that hides when empty then
// takes no room). In edit mode everything shows.
import { LitElement, css, html, nothing, type PropertyValues } from "lit";
import { type CardConfig, define, fire, type Hass, type HuiCard, huiCard, register, shown, type StackEditor, stackEditor } from "./ha.ts";

type Config = { type: string; cards: CardConfig[] };
export const counts = (c: CardConfig) => c.view_layout?.counts !== false;

/** Columns (of 12) and rows (a number, or auto) a card takes: its grid_options over its own. */
function grid(el: HuiCard): { columns: number; rows: number | "auto" } {
  const any = el as any;
  const own = any.getGridOptions?.() ?? any._element?.getGridOptions?.() ?? {};
  const g = { ...own, ...el.config?.grid_options };
  const columns = g.columns === "full" ? 12 : Math.min(12, Math.max(1, Number(g.columns) || 12));
  return { columns, rows: typeof g.rows === "number" ? g.rows : "auto" };
}

class SectionCard extends LitElement {
  static properties = { hass: { attribute: false }, preview: { type: Boolean }, _cards: { state: true } };
  hass?: Hass;
  preview = false;
  _config?: Config;
  _cards: HuiCard[] = [];
  private frame = 0;

  static getConfigElement() {
    return document.createElement("casa-mia-section-editor");
  }
  static getStubConfig() {
    return {
      cards: [
        { type: "heading", heading: "Warnings", view_layout: { counts: false } },
        { type: "markdown", content: "Each card here can have its own visibility; the section hides when none shows." },
      ],
    };
  }
  setConfig(config: Config) {
    if (!Array.isArray(config.cards)) throw new Error("cards: a list of cards");
    this._config = config;
    Promise.all(config.cards.map((c) => huiCard(c, this.hass, this.preview))).then((cards) => {
      if (this._config === config) this._cards = cards;
    });
  }
  getCardSize() {
    return this._cards.length;
  }
  getGridOptions() {
    return { columns: "full", rows: "auto" };
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderRoot.addEventListener("card-visibility-changed", this.changed);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.renderRoot.removeEventListener("card-visibility-changed", this.changed);
    cancelAnimationFrame(this.frame);
  }
  private changed = (ev: Event) => {
    ev.stopPropagation(); // ours to tell, once the whole section is decided
    this.schedule();
  };
  private schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.check());
  }

  updated(changed: PropertyValues) {
    for (const el of this._cards) {
      if (changed.has("hass")) el.hass = this.hass;
      if (changed.has("preview")) el.preview = this.preview;
    }
    this.schedule();
  }

  /** Each cell's size, and whether the section shows. */
  private check() {
    this._cards.forEach((el) => {
      const cell = el.parentElement;
      if (!cell) return;
      const g = grid(el);
      cell.style.gridColumn = `span ${g.columns}`;
      cell.style.gridRow = g.rows === "auto" ? "" : `span ${g.rows}`;
      cell.style.height = g.rows === "auto" ? "" : `calc(${g.rows} * var(--row-height, 56px) + ${g.rows - 1} * var(--row-gap, 8px))`;
      cell.hidden = !shown(el);
    });
    const visible = this.preview || this._cards.some((el, i) => counts(this._config!.cards[i]) && shown(el));
    if (this.hidden === visible) {
      this.hidden = !visible;
      fire(this, "card-visibility-changed", { value: visible });
    }
  }

  render() {
    return html`<div class="grid">${this._cards.map((el) => html`<div class="cell">${el}</div>`)}</div>`;
  }

  static styles = css`
    :host([hidden]) {
      display: none;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-auto-rows: minmax(var(--row-height, 56px), auto);
      gap: var(--row-gap, 8px) var(--column-gap, 8px);
    }
    .cell[hidden] {
      display: none;
    }
    .cell > * {
      height: 100%;
    }
  `;
}

// --- the editor: HA's stack editor for the cards, then which count and how wide ----------

const WIDTHS = [
  ["", "Its own"],
  ["3", "Quarter"],
  ["4", "Third"],
  ["6", "Half"],
  ["8", "Two thirds"],
  ["12", "Full"],
];

/** A card in a list: its type and what it shows. */
export function describe(c: CardConfig): string {
  const what = c.heading ?? c.title ?? c.name ?? c.entity ?? (c.content ? String(c.content).slice(0, 30) : "");
  return `${String(c.type).replace(/^custom:/, "")}${what ? `: ${what}` : ""}`;
}

/** HA's stack editor over `cards`, reporting each change (and never to HA's own dialog,
 * which would take it for this card's whole config). */
export async function mountStack(host: HTMLElement, hass: Hass | undefined, lovelace: unknown, cards: CardConfig[], onChange: (cards: CardConfig[]) => void): Promise<StackEditor> {
  const ed = await stackEditor();
  ed.hass = hass;
  ed.lovelace = lovelace;
  ed.setConfig({ type: "vertical-stack", cards });
  ed.addEventListener("config-changed", (ev) => {
    ev.stopPropagation();
    onChange((ev as CustomEvent).detail.config.cards ?? []);
  });
  host.replaceChildren(ed);
  return ed;
}

class SectionEditor extends LitElement {
  static properties = { hass: { attribute: false }, lovelace: { attribute: false }, _config: { state: true } };
  hass?: Hass;
  lovelace?: unknown;
  _config?: Config;
  private stack?: StackEditor;

  setConfig(config: Config) {
    this._config = config;
    this.stack?.setConfig({ type: "vertical-stack", cards: config.cards });
  }

  firstUpdated() {
    mountStack(this.renderRoot.querySelector(".stack")!, this.hass, this.lovelace, this._config?.cards ?? [], (cards) => this.save({ ...this._config!, cards })).then(
      (ed) => (this.stack = ed),
    );
  }
  updated(changed: PropertyValues) {
    if (this.stack && changed.has("hass")) this.stack.hass = this.hass;
  }

  private save(config: Config) {
    this._config = config;
    fire(this, "config-changed", { config });
  }

  private setCard(i: number, change: (c: CardConfig) => void) {
    const cards = structuredClone(this._config!.cards);
    change(cards[i]);
    if (cards[i].view_layout && !Object.keys(cards[i].view_layout).length) delete cards[i].view_layout;
    if (cards[i].grid_options && !Object.keys(cards[i].grid_options).length) delete cards[i].grid_options;
    this.save({ ...this._config!, cards });
    this.stack?.setConfig({ type: "vertical-stack", cards });
  }

  render() {
    if (!this._config) return nothing;
    return html`
      <p class="help">The section hides while none of the cards that count is showing (each card's own visibility). A heading that should only show with them: switch off Counts.</p>
      <div class="rows">
        ${this._config.cards.map(
          (c, i) => html`<div class="row">
            <span class="name">${i + 1}. ${describe(c)}</span>
            <label
              >Counts
              <ha-switch
                .checked=${counts(c)}
                @change=${(ev: Event) =>
                  this.setCard(i, (card) => {
                    const on = (ev.target as HTMLInputElement).checked;
                    card.view_layout = { ...card.view_layout };
                    if (on) delete card.view_layout.counts;
                    else card.view_layout.counts = false;
                  })}
              ></ha-switch
            ></label>
            <select
              .value=${String(c.grid_options?.columns === "full" ? 12 : (c.grid_options?.columns ?? ""))}
              @change=${(ev: Event) =>
                this.setCard(i, (card) => {
                  const v = (ev.target as HTMLSelectElement).value;
                  card.grid_options = { ...card.grid_options };
                  if (v) card.grid_options.columns = Number(v);
                  else delete card.grid_options.columns;
                })}
            >
              ${WIDTHS.map(([v, l]) => html`<option value=${v}>${l}</option>`)}
            </select>
          </div>`,
        )}
      </div>
      <div class="stack"></div>
    `;
  }

  static styles = css`
    .help {
      color: var(--secondary-text-color);
      margin: 0 0 8px;
    }
    .rows {
      display: grid;
      gap: 4px;
      margin-bottom: 16px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  `;
}

define("casa-mia-section", SectionCard);
define("casa-mia-section-editor", SectionEditor);
register("casa-mia-section", "Casa Mia section", "A section's grid of cards that hides itself while none of the cards that count is showing.");
