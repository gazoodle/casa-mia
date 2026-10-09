// HA's editors patched for the Tablet Layout: its sections' frame and menu, the view editor's types and options, the edit-view dialog.


// A section's frame and menu in edit mode (HA's hui-section-edit-mode): the frame fills the
// panel's room; its menu: Edit, and Delete while its
// stack has another (cm-deletable, set by the view), so a panel keeps a section; no drag
// handle (sections stay where they are, see updated; a panel's toolbar orders a
// stack) and no Duplicate.
const MENU = new CSSStyleSheet();
MENU.replaceSync(
  `.handle, ha-dropdown-item[value="duplicate"], :host(:not([cm-deletable])) ha-dropdown-item[value="delete"], :host(:not([cm-deletable])) wa-divider { display: none; }
  /* Its frame fills the panel's room, as the panel does out of edit mode (not only its cards' height). */
  :host { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; }
  .section-wrapper { flex: 1 1 auto; box-sizing: border-box; }`,
);
customElements.whenDefined("hui-section-edit-mode").then(() => {
  const proto = (customElements.get("hui-section-edit-mode") as any).prototype;
  const first = proto.firstUpdated;
  proto.firstUpdated = function (this: any, ...args: unknown[]) {
    first?.apply(this, args);
    for (let n: Node | null = this; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null))
      if (TYPES.some((t) => (n as Element).tagName === t.slice("custom:".length).toUpperCase())) {
        const root = this.shadowRoot as ShadowRoot | null;
        if (root && !root.adoptedStyleSheets.includes(MENU)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, MENU];
        return;
      }
  };
});

// HA's view editor (Edit view, and Add view) lists only its own types; Tablet Layout joins
// them, as layout-card's do (it patches the same method). Its dialog keeps a Sections view's
// sections from going to another type (it would lose them, so Save is off); this view is a
// Sections view, so to the dialog it is one. Of the Sections view's own options it offers
// two (dense section placement means nothing where the layout places the panels):
//   max_columns: the most a panel's Width (its section's column_span, in the section's
//     settings) may be; a panel's cards are laid out in 12 x its Width columns, so cards at
//     full width line up that many across;
//   top_margin: HA's extra space above the view (the theme's
//     --ha-view-sections-extra-top-margin, 80 px), taken from the panels' height.
const TYPE = "custom:casa-mia-tablet-layout";
const TYPES = [TYPE, "custom:casa-mia-tablet-view"]; // and its first name
customElements.whenDefined("hui-view-editor").then(() => {
  const proto = (customElements.get("hui-view-editor") as any).prototype;
  const first = proto.firstUpdated;
  proto.firstUpdated = function (this: any, ...args: unknown[]) {
    first?.apply(this, args);
    const schema = this._schema;
    if (typeof schema !== "function") return;
    this._schema = (...a: unknown[]) =>
      schema(...a).map((f: any) => {
        if (f.name === "section_specifics" && TYPES.includes(this._config?.type))
          return { ...f, visible: undefined, schema: f.schema.filter((o: any) => o.name !== "dense_section_placement") };
        const options = f.name === "type" ? f.selector?.select?.options : undefined;
        if (!options || options.some((o: any) => o.value === TYPE)) return f;
        return { ...f, selector: { select: { ...f.selector.select, options: [...options, { value: TYPE, label: "Tablet (Casa Mia)" }] } } };
      });
    this.requestUpdate();
  };
  // A view without max_columns shows HA's default (DEFAULT_MAX_COLUMNS), not an empty field
  // (HA writes it into a new Sections view; a Tablet Layout has none). Saved only on a change.
  const config = Object.getOwnPropertyDescriptor(proto, "config");
  if (config?.set)
    Object.defineProperty(proto, "config", {
      ...config,
      set(this: any, c: any) {
        config.set!.call(this, TYPES.includes(c?.type) && c.max_columns === undefined ? { ...c, max_columns: 4 } : c);
      },
    });
  // HA's drops the Sections options from a view of any other type: this one keeps its two.
  const changed = proto._valueChanged;
  proto._valueChanged = function (this: any, ev: CustomEvent) {
    const config = ev.detail?.value;
    if (!TYPES.includes(config?.type)) return changed.call(this, ev);
    const kept = new Proxy(config, { deleteProperty: (t, k) => k === "max_columns" || k === "top_margin" || Reflect.deleteProperty(t, k) });
    return changed.call(this, new CustomEvent(ev.type, { detail: { value: kept } }));
  };
});
customElements.whenDefined("hui-dialog-edit-view").then(() => {
  const proto = (customElements.get("hui-dialog-edit-view") as any).prototype;
  const type = Object.getOwnPropertyDescriptor(proto, "_type");
  if (!type?.get) return;
  Object.defineProperty(proto, "_type", {
    ...type,
    get(this: any) {
      return TYPES.includes(this._config?.type) ? "sections" : type.get!.call(this);
    },
  });
});
