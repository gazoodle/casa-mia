/** The swap in a page: every text node, and the title, aria-label and placeholder
 * attributes, show the rules' stand-ins, through every open shadow root and same-origin
 * iframe (Casa Mia's own pages, and the Kiosk Satellite page inside them), as the page
 * draws and redraws. Each original is kept, so a change of rules, or none, puts the real
 * text back.
 *
 * Never a form field's value, script or style, nor editable text: an editor (the YAML
 * editor's CodeMirror) reads its DOM back and would save a stand-in. A form field that
 * would show a stand-in is covered instead while it isn't focused (overlay.ts), and the
 * rule being written is outlined wherever it matches. A document whose root says
 * data-swap="off" (the Swap page, which edits the real strings) is left as it is.
 *
 * Nothing is hooked until there are rules: an HA without the swap pays nothing. */

import { Rules, type SwapRule } from "./engine.ts";
import { draw, LAYER, type Field, type Mark } from "./overlay.ts";

const ATTRS = ["title", "aria-label", "placeholder"];
const OFF = "data-swap"; // on a document's root: "off" leaves that document alone
const SKIP = /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/;
// Fields whose value is text a person reads (not a tick, a range or a password).
const FIELD = /^(|text|search|email|tel|url|number)$/;
const ELEMENT = 1;
const TEXT = 3;

/** What a node or attribute really says, what it was set to show, and under which rules
 * (`gen`): one still showing what it was set to under these rules needs nothing. */
type Seen = { real: string; shown: string; gen: number };

let rules: Rules | null = null; // null: nothing to swap
let drafting: SwapRule | null = null; // the rule being written: rule 0 of `rules`
let gen = 0; // moves whenever what should show may have changed
const marks = new Map<Text, Mark[]>(); // the draft's matches, as shown, while there is one
const fields = new Set<Field>(); // form fields seen, for their covers
const texts = new WeakMap<Text, Seen>();
const attrs = new WeakMap<Element, Map<string, Seen>>();
const observed = new WeakSet<Node>(); // documents and shadow roots, each with an observer
const windows = new WeakSet<Window>();
const frames = new WeakSet<HTMLIFrameElement>();
const docs: WeakRef<Document>[] = []; // walked again when the rules change

/** The text as it should show in `doc`, and where the draft's matches are in it. While
 * the draft's replacement is empty, its matches show as they are, outlined. */
function render(real: string, doc: Document): { shown: string; marks: Mark[] } {
  if (!rules || doc.documentElement?.getAttribute(OFF) === "off") return { shown: real, marks: [] };
  let shown = "";
  let pos = 0;
  const found: Mark[] = [];
  for (const [start, end, replacement, rule] of rules.spans(real)) {
    const draft = drafting !== null && rule === 0;
    shown += real.slice(pos, start);
    const at = shown.length;
    shown += draft && !drafting!.replace ? real.slice(start, end) : replacement;
    if (draft) found.push([at, shown.length]);
    pos = end;
  }
  return { shown: pos ? shown + real.slice(pos) : real, marks: found };
}

/** Whether the element's own text may be swapped (never the overlay's own). */
function allowed(el: Element): boolean {
  return !SKIP.test(el.tagName) && !(el as HTMLElement).isContentEditable && !el.hasAttribute(LAYER);
}

/** A value (a text node's or an attribute's) to set, or undefined to leave it: `now` is
 * what it says at the moment. A value that isn't what was last set is the page's own. */
function next(now: string, seen: Seen | undefined, doc: Document, found?: Mark[]): Seen | undefined {
  if (seen && seen.gen === gen && now === seen.shown) return undefined; // as set: our own write
  const real = seen && now === seen.shown ? seen.real : now;
  const { shown, marks } = render(real, doc);
  found?.push(...marks);
  return shown === real && !seen ? undefined : { real, shown, gen };
}

function text(t: Text): void {
  const parent = t.parentNode;
  if (!parent || (parent.nodeType === ELEMENT && !allowed(parent as Element))) return;
  const before = texts.get(t);
  if (before && before.gen === gen && t.data === before.shown) return; // as set: our own write
  const found: Mark[] = [];
  const seen = next(t.data, before, t.ownerDocument, found);
  if (found.length) marks.set(t, found);
  else marks.delete(t);
  if (!seen) return;
  texts.set(t, seen);
  if (t.data !== seen.shown) t.data = seen.shown; // its own mutation then matches `seen`
}

function attr(el: Element, name: string): void {
  const now = el.getAttribute(name);
  if (now === null) return;
  const mine = attrs.get(el);
  const seen = next(now, mine?.get(name), el.ownerDocument);
  if (!seen) return;
  if (mine) mine.set(name, seen);
  else attrs.set(el, new Map([[name, seen]]));
  if (now !== seen.shown) el.setAttribute(name, seen.shown);
}

function walk(node: Node): void {
  if (node.nodeType === TEXT) return text(node as Text);
  if (node.nodeType === ELEMENT) {
    const el = node as Element;
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && FIELD.test((el as HTMLInputElement).type))) {
      fields.add(el as Field);
    }
    if (!allowed(el)) return;
    for (const name of ATTRS) if (el.hasAttribute(name)) attr(el, name);
    if (el.shadowRoot) observe(el.shadowRoot);
    if (el.tagName === "IFRAME") frame(el as HTMLIFrameElement);
  }
  for (let child = node.firstChild; child; child = child.nextSibling) walk(child);
}

/** Whether a change is the overlay's own drawing. */
function drawn(node: Node): boolean {
  const el = node.nodeType === ELEMENT ? (node as Element) : node.parentElement;
  return !!el?.closest(`[${LAYER}]`);
}

function changed(records: MutationRecord[]): void {
  let moved = false;
  for (const r of records) {
    if (drawn(r.target)) continue;
    moved = true;
    if (r.type === "characterData") text(r.target as Text);
    else if (r.type === "childList") r.addedNodes.forEach(walk);
    else if (r.attributeName === OFF) {
      gen++; // the whole document shows afresh
      walk(r.target.ownerDocument ?? (r.target as Document));
    } else attr(r.target as Element, r.attributeName!);
  }
  if (moved) redraw();
}

let pending = false;
/** The overlay drawn again at the next frame (once, however many ask). */
function redraw(): void {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    for (const field of [...fields]) if (!field.isConnected) fields.delete(field);
    const live = docs.map((ref) => ref.deref()).filter((d): d is Document => !!d);
    draw(live, marks, fields, (value, doc) => render(value, doc));
  });
}

// Anything that moves the page without changing it (scrolling, typing, focus, the end
// of an animation) redraws the overlay. Scrolling doesn't leave a shadow root, so each
// root gets its own.
const MOVES = ["scroll", "resize", "focusin", "focusout", "input", "transitionend", "animationend"];
const listen = (target: EventTarget) => MOVES.forEach((e) => target.addEventListener(e, redraw, { capture: true, passive: true }));

/** A document or shadow root: watched from now on, and walked. */
function observe(root: Document | ShadowRoot): void {
  if (!observed.has(root)) {
    observed.add(root);
    new MutationObserver(changed).observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS, OFF],
    });
    if (root.nodeType !== 9) listen(root); // a document's come with its window's
  }
  walk(root);
}

/** A same-origin iframe's window, at each page it loads; another origin's is out of reach. */
function frame(f: HTMLIFrameElement): void {
  const enter = () => {
    try {
      if (f.contentWindow?.document) install(f.contentWindow as Window & typeof globalThis);
    } catch {
      // another origin: not ours to read
    }
  };
  if (!frames.has(f)) {
    frames.add(f);
    f.addEventListener("load", enter);
  }
  enter();
}

/** Into a window: its shadow roots watched as they're made, its document walked. */
function install(win: Window & typeof globalThis): void {
  if (!windows.has(win)) {
    windows.add(win);
    const proto = win.Element.prototype;
    const attach = proto.attachShadow;
    proto.attachShadow = function (this: Element, init: ShadowRootInit) {
      const root = attach.call(this, init);
      observe(root);
      return root;
    };
    docs.push(new WeakRef(win.document));
    listen(win);
  }
  observe(win.document);
}

/** The rules to show (the saved ones while the swap is on, and the one being written,
 * first), applied to the page now and as it changes. */
export function swap(saved: SwapRule[], draft: SwapRule | null, win: Window & typeof globalThis = window): void {
  const all = draft ? [draft, ...saved] : saved;
  if (!all.length && !rules) return; // never on: nothing hooked, nothing to undo
  const compiled = all.length ? new Rules(all) : null;
  for (const [i, why] of compiled?.errors ?? []) console.warn(`CASA-MIA SWAP: rule ${i + 1} left out: ${why}`);
  rules = compiled;
  drafting = draft;
  gen++;
  marks.clear();
  install(win);
  for (const ref of [...docs]) {
    const doc = ref.deref();
    if (doc) walk(doc);
    else docs.splice(docs.indexOf(ref), 1);
  }
  redraw();
}
