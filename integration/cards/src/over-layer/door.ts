// The admin's door: an Over layer that covers the whole window and blocks taps leaves an
// admin one way through, to Home Assistant's own edit button (its pencil, or its ⋮ menu
// when the pencil is in it), where the layer steps aside. A hole is cut out of the layer
// there (clip-path, which cuts its taps too; on the backdrop and the card each, not the
// layer round them: a clip-path makes an element a backdrop root, and the backdrop's blur
// would see nothing behind it), and a lid over the hole blocks until it is
// opened: a mouse over it opens it; a tap opens it for a few seconds, so the next tap reaches
// the button. HA shows that button to admins only, and this cuts the hole for admins only:
// everyone else gets the wall. Leans on HA's toolbar (hui-root); without it, no door, and an
// admin still has ?edit=1.

// mdi pencil: HA's edit button, when it is a button of its own (hui-root: configure_ui).
const PENCIL =
  "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z";
const TAP_OPEN_MS = 4000; // a tap opens the lid this long

// The lid: a square over the button, looking like the backdrop, its edges on whole pixels
// as the hole's are (round edges drawn twice, the hole's and the lid's, each half
// see-through, left a seam); and a circle in it, the button's own, with a soft ring in the
// theme's colour breathing out from it now and then, so an admin can find it.
export const DOOR_STYLE = `
  .lid { position: fixed; z-index: 8; transition: opacity 0.3s; cursor: pointer; }
  .lid::after { content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; animation: cm-door 2.4s ease-out infinite; }
  .lid.open { opacity: 0; pointer-events: none; }
  .lid.open::after { animation: none; }
  @keyframes cm-door {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, #03a9f4) 45%, transparent); }
    70%, 100% { box-shadow: 0 0 0 8px transparent; }
  }
  @media (prefers-reduced-motion: reduce) { .lid::after { animation: none; } }
`;

/** HA's edit button for the dashboard this card is on: its pencil, else its ⋮ menu. */
export function editButton(from: Element): HTMLElement | null {
  for (let n: Node | null = from; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null)) {
    if ((n as Element).tagName !== "HUI-ROOT") continue;
    const root = (n as Element).shadowRoot;
    const buttons = [...(root?.querySelectorAll<HTMLElement & { path?: string }>('ha-icon-button[slot="actionItems"]') ?? [])];
    return buttons.find((b) => b.path === PENCIL) ?? root?.querySelector<HTMLElement>("#dashboardmenu") ?? null;
  }
  return null;
}

/** An evenodd clip-path for a box `w` x `h` with a rectangle cut out of it (in its own px). */
export function holed(w: number, h: number, x: number, y: number, hw: number, hh: number): string {
  return `path(evenodd, "M0 0 H${w} V${h} H0 Z M${x} ${y} h${hw} v${hh} h${-hw} Z")`;
}

/** A box on whole pixels, covering `r` (left, top, width, height). */
export function snapped(r: { left: number; top: number; right: number; bottom: number }): [number, number, number, number] {
  const [x, y] = [Math.floor(r.left), Math.floor(r.top)];
  return [x, y, Math.ceil(r.right) - x, Math.ceil(r.bottom) - y];
}

export class Door {
  private lid: HTMLElement;
  private shut = 0; // the timer that closes a tapped lid
  private follow: (ev: PointerEvent) => void;

  constructor(root: ShadowRoot) {
    this.lid = document.createElement("div");
    this.lid.className = "lid";
    this.lid.hidden = true;
    root.append(this.lid);
    this.lid.addEventListener("pointerenter", (ev) => ev.pointerType === "mouse" && this.open());
    this.lid.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      if (ev.pointerType === "mouse") return this.open();
      this.open();
      clearTimeout(this.shut);
      this.shut = window.setTimeout(() => this.close(), TAP_OPEN_MS);
    });
    // A mouse that leaves the hole closes it again.
    this.follow = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || !this.lid.classList.contains("open")) return;
      const r = this.lid.getBoundingClientRect();
      if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) this.close();
    };
    addEventListener("pointermove", this.follow, { passive: true });
  }

  private open() {
    this.lid.classList.add("open");
  }

  private close() {
    clearTimeout(this.shut);
    this.lid.classList.remove("open");
  }

  /** Cut the door into each of `parts` (the backdrop, the card) over `button`, the lid
   * looking like the backdrop; or no door. */
  place(parts: HTMLElement[], button: HTMLElement | null, backdrop: { background: string; backdropFilter: string }) {
    const b = button?.getBoundingClientRect();
    if (!b || !b.width || !b.height) {
      for (const p of parts) p.style.clipPath = "";
      this.lid.hidden = true;
      return;
    }
    const [x, y, w, h] = snapped(b);
    for (const p of parts) {
      const at = p.getBoundingClientRect();
      p.style.clipPath = holed(at.width, at.height, x - at.left, y - at.top, w, h);
    }
    Object.assign(this.lid.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, ...backdrop });
    this.lid.hidden = false;
  }

  remove() {
    clearTimeout(this.shut);
    removeEventListener("pointermove", this.follow);
    this.lid.remove();
  }
}
