/** The swap's overlay, one per document: a 1 px red box round each match of the rule
 * being written (the Swap page's draft), and a cover over each form field that would
 * show a stand-in, while it isn't focused. A field's value itself is never changed: a save
 * would write the stand-in. The cover shows the swapped value in the field's own font and
 * colours, outlined red where the draft matches it.
 *
 * In the top layer (a popover, raised again at each change) so it's above Home Assistant's
 * dialogs, and never in the way of a tap. Drawn only where the text or field can be seen,
 * not where a scrolled box hides it. dom.ts says what to draw and when. */

export const LAYER = "data-swap-layer"; // the overlay's own element: never swapped itself
export type Mark = [start: number, end: number];
export type Field = HTMLInputElement | HTMLTextAreaElement;
type Render = (real: string, doc: Document) => { shown: string; marks: Mark[] };
type Box = { x: number; y: number; w: number; h: number; red: boolean; text?: string; css?: string };

const RED = "1px solid red";
const LAYER_CSS =
  "position:fixed;inset:0;margin:0;padding:0;border:0;width:auto;height:auto;max-width:none;" +
  "max-height:none;overflow:visible;background:transparent;pointer-events:none;z-index:2147483647";
const layers = new WeakMap<Document, HTMLElement>();
const last = new WeakMap<Document, string>(); // what was drawn, so an unchanged frame costs nothing

/** The element really at a point, through shadow roots. The overlay lets taps through, so
 * it is never the one found. */
function at(doc: Document, x: number, y: number): Element | null {
  let el = doc.elementFromPoint(x, y);
  while (el?.shadowRoot) {
    const inner = el.shadowRoot.elementFromPoint(x, y);
    if (!inner || inner === el) break;
    el = inner;
  }
  return el;
}

/** The parent, through a shadow root to its host. */
const up = (el: Element): Element | null => el.parentElement ?? ((el.parentNode as ShadowRoot | null)?.host ?? null);

/** Whether `rect` of `el` can be seen: what is at its middle is `el` or inside it (through
 * shadow roots). Not merely something holding it: that is what a scrolled box hiding it
 * leaves there. */
function visible(el: Element, rect: DOMRect, doc: Document): boolean {
  if (!rect.width || !rect.height) return false;
  for (let n = at(doc, rect.left + rect.width / 2, rect.top + rect.height / 2); n; n = up(n)) {
    if (n === el) return true;
  }
  return false;
}

/** The colour behind a field: its own, or the first ancestor's that isn't see-through. */
function background(el: Element, view: Window): string {
  for (let n: Element | null = el; n; n = up(n)) {
    const colour = view.getComputedStyle(n).backgroundColor;
    if (colour && colour !== "transparent" && !/,\s*0\)$/.test(colour)) return colour;
  }
  return "Canvas";
}

function cover(field: Field, doc: Document, render: Render): Box | null {
  if (!field.value || field.matches(":focus")) return null; // focused: the real value, to edit
  const { shown, marks } = render(field.value, doc);
  if (shown === field.value && !marks.length) return null;
  const rect = field.getBoundingClientRect();
  if (!visible(field, rect, doc)) return null;

  // Inside the field's border, in its own font and colours, on what's behind it.
  const view = doc.defaultView!;
  const s = view.getComputedStyle(field);
  const [top, right, bottom, left] = [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map(parseFloat);
  const area = field.tagName === "TEXTAREA";
  return {
    x: rect.left + left,
    y: rect.top + top,
    w: rect.width - left - right,
    h: rect.height - top - bottom,
    red: marks.length > 0,
    text: shown,
    css:
      `font:${s.font};color:${s.color};letter-spacing:${s.letterSpacing};text-align:${s.textAlign};` +
      `padding:${s.paddingTop} ${s.paddingRight} ${s.paddingBottom} ${s.paddingLeft};` +
      `background:${background(field, view)};display:flex;overflow:hidden;` +
      `align-items:${area ? "flex-start" : "center"};white-space:${area ? "pre-wrap" : "pre"}`,
  };
}

/** The boxes round the draft's matches in one document's text. */
function outlines(doc: Document, marks: Map<Text, Mark[]>): Box[] {
  const boxes: Box[] = [];
  const range = doc.createRange();
  for (const [text, found] of marks) {
    const el = text.parentElement ?? (text.parentNode as ShadowRoot | null)?.host;
    if (text.ownerDocument !== doc || !text.isConnected || !el) continue;
    for (const [start, end] of found) {
      if (end > text.data.length) continue; // changed since: redrawn when it's looked at again
      range.setStart(text, start);
      range.setEnd(text, end);
      for (const r of range.getClientRects()) {
        if (visible(el, r, doc)) boxes.push({ x: r.left, y: r.top, w: r.width, h: r.height, red: true });
      }
    }
  }
  return boxes;
}

function layerOf(doc: Document): HTMLElement {
  let layer = layers.get(doc);
  if (!layer) {
    layer = doc.createElement("div");
    layer.setAttribute(LAYER, "");
    layer.setAttribute("popover", "manual");
    layer.style.cssText = LAYER_CSS;
    layers.set(doc, layer);
  }
  if (!layer.isConnected) doc.documentElement.append(layer);
  return layer;
}

/** Each document's overlay as it should be now. */
export function draw(docs: Document[], marks: Map<Text, Mark[]>, fields: Set<Field>, render: Render): void {
  for (const doc of docs) {
    const boxes = outlines(doc, marks);
    for (const field of fields) {
      const box = field.ownerDocument === doc ? cover(field, doc, render) : null;
      if (box) boxes.push(box);
    }
    const drawn = JSON.stringify(boxes);
    if (drawn === (last.get(doc) ?? "[]")) continue;
    last.set(doc, drawn);

    const layer = layerOf(doc);
    layer.replaceChildren(
      ...boxes.map((b) => {
        const div = doc.createElement("div");
        div.style.cssText =
          `position:fixed;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;box-sizing:border-box;` +
          `${b.red ? `outline:${RED};` : ""}${b.css ?? ""}`;
        if (b.text !== undefined) div.textContent = b.text;
        return div;
      }),
    );
    // Raised again above whatever opened since (a dialog); a browser without popovers
    // has the z-index only.
    if (layer.showPopover) {
      if (layer.matches(":popover-open")) layer.hidePopover();
      if (boxes.length) layer.showPopover();
    }
  }
}
