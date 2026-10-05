// Tablet view (view type custom:casa-mia-tablet-view): HA's own Sections view, so its header,
// footer, badges and section editing are HA's, locked to the screen. HA puts every view in a
// container at least the screen tall with the header padded off; this view takes exactly
// that (flex basis 0, never its content's height) and clips, so the page never scrolls.
// In edit mode it scrolls inside itself instead, for the editing controls.
// `debug: true` in the view's config shows its size and anything still scrolling the page.
import { css } from "lit";
import { define, room, sectionsView, watchRoom } from "./ha.ts";

const LOCK = css`
  :host {
    flex: 1 1 0 !important;
    min-height: 0;
    overflow: hidden;
    position: relative;
  }
  :host([editing]) {
    overflow: auto;
  }
  .wrapper {
    max-width: none;
    min-height: 0;
    height: 100%;
    box-sizing: border-box;
  }
  :host([editing]) .wrapper {
    height: auto;
    min-height: 100%;
  }
  .cm-debug {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 10;
    padding: 2px 6px;
    font: 12px monospace;
    color: #000;
    background: #ffd60a;
    pointer-events: none;
    white-space: pre-wrap;
    max-width: calc(100% - 16px);
  }
`;

/** Each element above `el` (through shadow roots) taller than the window: what still
 * scrolls the page. Debug only. */
function tooTall(el: Element, tall: number): string {
  const out: string[] = [];
  for (let n: Node | null = el; n; n = (n as Element).parentElement ?? ((n.getRootNode() as ShadowRoot).host || null)) {
    const h = (n as Element).getBoundingClientRect?.().height ?? 0;
    if (h > tall + 1) out.push(`${(n as Element).tagName.toLowerCase()} ${Math.round(h)}`);
  }
  return out.length ? `\ntoo tall: ${out.join("\n")}` : "";
}

sectionsView().then((Base: any) => {
  class TabletView extends Base {
    static styles = [Base.styles, LOCK];
    private cmDebug = false;
    private cmLabel?: HTMLElement;
    private cmStop?: () => void;
    private cmSeen = new ResizeObserver(() => this.cmShow());

    setConfig(config: any) {
      super.setConfig(config);
      this.cmDebug = !!config.debug;
    }

    /** HA's page (html, 100vh tall) and its view container (hui-view's parent, at least
     * 100vh): Safari's 100vh is the screen without its toolbars, so the page scrolled by
     * them. While this view shows, both are the visible screen instead (100dvh); the next
     * view gets HA's back. */
    private cmHolder?: HTMLElement | null;

    connectedCallback() {
      super.connectedCallback();
      this.cmHolder = (this as unknown as HTMLElement).parentElement?.parentElement;
      this.cmHolder?.style.setProperty("min-height", "100dvh");
      document.documentElement.style.setProperty("height", "100dvh");
      this.cmSeen.observe(this as unknown as Element);
      this.cmStop = watchRoom(() => this.cmShow());
    }

    disconnectedCallback() {
      super.disconnectedCallback();
      this.cmHolder?.style.removeProperty("min-height");
      document.documentElement.style.removeProperty("height");
      this.cmSeen.disconnect();
      this.cmStop?.();
    }

    updated(changed: Map<string, unknown>) {
      super.updated?.(changed);
      this.toggleAttribute("editing", !!this.lovelace?.editMode);
      this.cmShow();
    }

    /** The debug label: this view's size, the room below its top, and how far the page
     * still scrolls (should be 0 x 0). */
    private cmShow() {
      if (!this.cmDebug) return this.cmLabel?.remove();
      if (!this.cmLabel?.isConnected) {
        this.cmLabel = document.createElement("div");
        this.cmLabel.className = "cm-debug";
        this.shadowRoot?.prepend(this.cmLabel); // before Lit's part, so Lit leaves it alone
      }
      const r = this.getBoundingClientRect();
      const page = document.documentElement;
      this.cmLabel.textContent =
        `view ${Math.round(r.width)} x ${Math.round(r.height)}, room ${room(this as unknown as Element)}, held ${this.cmHolder?.style.minHeight || "no"}\n` +
        `page scrolls ${page.scrollWidth - page.clientWidth} x ${page.scrollHeight - page.clientHeight}` +
        tooTall(this as unknown as Element, page.clientHeight);
    }
  }
  define("casa-mia-tablet-view", TabletView as unknown as CustomElementConstructor);
});
