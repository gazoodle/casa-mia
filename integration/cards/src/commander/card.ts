// The Camera Commander card (see index.ts for how it works): its top layer, drawing it and
// taking its taps. The layers: base.ts (the picture stream) → live.ts (the live main
// camera) → talk.ts (talking to a doorbell) → card.ts; styles.ts holds its CSS.
import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { repeat } from "lit/directives/repeat.js";
import { fire, type Hass, heightFor, inPicker, navigate, TABLET } from "../ha.ts";
import { heightForMain, pyRound, type Rect } from "../layout.ts";
import { camerasOf, placed } from "../placed.ts";
import { back, family, keepPosition, labelsOf, useFont } from "../labels.ts";
import { dot } from "./motion.ts";
import { Config, Card, BLANK, Size, commanders, pictureDown } from "./common.ts";
import { PILLS } from "../pills.ts";
import { CommanderTalk, talkStyles } from "./talk.ts";
import { styles } from "./styles.ts";

export class CommanderCard extends CommanderTalk {
  updated() {
    // The app restarted (an update): its stream died with it, and a browser often says
    // nothing (the <img> keeps a blank or frozen picture), so start a fresh one.
    const run = this.now().card?.run ?? "";
    if (run && this.run && run !== this.run) {
      console.info("casa-mia: the app restarted; a fresh picture stream");
      this.again();
    }
    if (run) this.run = run;
    this.watchFrame();
    this.measure(); // its rows may have been set or cleared (a new config, or layout)
    if (this.streaming && this.editing()) this.done("editing");
    const box = this.renderRoot.querySelector(".box");
    if (box) {
      this.resize.observe(box);
      this.onScreen.observe(box);
    }
    this.followPicture();
    this.followCall();
    this.followLive();
    // Debug: the picture's own size as decoded (a stream may never fire load)
    const img = this.renderRoot.querySelector<HTMLImageElement>(".picture");
    const natural = img?.naturalWidth ? `${img.naturalWidth} x ${img.naturalHeight}` : "";
    if (this.debugOn() && natural && natural !== this._natural) this._natural = natural;
  }

  static getConfigElement() {
    return document.createElement("casa-mia-commander-editor");
  }
  static getStubConfig(hass: Hass) {
    return { entity: commanders(hass)[0]?.value ?? "" };
  }
  setConfig(config: Config) {
    this._config = config;
  }
  getCardSize() {
    return 6;
  }
  getGridOptions() {
    return { columns: TABLET.shown ? "full" : 6, rows: "auto" }; // Tablet Layout (and its edit preview): full, its panel's subject; else HA's half
  }

  render() {
    const st = this._config?.entity ? this.hass?.states[this._config.entity] : undefined;
    // As saved on the Camera Commander page.
    const card = st?.attributes.card as Card | undefined;
    if (!card)
      return html`<ha-card
        ><div class="note">
          ${!this._config?.entity
            ? "Choose a commander"
            : st
              ? "Not drawn yet: give this commander cameras on the Camera Commander page"
              : `No commander at ${this._config.entity}`}
        </div></ha-card
      >`;
    if (!card.picture) return html`<ha-card><div class="note">Its picture's address is not known yet (the app has no LAN address).</div></ha-card>`;
    const main = this.main(card, st!.state);
    const editing = this.editing();
    const down = editing ? null : pictureDown(this.downSince, this.lastError, Date.now());
    // Laid out for the picture asked for, as the compositor draws it (compositor.sized).
    const own = card.layout;
    // In HA's card picker: drawn at its own size and shrunk, so its gaps and labels keep
    // their proportions (asked for at the picker's size, they'd crowd the cameras out).
    const sized: Size | null = inPicker(this) ? [own.width, own.height, 1] : this._size;
    const [W, H, scale] = sized ?? [own.width, own.height, 1];
    const asked = sized && !editing ? this.pictureUrl(card, sized) : "";
    const still = editing && sized ? this.stillUrl(card, sized) : "";
    const s = sized ? { ...own, width: W, height: H, gap: pyRound(own.gap * scale), margin: pyRound((own.margin ?? 0) * scale), scale } : own;
    // Where everything is, in either mode (placed.ts), as the compositor has it.
    const laid = placed(s, main);
    const [w, h] = laid.size;
    const mainRect = laid.main;
    const tiles = laid.tiles.filter((t) => t.rect[2] > 0);
    // The live main camera (live.ts): its videos, and whether the picture leaves the main
    // area to one. With none to show, the picture draws the main camera itself.
    const live = this.liveMain(card) && mainRect[2] > 0 ? this.liveNow(card, main, mainRect, laid.mainHow === "contain") : null;
    const src = asked && live?.video ? `${asked}&main=video` : asked;
    const at = ([x, y, rw, rh]: Rect) =>
      `left:${(x / w) * 100}%;top:${(y / h) * 100}%;width:${(rw / w) * 100}%;height:${(rh / h) * 100}%`;
    const lit = s.highlight ?? {};
    // Its labels (labels.ts), for what the card draws itself: the live main camera's
    // caption, in the font the compositor draws the other names in. The fonts are the
    // integration's own files (const.py: SCRIPTS_URL).
    const labels = labelsOf(own.labels);
    useFont(labels.font, (file) => `/casa_mia/fonts/${file}`);
    const labelled = `--cm-label-font:${family(labels.font)};--cm-label-size:${labels.main_size}px;--cm-label-colour:${labels.colour};--cm-label-back:${back(labels)}`;
    const moving = this.motion.seen(this.hass!, st!.attributes.motion ?? {}, this._config!, () => this.requestUpdate());
    const mark = tiles.find((t) => t.camera === main)?.rect;
    // The cameras there is no room for ("+n more"): motion on one is marked on that tile.
    const hidden = laid.more ? camerasOf(s).slice(laid.tiles.length) : [];
    // Keep to my limits, and they don't fit: the main camera alone, and said (RULE TWO's
    // sibling: nothing fails silently, a blank reason least of all).
    const unfit =
      laid.gave.includes("main_alone") && own.responsive?.cant_fit === "keep"
        ? `Its limits don't fit this space (${Math.round(W / scale)} × ${Math.round(H / scale)} px), so only the main camera is shown`
        : "";
    // The rule (ha.ts: heightFor). In a tile or a cell, CSS: its height when it gives one,
    // else its own shape.
    const f = this._fit;
    // Its own shape (column, preview): the one that shows the main camera at its own.
    // (Responsive is laid out for whatever space it has, so it brings no shape but its own size's.)
    const shape =
      this._width && own.mode !== "responsive" ? this._width / heightForMain(own, main, this._width, this.shapeOf(card, main)) : own.width / own.height;
    const tall = f && this._width ? heightFor(f, this._width, shape) : null;
    // In HA's card picker: just its own shape, so the picker centres it as it does the others.
    const size = inPicker(this)
      ? `aspect-ratio:${own.width}/${own.height}`
      : !f || f.mode === "tile" || f.mode === "cell"
        ? `height:100%;aspect-ratio:${own.width}/${own.height}`
        : tall
          ? `height:${tall}px`
          : "";
    return html`<ha-card style=${size}>
      <div class="box" style=${labelled}>
        <div class="seen" style="filter:${this.look()}">
        ${editing
          ? still ? html`<img class="still" src=${still} alt="" />` : nothing
          : src && this._shown
          ? keyed(
              this._shown,
              html`<img
                class="picture"
                data-cm-own
                src=${(this.streaming = src) && this.frames ? BLANK : src /* frames: base.ts sets each one */}
                alt=""
                @load=${(ev: Event) => {
                  const img = ev.target as HTMLImageElement;
                  this._natural = `${img.naturalWidth} x ${img.naturalHeight}`;
                }}
                @error=${() => this.refused()}
              />`,
            )
          : nothing}
        ${live
          ? html`${repeat(
                live.videos,
                (channel) => channel,
                // One per channel played: the one shown, and a better one tried unseen under it.
                (channel) =>
                  html`<video
                    class="live"
                    data-entity=${channel}
                    style="${at(mainRect)};object-fit:${laid.mainHow};${laid.mainHow === "cover" ? `object-position:${keepPosition(own.main_keep)};` : ""}opacity:${channel === live.shown ? 1 : 0}"
                    autoplay
                    playsinline
                    .muted=${true /* the visitor is heard through Talk's own session (talk.ts) */}
                  ></video>`,
              )}
              ${this.caption(card.cameras[main]?.title ?? main, at(mainRect), live)}`
          : nothing}
        </div>
        ${editing && !inPicker(this) ? html`<div class="hatch"><span>Still picture while editing</span></div>` : nothing}
        ${own.debug?.on
          ? html`<div class="debug" style="color:${own.debug.colour ?? "#ffd60a"}">
              ${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px<br />
              card box ${this._box[0]} x ${this._box[1]} CSS px, screen ${window.devicePixelRatio}x<br />
              asked ${this._size ? `${W} x ${H} @${scale}x` : "nothing yet"}; picture ${this._natural || "not loaded"}
              ${this.viaHa() ? "through Home Assistant" : "direct"}
            </div>`
          : nothing}
        ${tiles.map((t) =>
          t.camera !== main
            ? html`<div class="zone" style=${at(t.rect)} title=${card.cameras[t.camera]?.title ?? t.camera} @click=${() => this.choose(card, t.camera)}></div>`
            : nothing,
        )}
        ${laid.more ? html`<div class="zone" style="${at(laid.more.rect)};cursor:default" title="${laid.more.count} more cameras"></div>` : nothing}
        <div class="zone" style=${at(mainRect)} @click=${() => this.open(card, main)}></div>
        ${mark && mark[2] > 0 && this._framed === (editing ? "still" : `s${this._shown}`)
          ? html`<img
              class="highlight ${Number(lit.pulse) > 0 ? (lit.style ?? "breathe") : ""}"
              src=${BLANK}
              alt=""
              style="${at(mark)};border:${lit.width}px solid ${lit.colour};box-shadow:0 0 ${lit.blur}px ${lit.colour};--cm-colour:${lit.colour};--cm-blur:${lit.blur}px;--cm-pulse:${lit.pulse}s;--cm-style:${lit.style}"
            />`
          : nothing}
        ${tiles.map((t) =>
          // on the main camera's own tile too (as well as on the main picture)
          dot(moving.get(t.camera), at(t.rect), this._config!, () => (t.camera === main ? this.open(card, t.camera) : this.choose(card, t.camera))),
        )}
        ${laid.more ? dot(hidden.map((e) => moving.get(e)).find(Boolean), at(laid.more.rect), this._config!, () => undefined) : nothing}
        ${mainRect[2] > 0 ? dot(moving.get(main), at(mainRect), this._config!, () => this.open(card, main)) : nothing}
        ${(live || this._talk) && mainRect[2] > 0 ? this.talkParts(card, at(mainRect)) : nothing}
        ${down
          ? html`<div class="down"><span class="cm-pill cm-filled cm-bad">${down}</span></div>`
          : unfit
            ? html`<div class="down"><span class="cm-pill cm-filled cm-warn">${unfit}</span></div>`
            : nothing}
      </div>
    </ha-card>`;
  }

  /** A tap on a panel camera makes it the main one, on every device showing the commander
   * (the select is shared); a call goes on, as talking is a session of its own (talk.ts). */
  private choose(card: Card, camera: string) {
    this.hass?.callService("select", "select_option", { option: card.cameras[camera]?.title }, { entity_id: this._config!.entity });
  }

  /** A tap on the main camera: its more-info (HA's camera dialog, the default), its live
   * page on the camera dashboard (more-info when there is no dashboard), or nothing. */
  private open(card: Card, camera: string) {
    const how = this._config?.tap_main ?? "more-info";
    const page = card.cameras[camera]?.live;
    if (how === "live" && page) navigate(page);
    else if (how !== "none") fire(this, "hass-more-info", { entityId: camera });
  }

  static styles = [...styles, PILLS, talkStyles];
}
