// The Tablet Layout's options on its own edit surface (view.ts). Words: an edge is a layer's
// top, left, right or bottom; a panel is one of the sections in an edge's stack (main is a
// panel too, the innermost middle). Two kinds of box, each by what opened it:
//   a panel's (its chip): two groups clearly apart, this panel's own (its section's: its
//     length along its edge, held to the end, its padding) and the whole edge's (its
//     layer's `layout:`, so every panel of that edge: its size, hidden, hide when empty,
//     arrange) or, for main, the whole view's (the main panel's shape);
//   a mini box, one setting (openMini): a gap, a line, a margin, an edge's depth, the
//     header's space, the footer.
// Both keep their title and Save / Cancel in sight, only their middle scrolling. Shown on
// the view as they change; Save writes them, Cancel puts them back.
import { LitElement, css, html, nothing } from "lit";
import { define, type Hass, haForm, helper, label, mainSchema, panelSchema } from "./ha.ts";
import { LAYOUT, PANELS, type Panel } from "./layout.ts";
import { layerOf, type Place, SIDES, type Side, withLayer } from "./tablet.ts";

type Layout = Record<string, any>;
const AUTO = "auto"; // the form's field for size: auto
const SKIP = new Set(["fit", "lines"]); // a panel's lines and fit: HA's grid places its cards
const defaults = (p: Panel): Layout => ({ ...LAYOUT.panels[p], unit: "%", hide_empty: true, arrange: "start" });
const across = (p: string) => p === "top" || p === "bottom";
export const PX = (min: number, max: number) => ({ number: { min, max, mode: "box", unit_of_measurement: "px" } });

/** A layout without what equals its default, so the view's YAML holds only real choices. */
export function compact(layout: Layout): Layout {
  const out: Layout = {};
  for (const [k, v] of Object.entries(layout)) {
    if (k === "inner") {
      const inner = compact(v ?? {});
      if (Object.keys(inner).length) out.inner = inner;
    } else if ((PANELS as readonly string[]).includes(k)) {
      const d = defaults(k as Panel);
      const kept = Object.fromEntries(Object.entries(v ?? {}).filter(([pk, pv]) => !SKIP.has(pk) && pv !== d[pk]));
      if (Object.keys(kept).length) out[k] = kept;
    } else if (v !== (LAYOUT.main as Record<string, { default: unknown }>)[k]?.default) out[k] = v;
  }
  return out;
}

/** A form: its fields, their values, and what a change to them makes (a layout; for a
 * panel's own, its section; for a mini box, its value). */
export type Form = { schema: object[]; data: Layout; change: (value: Layout) => Layout; labels?: Record<string, [string, string]> };

/** A one-value-or-each-side setting (tablet.ts: Sides) in a form, as `name`: one number, or,
 * with `name_each` on, `name_top`, `_right`, `_bottom`, `_left`; and back. */
function sidesField(name: string, value: unknown, max: number, label: string, help: string) {
  const each = !!value && typeof value === "object";
  const one = each ? 0 : Number(value) || 0;
  const of = (side: Side) => (each ? Number((value as Record<string, unknown>)[side]) || 0 : one);
  return {
    data: { [name]: one, [`${name}_each`]: each, ...Object.fromEntries(SIDES.map((sd) => [`${name}_${sd}`, of(sd)])) },
    schema: [
      ...(each ? SIDES.map((sd) => ({ name: `${name}_${sd}`, selector: PX(0, max) })) : [{ name, selector: PX(0, max) }]),
      { name: `${name}_each`, selector: { boolean: {} } },
    ],
    labels: {
      [name]: [label, help],
      [`${name}_each`]: ["Each side its own", ""],
      ...Object.fromEntries(SIDES.map((sd) => [`${name}_${sd}`, [`${label}, ${sd}`, ""]])),
    } as Record<string, [string, string]>,
    /** The setting from a form's value. */
    read(v: Layout): unknown {
      if (!v[`${name}_each`]) return Number(v[name]) || 0;
      // Turned on: each side as the one value was; on: as set.
      return Object.fromEntries(SIDES.map((sd) => [sd, Number(v[`${name}_${sd}`] ?? v[name]) || 0]));
    },
  };
}

/** The whole view's options: the main panel's shape (less one of its own: nothing to
 * measure). Its gap, margin and the space above its header are set on the surface. */
export function viewForm(layout: Layout): Form {
  const data = Object.fromEntries(Object.entries(LAYOUT.main).map(([k, o]) => [k, layout[k] ?? o.default]));
  const schema = mainSchema(String(data.main_fit)).flatMap((f: any) =>
    f.name === "main_fit"
      ? [{ ...f, selector: { select: { ...f.selector.select, options: f.selector.select.options.filter((o: any) => o.value !== "own") } } }]
      : ["gap", "margin", "header_space"].includes(f.name)
        ? []
        : [f],
  );
  return { schema, data, change: (v) => ({ ...layout, ...v }) };
}

/** Edge `p` of layer `k`'s options: as tall (top, bottom) or wide (left, right) as its
 * cards, or a size; hidden, hide when empty, arrange (`only`: those named); `room` is its
 * layer's room (px), to keep a size when its unit changes. Its ends' anchors and its gap
 * are set on the surface. */
export function edgeForm(layout: Layout, k: number, p: Panel, room: () => [number, number] | undefined, only?: string[]): Form {
  const mine: Layout = layerOf(layout, k)[p] ?? {};
  const auto = mine.size === AUTO;
  const data: Layout = { ...defaults(p), ...mine, [AUTO]: auto };
  if (auto) data.size = LAYOUT.panels[p].size;
  const px = data.unit === "px";
  const schema = [
    { name: AUTO, selector: { boolean: {} } },
    ...panelSchema(p)
      .filter((f: any) => !SKIP.has(f.name) && !f.name.startsWith("anchor_") && !(auto && (f.name === "size" || f.name === "unit")))
      .map((f: any) => (f.name === "size" && px ? { ...f, selector: { number: { ...f.selector.number, max: 2000 } } } : f)),
    {
      name: "arrange",
      selector: {
        select: {
          mode: "dropdown",
          options: [
            { value: "start", label: across(p) ? "From the left" : "From the top" },
            { value: "centre", label: "Centred" },
            { value: "end", label: across(p) ? "From the right" : "From the bottom" },
          ],
        },
      },
    },
  ].filter((f: any) => !only || only.includes(f.name));
  const way = across(p) ? "tall" : "wide";
  return {
    schema,
    data,
    labels: {
      [AUTO]: [`As ${way} as its cards`, `The edge is exactly as ${way} as what its panels hold, as cards show and hide.`],
      arrange: ["Arrange", "Where its panels sit when they do not fill it (none filling); those held to the end stay there."],
    },
    change: (v) => {
      const { [AUTO]: isAuto, ...rest } = v;
      let size = isAuto ? AUTO : rest.size === AUTO ? LAYOUT.panels[p].size : rest.size;
      if (!isAuto && rest.unit !== data.unit) {
        // The same size in the other unit, in its layer's room.
        const [w, h] = room() ?? [0, 0];
        const of = across(p) ? h : w;
        if (of > 0) size = Math.round(rest.unit === "px" ? (of * size) / 100 : Math.min(100, (size * 100) / of));
      }
      return withLayer(layout, k, (c) => ({ ...c, [p]: { ...c[p], ...rest, size } }));
    },
  };
}

/** An ha-form for `form`, its labels and help from layout.json (or its own). */
export function formOf(hass: Hass, form: Form, onChange: (layout: Layout) => void) {
  const own = form.labels ?? {};
  return html`<ha-form
    .hass=${hass}
    .data=${form.data}
    .schema=${form.schema}
    .computeLabel=${(s: { name: string }) => own[s.name]?.[0] ?? label(s)}
    .computeHelper=${(s: { name: string }) => own[s.name]?.[1] ?? helper(s)}
    @value-changed=${(ev: CustomEvent) => {
      ev.stopPropagation();
      onChange(form.change(ev.detail.value));
    }}
  ></ha-form>`;
}

/** A panel's own: its length along its edge, as its cards, filling (what the others leave)
 * or fixed (a top or bottom one's Width, column_span, of the view's `columns`; a left or
 * right one's rows, row_span, HA's card rows), by default filling when `alone` and as its
 * cards otherwise; whether it is held against the end; its padding (main: its padding
 * only). Its change is its section's config (`view_layout: {length, hold, padding}`). */
function panelForm(section: Layout, place: Place, columns: number, alone: boolean): Form {
  const vl: Layout = section.view_layout ?? {};
  const padding = sidesField("padding", vl.padding ?? 0, 400, "Padding", "Room inside it, round its cards, px: to line them up.");
  const { view_layout: _, ...rest } = section;
  /** Its section with `view_layout` (as was, `more` over it) and `v`'s padding. */
  const withPadding = (v: Layout, more: Layout, base: Layout = rest) => {
    const pad = padding.read(v);
    const { padding: _p, ...kept } = more;
    const view_layout = { ...kept, ...((typeof pad === "object" || pad) && { padding: pad }) };
    return { ...base, ...(Object.keys(view_layout).length && { view_layout }) };
  };
  if (place === "main") return { schema: padding.schema, data: padding.data, labels: padding.labels, change: (v) => withPadding(v, vl) };
  const p = place;
  const key = across(p) ? "column_span" : "row_span";
  const length = section[key] !== undefined ? "fixed" : (vl.length ?? (alone ? "fill" : "cards"));
  const what = across(p) ? "wide" : "tall";
  return {
    schema: [
      {
        name: "length",
        selector: {
          select: {
            mode: "list",
            options: [
              { value: "cards", label: `As ${what} as its cards` },
              { value: "fill", label: "Fill what is left" },
              { value: "fixed", label: across(p) ? "A fixed width" : "A fixed height" },
            ],
          },
        },
      },
      ...(length === "fixed" ? [{ name: key, selector: { number: { min: 1, max: across(p) ? columns : 16, mode: "slider" } } }] : []),
      { name: "hold", selector: { boolean: {} } },
      ...padding.schema,
    ],
    data: { length, [key]: section[key] ?? 1, hold: vl.hold === "end", ...padding.data },
    labels: {
      length: [across(p) ? "Width" : "Height", ""],
      column_span: ["Width", `Columns of the view's ${columns} (its Width in HA's Layout tab).`],
      row_span: ["Height", "In HA's card rows (56 px each, and the gap between)."],
      hold: [`Hold to the ${across(p) ? "right" : "bottom"}`, "Against the end of its edge, whatever the others do."],
      ...padding.labels,
    },
    change: (v) => {
      const { [key]: _k, ...base } = rest;
      const { length: _l, hold: _h, ...kept } = vl;
      return withPadding(
        v,
        { ...kept, ...(v.length !== "fixed" && { length: v.length }), ...(v.hold && { hold: "end" }) },
        { ...base, ...(v.length === "fixed" && { [key]: Number(v[key]) || 1 }) },
      );
    },
  };
}

/** Where a box goes, by what opened it: below it when there is room for a box (360 px),
 * else on whichever side has more; on the screen. Its height at most that room (its middle
 * scrolls). */
function placeBy(anchor: Element, box: HTMLElement): string {
  const a = anchor.getBoundingClientRect();
  const [vw, vh] = [window.innerWidth, window.innerHeight];
  const left = Math.max(8, Math.min(a.left, vw - box.offsetWidth - 8));
  const below = vh - a.bottom - 12;
  const above = a.top - 12;
  return below >= 360 || below >= above
    ? `left:${left}px;top:${a.bottom + 4}px;max-height:${below}px`
    : `left:${left}px;bottom:${vh - a.top + 4}px;max-height:${above}px`;
}

/** A box by its anchor: a backdrop (closes it, as Escape does), its title, its middle (which
 * scrolls), Cancel / Save always in sight. */
abstract class Floating extends LitElement {
  static properties = { busy: { state: true }, at: { state: true } };
  busy = false;
  at = "";
  abstract anchor(): Element;
  abstract cancel(): void;
  abstract commit(): Promise<unknown>;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.key);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("keydown", this.key);
  }
  private key = (ev: KeyboardEvent) => ev.key === "Escape" && this.cancel();

  /** Placed once, when its form is there to size it, and never moved after: what opened it
   * may be drawn again (and gone) as its settings show on the view. */
  updated() {
    if (this.at || !customElements.get("ha-form")) return;
    const box = this.shadowRoot?.querySelector(".box") as HTMLElement | null;
    if (box) this.at = placeBy(this.anchor(), box);
  }

  protected async save() {
    this.busy = true;
    try {
      await this.commit();
      this.remove();
    } finally {
      this.busy = false;
    }
  }

  protected frame(title: string, label: string, top: unknown, middle: unknown) {
    return html`<div class="backdrop" @click=${() => this.cancel()}></div>
      <div class="box" role="dialog" aria-label=${label} style=${this.at || "visibility:hidden"}>
        <header><h2>${title}</h2>${top}</header>
        <div class="middle">${customElements.get("ha-form") ? middle : html`<p class="note">Loading…</p>`}</div>
        <footer>
          <button class="text" @click=${() => this.cancel()}>Cancel</button>
          <button class="primary" ?disabled=${this.busy} @click=${() => this.save()}>Save</button>
        </footer>
      </div>`;
  }

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      z-index: 100;
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
      color: var(--primary-text-color);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.2);
    }
    .box {
      position: absolute;
      display: flex;
      flex-direction: column;
      width: min(380px, calc(100vw - 16px));
      overflow: hidden;
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    header {
      flex: none;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 14px 16px 6px;
      border-bottom: 1px solid var(--divider-color);
    }
    .middle {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      padding: 4px 0;
    }
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .actions button,
    .act {
      font: inherit;
      font-size: 13px;
      padding: 4px 12px;
      border-radius: 16px;
      border: 1px solid var(--primary-color);
      background: none;
      color: var(--primary-color);
      cursor: pointer;
    }
    .actions button[disabled] {
      opacity: 0.35;
      cursor: default;
    }
    section {
      margin: 8px 12px;
      padding: 8px 12px 12px;
      border-radius: 12px;
      border: 1px solid var(--divider-color);
    }
    h3 {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--primary-color);
    }
    .note {
      margin: 2px 0 8px;
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .plain {
      padding: 4px 16px;
    }
    .link {
      margin-top: 8px;
      padding: 0;
      font: inherit;
      font-size: 14px;
      border: none;
      background: none;
      color: var(--primary-color);
      cursor: pointer;
    }
    footer {
      flex: none;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 10px 16px 14px;
      border-top: 1px solid var(--divider-color);
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

export type PanelOptions = {
  hass: Hass;
  anchor: Element; // its chip, which it opens by
  name: string; // the panel's, as its chip
  place: Place;
  layer: number;
  count: number; // panels in its edge; main: the layers
  columns: number; // the view's max_columns
  layout: Layout;
  section: Layout; // its section's config
  room: () => [number, number] | undefined; // its layer's room, px
  actions: { add?: () => void; back?: () => void; on?: () => void; remove?: () => void }; // each saved at once
  edit: () => void; // HA's own editor for its section
  apply: (layout: Layout, section: Layout) => void; // shown on the view, not saved
  save: (layout: Layout, section: Layout) => Promise<unknown>;
};

class PanelOptionsBox extends Floating {
  static properties = { ...Floating.properties, layout: { state: true }, section: { state: true } };
  o!: PanelOptions;
  layout: Layout = {};
  section: Layout = {};

  open(o: PanelOptions) {
    this.o = o;
    this.layout = o.layout;
    this.section = o.section;
    document.body.append(this);
    haForm().then(() => this.requestUpdate());
  }

  anchor() {
    return this.o.anchor;
  }
  private change(layout: Layout, section = this.section) {
    this.layout = layout;
    this.section = section;
    this.o.apply(layout, section);
  }
  cancel() {
    this.o.apply(this.o.layout, this.o.section);
    this.remove();
  }
  commit() {
    return this.o.save(compact(this.layout), this.section);
  }
  /** An action saves at once: what is open here is put back first. */
  private act(f?: () => void) {
    this.cancel();
    f?.();
  }

  private group(title: string, note: string, body: unknown) {
    return html`<section>
      <h3>${title}</h3>
      ${note ? html`<p class="note">${note}</p>` : nothing}
      ${body}
    </section>`;
  }

  render() {
    if (!this.o) return nothing;
    const o = this.o;
    const main = o.place === "main";
    const p = o.place as Panel;
    const edgeName = `${o.layer > 1 ? `layer ${o.layer} ` : ""}${p} edge`;
    const { add, back, on, remove } = o.actions;
    const arrows = across(p) ? ["←", "→"] : ["↑", "↓"];
    const top = main
      ? html`<div class="actions">
          ${add ? html`<button @click=${() => this.act(add)}>+ Add a layer</button>` : nothing}
          ${remove ? html`<button @click=${() => this.act(remove)}>Remove layer ${o.count}</button>` : nothing}
        </div>`
      : html`<div class="actions">
          <button @click=${() => this.act(add)}>+ Add a panel</button>
          ${back || on
            ? html`<button ?disabled=${!back} aria-label="Move earlier" @click=${() => this.act(back)}>${arrows[0]}</button>
                <button ?disabled=${!on} aria-label="Move later" @click=${() => this.act(on)}>${arrows[1]}</button>`
            : nothing}
        </div>`;
    return this.frame(
      o.name,
      `${o.name} options`,
      top,
      html`${this.group(
        "This panel",
        main ? "" : `${o.name} only.`,
        html`${formOf(o.hass, panelForm(this.section, o.place, o.columns, o.count === 1), (s) => this.change(this.layout, s))}
          <button class="link" @click=${() => this.act(o.edit)}>Visibility, background and more (HA's own)…</button>`,
      )}
      ${main
        ? this.group("Whole view", "The main panel's shape.", formOf(o.hass, viewForm(this.layout), (l) => this.change(l)))
        : this.group(
            `Whole ${edgeName}`,
            o.count > 1 ? `All ${o.count} panels of the ${edgeName}.` : `Every panel of the ${edgeName} (one now).`,
            formOf(o.hass, edgeForm(this.layout, o.layer, p, o.room), (l) => this.change(l)),
          )}`,
    );
  }
}

define("casa-mia-panel-options", PanelOptionsBox);

/** Open a panel's options by its chip. */
export function openPanelOptions(o: PanelOptions): void {
  (document.createElement("casa-mia-panel-options") as PanelOptionsBox).open(o);
}

/** A mini box: one setting, by what opened it. Its `value` (whatever it is about) is shown
 * on the view as it changes (`apply`) and written by Save; `form` is its fields for a value;
 * `actions` are done at once, after putting it back. */
export type Mini = {
  hass: Hass;
  anchor: Element;
  title: string;
  note?: string;
  value: Layout;
  form: (value: Layout) => Form;
  actions?: { label: string; run: () => void }[];
  apply: (value: Layout) => void;
  save: (value: Layout) => Promise<unknown>;
};

class MiniBox extends Floating {
  static properties = { ...Floating.properties, value: { state: true } };
  o!: Mini;
  value: Layout = {};

  open(o: Mini) {
    this.o = o;
    this.value = o.value;
    document.body.append(this);
    haForm().then(() => this.requestUpdate());
  }
  anchor() {
    return this.o.anchor;
  }
  cancel() {
    this.o.apply(this.o.value);
    this.remove();
  }
  commit() {
    return this.o.save(this.value);
  }

  render() {
    if (!this.o) return nothing;
    const o = this.o;
    const acts = o.actions?.length
      ? html`<div class="actions">
          ${o.actions.map(
            (a) =>
              html`<button
                @click=${() => {
                  this.cancel();
                  a.run();
                }}
              >
                ${a.label}
              </button>`,
          )}
        </div>`
      : nothing;
    return this.frame(
      o.title,
      o.title,
      acts,
      html`<div class="plain">
        ${o.note ? html`<p class="note">${o.note}</p>` : nothing}
        ${formOf(o.hass, o.form(this.value), (v) => {
          this.value = v;
          o.apply(v);
        })}
      </div>`,
    );
  }
}

define("casa-mia-mini", MiniBox);

/** Open a mini box by what opened it. */
export function openMini(o: Mini): void {
  (document.createElement("casa-mia-mini") as MiniBox).open(o);
}
