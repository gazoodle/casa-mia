// Tablet Layout (view type custom:casa-mia-tablet-layout, "Tablet (Casa Mia)" in HA's view editor): HA's own Sections view, so its header,
// footer, badges and section editing are HA's, locked to the screen. HA puts every view in a
// container at least the screen tall with the header padded off; this view takes exactly
// that (flex basis 0, never its content's height) and clips, so the page never scrolls.
//
// Its sections are its panels: each names its panel and layer (`view_layout: {panel: top,
// layer: 2}`; tablet.ts has the layers and stacks), or, in a view from before panel stacks,
// is one by position: main, left, top, right, bottom (edit mode adds a section for each
// panel of the first layer that has none, and names each). The layout engine (layout.ts)
// places the panels by the view's `layout:` options (those of layout.json; set on the edit
// surface, below); HA's grid places the cards in each. Sections are not dragged or
// duplicated; one is deleted (its menu) only from a stack of more than one, so a panel
// keeps a section; cards move between them as in any Sections view. A
// section's own visibility hides it, and so does having no card showing that counts (a
// heading marked `view_layout: {counts: false}` does not; panel option hide_empty: false
// keeps it); a hidden section takes no room, nor a panel with none showing. In edit mode
// every section shows, and a hidden edge too, hatched (to be shown again). A section with one card that counts showing is filled by it
// (headings above it keep their height; not in a top or bottom panel of `size: auto`, which
// is as tall as its cards instead, nor in a left or right stack of more than one, where each
// is): a Camera Commander there is in tile mode (ha.ts). Otherwise HA's grid places the
// cards, by their rows.
// In edit mode each panel has a toolbar (cmTools): its chip opens its options
// (panel-options.ts), + adds a panel after it in its edge (on main: a layer, its four edges
// a panel each), the arrows move it along; too narrow for them, the chip alone (its options
// have them too). With layers, edit mode grows outwards (tablet.ts: placePanels) and the
// view scrolls both ways. Over it, dimension lines as on a technical drawing (cmDims): each
// edge's depth, the gap and the margin, and each panel's size, all as they are out of edit
// mode; each label opens the options that set it. The bar above the panels shows or hides
// them (remembered in this browser). The view's header and footer are outlined too, each
// with its chip (cmEnds): the header's opens its options (the space above it, and HA's own
// editor), the footer's HA's own editor.
// Casa Mia's Settings page (through the integration, followed while the view shows) can
// outline each panel and the view's header and footer (identify_panels, with its CSS) and
// label the view's size, the room below its top and anything still scrolling the page
// (show_size); `debug: true` in the view's config does both.
// The parts (view/), each layer extending the one below (mixins over HA's Sections view):
// base.ts (state, lifecycle, sizing) -> edit.ts (edit mode's actions and dialogs) ->
// draw.ts (edit mode's drawing) -> view.ts (laying the panels out; defines the element).
// styles.ts and common.ts are shared; patches.ts patches HA's editors.
import "./view.ts";
import "./patches.ts";
