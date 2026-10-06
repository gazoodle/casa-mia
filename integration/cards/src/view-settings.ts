// The Tablet Layout's settings dialog (its `layout:`), opened from the view in edit mode: a map
// of this screen with each panel where it lands, laid out live as the options change (the
// view behind it too); a panel, or the middle for the layout's own options, is picked on the
// map. Options, labels and help come from layout.json (ha.ts: mainSchema, panelSchema), less
// those a view has no use for (a panel's lines and fit: HA's grid places its cards; a main
// of its own shape: nothing to measure). Saved into the view's config; Cancel puts it back.
import { LitElement, css, html, nothing } from "lit";
import { define, type Hass, haForm, helper, label, mainSchema, panelSchema } from "./ha.ts";
import { LAYOUT, PANELS, type Panel, type Rect } from "./layout.ts";

type Place = "main" | Panel;
type Layout = Record<string, any>;
/** Where everything lands for a layout, on this screen (the view works it out). */
export type Preview = { width: number; height: number; rects: Partial<Record<Place, Rect>> };
export type Settings = {
  hass: Hass;
  layout: Layout;
  preview: (layout: Layout) => Preview;
  apply: (layout: Layout) => void; // show it on the view (not saved)
  save: (layout: Layout) => Promise<unknown>;
};

const NAMES: Record<Place, string> = { main: "Main", left: "Left", top: "Top", right: "Right", bottom: "Bottom" };
const AUTO = "auto"; // the form's field for size: auto (top and bottom)
const SKIP = new Set(["fit", "lines"]);
const defaults = (p: Panel): Layout => ({ ...LAYOUT.panels[p], hide_empty: true });

/** A layout without what equals its default, so the view's YAML holds only real choices. */
export function compact(layout: Layout): Layout {
  const out: Layout = {};
  for (const [k, v] of Object.entries(layout)) {
    if ((PANELS as readonly string[]).includes(k)) {
      const d = defaults(k as Panel);
      const kept = Object.fromEntries(Object.entries(v ?? {}).filter(([pk, pv]) => !SKIP.has(pk) && pv !== d[pk]));
      if (Object.keys(kept).length) out[k] = kept;
    } else if (v !== (LAYOUT.main as Record<string, { default: unknown }>)[k]?.default) out[k] = v;
  }
  return out;
}

class ViewSettings extends LitElement {
  static properties = { layout: { state: true }, sel: { state: true }, busy: { state: true } };
  settings!: Settings;
  layout: Layout = {};
  sel: Place = "main";
  busy = false;
  private original: Layout = {};

  open(settings: Settings) {
    this.settings = settings;
    this.original = settings.layout;
    this.layout = settings.layout;
    document.body.append(this);
    haForm().then(() => this.requestUpdate());
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.key);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.key);
  }
  private key = (ev: KeyboardEvent) => ev.key === "Escape" && this.cancel();

  private change(next: Layout) {
    this.layout = next;
    this.settings.apply(next);
  }
  private cancel() {
    this.settings.apply(this.original);
    this.remove();
  }
  private async save() {
    this.busy = true;
    try {
      await this.settings.save(compact(this.layout));
      this.remove();
    } finally {
      this.busy = false;
    }
  }

  private form(schema: object[], data: object, onChange: (v: Layout) => void) {
    return html`<ha-form
      .hass=${this.settings.hass}
      .data=${data}
      .schema=${schema}
      .computeLabel=${(s: { name: string }) => (s.name === AUTO ? "As tall as its cards" : label(s))}
      .computeHelper=${(s: { name: string }) =>
        s.name === AUTO ? "The panel is exactly as tall as what it holds, as cards show and hide." : helper(s)}
      @value-changed=${(ev: CustomEvent) => {
        ev.stopPropagation();
        onChange(ev.detail.value);
      }}
    ></ha-form>`;
  }

  private options() {
    if (!customElements.get("ha-form")) return html`<p class="help">Loading…</p>`;
    const l = this.layout;
    if (this.sel === "main") {
      const data = Object.fromEntries(Object.entries(LAYOUT.main).map(([k, o]) => [k, l[k] ?? o.default]));
      const schema = mainSchema(String(data.main_fit)).map((f: any) =>
        f.name === "main_fit" ? { ...f, selector: { select: { ...f.selector.select, options: f.selector.select.options.filter((o: any) => o.value !== "own") } } } : f,
      );
      return html`<p class="help">The middle: what is left between the panels, and how the panels share the screen.</p>
        ${this.form(schema, data, (v) => this.change({ ...l, ...v }))}`;
    }
    const p = this.sel;
    const mine: Layout = l[p] ?? {};
    const edge = p === "top" || p === "bottom";
    const auto = edge && mine.size === AUTO;
    const data: Layout = { ...defaults(p), ...mine, ...(edge && { [AUTO]: auto }) };
    if (auto) data.size = LAYOUT.panels[p].size;
    const schema = [
      ...(edge ? [{ name: AUTO, selector: { boolean: {} } }] : []),
      ...panelSchema(p).filter((f: any) => !SKIP.has(f.name) && !(auto && f.name === "size")),
    ];
    return html`<p class="help">Its cards are the view's ${NAMES[p].toLowerCase()} section: add and edit them on the view.</p>
      ${this.form(schema, data, (v) => {
        const { [AUTO]: isAuto, ...rest } = v;
        const size = isAuto ? AUTO : rest.size === AUTO ? LAYOUT.panels[p].size : rest.size;
        this.change({ ...l, [p]: { ...rest, size } });
      })}`;
  }

  private map() {
    const { width, height, rects } = this.settings.preview(this.layout);
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    const place = (p: Place) => {
      const r = rects[p];
      if (!r || r[2] <= 0 || r[3] <= 0) return nothing;
      return html`<button
        class="area ${p} ${this.sel === p ? "on" : ""}"
        style="left:${pct(r[0], width)};top:${pct(r[1], height)};width:${pct(r[2], width)};height:${pct(r[3], height)}"
        @click=${() => (this.sel = p)}
      >
        <span>${NAMES[p]}</span><small>${Math.round(r[2])} × ${Math.round(r[3])}</small>
      </button>`;
    };
    const off = PANELS.filter((p) => !rects[p]);
    return html`<div class="map" style="aspect-ratio:${width} / ${height}">${(["main", ...PANELS] as Place[]).map(place)}</div>
      <div class="chips">
        ${(["main", ...PANELS] as Place[]).map(
          (p) => html`<button class="chip ${this.sel === p ? "on" : ""} ${off.includes(p as Panel) ? "off" : ""}" @click=${() => (this.sel = p)}>
            ${NAMES[p]}${off.includes(p as Panel) ? " (hidden)" : ""}
          </button>`,
        )}
      </div>`;
  }

  render() {
    if (!this.settings) return nothing;
    return html`<div class="backdrop" @click=${this.cancel}></div>
      <div class="dialog" role="dialog" aria-label="Tablet Layout">
        <header>
          <h2>Tablet Layout</h2>
          <p class="help">How this view's panels share the screen. Pick a panel, or the middle for the whole layout.</p>
        </header>
        <div class="body">${this.map()}${this.options()}</div>
        <footer>
          <button class="text" @click=${this.cancel}>Cancel</button>
          <button class="primary" ?disabled=${this.busy} @click=${this.save}>Save</button>
        </footer>
      </div>`;
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      color: var(--primary-text-color);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
    }
    .dialog {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(720px, calc(100vw - 32px));
      max-height: calc(100dvh - 32px);
      background: var(--card-background-color, #fff);
      border-radius: var(--ha-dialog-border-radius, 24px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    header {
      padding: 20px 24px 0;
    }
    h2 {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 400;
    }
    .help {
      margin: 0 0 12px;
      color: var(--secondary-text-color);
      font-size: 14px;
    }
    .body {
      padding: 8px 24px;
      overflow: auto;
    }
    .map {
      position: relative;
      width: 100%;
      max-height: 40dvh;
      margin: 0 auto 12px;
      background: var(--primary-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      overflow: hidden;
    }
    .area {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      padding: 0;
      font: inherit;
      color: var(--primary-text-color);
      background: color-mix(in srgb, var(--primary-color) 14%, var(--card-background-color));
      border: 1px solid color-mix(in srgb, var(--primary-color) 40%, transparent);
      border-radius: 4px;
      cursor: pointer;
      overflow: hidden;
    }
    .area.main {
      background: color-mix(in srgb, var(--primary-color) 6%, var(--card-background-color));
    }
    .area.on {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color);
    }
    .area span {
      font-size: 14px;
      font-weight: 500;
    }
    .area small {
      font-size: 11px;
      opacity: 0.75;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
    }
    .chip {
      font: inherit;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .chip.on {
      background: var(--primary-color);
      border-color: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .chip.off:not(.on) {
      color: var(--secondary-text-color);
      border-style: dashed;
    }
    footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 24px 20px;
    }
    footer button {
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      padding: 8px 20px;
      border-radius: 20px;
      border: none;
      cursor: pointer;
    }
    .text {
      background: none;
      color: var(--primary-color);
    }
    .primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
    }
    .primary[disabled] {
      opacity: 0.5;
    }
  `;
}

define("casa-mia-view-settings", ViewSettings);

/** Open the dialog. */
export function openSettings(settings: Settings): void {
  (document.createElement("casa-mia-view-settings") as ViewSettings).open(settings);
}
