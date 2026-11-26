// The Camera Commander card (see index.ts for how it works): its top layer, drawing it and
// taking its taps. The layers: base.ts (the picture stream) → live.ts (the live main
// camera) → talk.ts (talking to a doorbell) → card.ts; styles.ts holds its CSS.
import { html, nothing } from "lit";
import { keyed } from "lit/directives/keyed.js";
import { repeat } from "lit/directives/repeat.js";
import { fire, type Hass, inPicker, navigate, TABLET } from "../ha.ts";
import { heightForMain, pyRound, type Rect } from "../layout.ts";
import { camerasOf, placed } from "../placed.ts";
import { back, family, keepPosition, labelsOf, NAME, nameSize, useFont } from "../labels.ts";
import { dot, dotSize, MOTION } from "./motion.ts";
import { debugBox, dialogOpen, type Figures, recordOf, reference, toggleDialog, tunedAt, tuneDialog, tuneStyles, whereOf } from "./tune.ts";
import { PILL_HEIGHT } from "../../../../app/web/src/cameras/controls.ts";
import { controlsBar, fullStyles, PTZ_NOTE_MS, ZOOM_PENDING_MS, type Line, type Lines, type Own } from "./full.ts";
import { barRoom, canFill, canPlayFull, fill, filling, playFull, SCREEN_EVENTS } from "./screen.ts";
import { Config, Card, BLANK, type Preset, Size, columnHeight, commanders, pictureDown, VERSION } from "./common.ts";
import { PILLS } from "../pills.ts";
import { CommanderTalk, talkStyles } from "./talk.ts";
import { styles } from "./styles.ts";

export class CommanderCard extends CommanderTalk {
  static properties = { ...CommanderTalk.properties, _sound: { state: true }, _screen: { state: true }, _opened: { state: true }, _zoomTo: { state: true }, _ptzFailed: { state: true }, _tuneNote: { state: true } };
  /** The camera heard (its Sound button), "" for none: a camera's own, so another main
   * camera (a tap, Track motion) is never heard without a tap of its own. */
  _sound = "";
  /** The card has the whole screen (its Full screen button, screen.ts). */
  _screen = false;
  /** The line of the controls bar that is opened out (its PTZ or Zoom button, full.ts),
   * and whose: a camera's own, so it is put away when another becomes the main camera. */
  _opened: { camera: string; line: Line | "" } = { camera: "", line: "" };
  /** The zoom level asked for and whose, shown as on its way for ZOOM_PENDING_MS. */
  _zoomTo: { camera: string; value: number } | null = null;
  private zoomToGone = 0;
  /** Why the last preset or zoom didn't go, said with the controls for PTZ_NOTE_MS. */
  _ptzFailed = "";
  private ptzNoteGone = 0;
  /** What came of the last tuning record (tune.ts): its reference, or why it failed. */
  _tuneNote = "";

  constructor() {
    super();
    // The browser says when the card takes or leaves the screen, by the button or by its
    // own ways out. Listened for on the card itself, so there is nothing to remove.
    for (const name of SCREEN_EVENTS) this.addEventListener(name, () => (this._screen = filling()));
  }

  updated() {
    // The app restarted (an update): its stream died with it, and a browser often says
    // nothing (the <img> keeps a blank or frozen picture), so start a fresh one.
    const run = this.now().card?.run ?? "";
    if (run && this.run && run !== this.run) {
      console.info("casa-mia: the app restarted; a fresh picture stream");
      this.restarted();
    }
    if (run) this.run = run;
    // Full screen is the live camera: where it can't play any more (the compositor's
    // switch off, the page hidden or edited), back to the commander, not a black screen.
    const card = this.now().card;
    if (this._full && card && !this.liveMain(card)) this._full = "";
    // Debug switched off while the sizes dialog is open: closed, and Track motion back on.
    const select = this._config?.entity ?? "";
    if (card && !card.layout.debug?.on && dialogOpen(select)) toggleDialog(this.hass!, select, false);
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
    // While its debug is on, sizes can be set by hand on this device (tune.ts), each where
    // the card is (in the page, with the whole screen, the main camera full screen). The
    // names the app draws come in the picture asked for, which is its own (compositor.sized).
    const select = this._config!.entity!;
    const tuning = Boolean(own.debug?.on);
    const drawnSet = tuning ? tunedAt(select, whereOf(this._screen, false)) : {};
    const tunedQuery = `${drawnSet.tile ? `&tile=${drawnSet.tile}` : ""}${drawnSet.main ? `&name=${drawnSet.main}` : ""}`;
    // In HA's card picker: drawn at its own size and shrunk, so its gaps and labels keep
    // their proportions (asked for at the picker's size, they'd crowd the cameras out).
    const sized: Size | null = inPicker(this) ? [own.width, own.height, 1] : this._size;
    const [W, H, scale] = sized ?? [own.width, own.height, 1];
    const asked = sized && !editing ? this.pictureUrl(card, sized, tunedQuery) : "";
    const still = editing && sized ? this.stillUrl(card, sized) : "";
    const s = sized ? { ...own, width: W, height: H, gap: pyRound(own.gap * scale), margin: pyRound((own.margin ?? 0) * scale), scale } : own;
    // Where everything is, in either mode (placed.ts), as the compositor has it.
    const laid = placed(s, main);
    const [w, h] = laid.size;
    const mainRect = laid.main;
    const tiles = laid.tiles.filter((t) => t.rect[2] > 0);
    // Full screen (tap_main: full): the camera tapped, live over the whole screen, shown
    // whole; its channel chosen for the screen's device pixels, as the main area's is.
    const full = Boolean(this._full && card.cameras[this._full]);
    const screen: Rect = [0, 0, Math.round(innerWidth * devicePixelRatio), Math.round(innerHeight * devicePixelRatio)];
    // The live main camera (live.ts): its videos, and whether the picture leaves the main
    // area to one. With none to show, the picture draws the main camera itself.
    const live =
      this.liveMain(card) && (full || mainRect[2] > 0) ? this.liveNow(card, main, full ? screen : mainRect, full || laid.mainHow === "contain") : null;
    // The Sound button, where offered and there is live video to hear.
    const heard = this._sound === main && !this._talk;
    const sound: Own[] =
      this._config?.sound_button && live
        ? [
            {
              on: this._sound === main,
              icon: this._sound === main ? "mdi:volume-high" : "mdi:volume-off",
              label: this._sound === main ? "Sound on" : "Sound off",
              title: this._sound === main ? "Mute the camera" : "Hear the camera",
              toggle: () => (this._sound = this._sound === main ? "" : main),
            },
          ]
        : [];
    // The Full screen button, where offered. Where the browser gives a page the screen,
    // the whole commander. Where it gives it only to a video (Safari on an iPhone), the
    // main camera's live video in the phone's own player, as drawn the last time: the
    // once-a-second redraw while live (live.ts) finds a video that has just begun.
    const playing = live?.shown && !canFill() ? this.renderRoot.querySelector<HTMLVideoElement>(`video.live[data-entity="${live.shown}"]`) : null;
    const fills: Own[] = !this._config?.screen_button
      ? []
      : canFill()
        ? [
            {
              on: this._screen,
              icon: this._screen ? "mdi:fullscreen-exit" : "mdi:fullscreen",
              label: this._screen ? "Exit full screen" : "Full screen",
              title: this._screen ? "Back to the page" : "The commander over the whole screen",
              toggle: () => fill(this, !this._screen),
            },
          ]
        : playing && canPlayFull(playing)
          ? [{ on: false, icon: "mdi:fullscreen", label: "Full screen", title: "The main camera over the whole screen", toggle: () => playFull(playing) }]
          : [];
    // One <video> per channel played: the one shown, and a better one tried unseen under it.
    const videos = (place: string) =>
      live
        ? repeat(
            live.videos,
            (channel) => channel,
            (channel) =>
              html`<video
                class="live"
                data-entity=${channel}
                style="${place};opacity:${channel === live.shown ? 1 : 0}"
                autoplay
                playsinline
                .muted=${channel !== live.shown || !heard /* while talking, the visitor is heard through Talk's own session (talk.ts) */}
              ></video>`,
          )
        : nothing;
    const whole = "left:0;top:0;width:100%;height:100%";
    const src = asked && live?.video ? `${asked}&main=video` : asked;
    const at = ([x, y, rw, rh]: Rect) =>
      `left:${(x / w) * 100}%;top:${(y / h) * 100}%;width:${(rw / w) * 100}%;height:${(rh / h) * 100}%`;
    const lit = s.highlight ?? {};
    // Its labels (labels.ts), for what the card draws itself: the live main camera's
    // caption, in the font the compositor draws the other names in. The fonts are the
    // integration's own files (const.py: SCRIPTS_URL).
    const labels = labelsOf(own.labels);
    useFont(labels.font, (file) => `/casa_mia/fonts/${file}`);
    // The main camera's place and the whole screen, in CSS px: its name and its controls
    // are sized from the one they are shown in, so both are in proportion on any screen.
    const mainPlace: [number, number] = [(mainRect[2] / w) * this._box[0], (mainRect[3] / h) * this._box[1]];
    const screenPlace: [number, number] = [innerWidth, innerHeight];
    // With a mouse, the main camera's name is one size whatever its place (labels.ts).
    const desk = matchMedia("(pointer: fine)").matches;
    const ruleName = (place: [number, number]) => nameSize("main", labels.main_scale, Math.min(...place), 1, desk);
    const where = whereOf(this._screen, full);
    const set = tuning ? tunedAt(select, where) : {};
    const nameIn = (place: [number, number]) => set.main ?? ruleName(place);
    // The controls are the main name's pill (controls.ts), the name in use, unless set by
    // hand: a height. The debug box and a record say the same link (tune.ts: inUse).
    const controlsName = (place: [number, number]) => (set.controls ? set.controls / PILL_HEIGHT : nameIn(place));
    const labelled = (place: [number, number]) =>
      `--cm-label-font:${family(labels.font)};--cm-label-size:${nameIn(place)}px;--cm-label-colour:${labels.colour};--cm-label-back:${back(labels)}`;
    // The commander's smallest tile, in CSS px: the tiles' names (drawn in the picture) and
    // the motion dots are a share of its shorter side, so every tile's are one size.
    const css = ([, , rw, rh]: Rect): [number, number] => [(rw / w) * this._box[0], (rh / h) * this._box[1]];
    const smallest = [...tiles.map((t) => t.rect), ...(laid.more ? [laid.more.rect] : [])].map(css).sort((a, b) => Math.min(...a) - Math.min(...b))[0] ?? [0, 0];
    const tileSide = Math.min(...smallest);
    const dotRule = dotSize(this._config!, tileSide);
    const dotPx = set.dot ?? dotRule;
    // The debug box's figures (tune.ts): each size as the rules worked it out, and how.
    const place = full ? screenPlace : mainPlace;
    const shorter = Math.round(Math.min(...place));
    const dotShare = this._config?.motion_share ?? (this._config?.motion_size === undefined ? MOTION.motion_share : "from px");
    const figures: Figures = {
      where,
      box: full ? screenPlace : this._box,
      place,
      tile: smallest,
      rules: { main: ruleName(place), controls: Math.round(ruleName(place) * PILL_HEIGHT), tile: nameSize("tile", labels.tile_share, tileSide), dot: dotRule },
      sums: {
        main: `${desk ? `mouse, ${NAME.main_desk}` : `touch, ${NAME.main_root} x √${shorter} = ${(NAME.main_root * Math.sqrt(shorter)).toFixed(1)} held ${NAME.main_floor} to ${NAME.main_cap}`}, at ${labels.main_scale}%`,
        tile: `${labels.tile_share}% of ${Math.round(tileSide)} = ${((labels.tile_share * tileSide) / 100).toFixed(1)}, held ${NAME.tile_floor} to ${NAME.tile_cap}`,
        dot: `${dotShare}% of ${Math.round(tileSide)}`,
      },
    };
    const debug = tuning
      ? debugBox({
          hass: this.hass!,
          select,
          colour: own.debug?.colour ?? "#ffd60a",
          head: html`${this._fit?.mode ?? "?"} (in ${this._fit?.container || "?"}), room ${this._fit?.room ?? "?"} px; screen ${window.devicePixelRatio}x<br />
            asked ${this._size ? `${W} x ${H} @${scale}x` : "nothing yet"}; picture ${this._natural || "not loaded"} ${this.viaHa() ? "through Home Assistant" : "direct"}
            ${laid.gave.length ? html`<br />its limits gave way here: ${laid.gave.join(", ")}` : nothing}`,
          figures,
          note: this._tuneNote,
          record: () => this.record(card, figures, card.cameras[main]?.title ?? main, desk),
          changed: () => this.requestUpdate(),
        })
      : nothing;
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
    const tall = f && this._width ? columnHeight(f, this._width, shape, own.mode === "responsive") : null;
    // In HA's card picker: just its own shape, so the picker centres it as it does the others.
    // With the whole screen (screen.ts), all of it: the browser sizes the card to the screen.
    // But for the room an iPad's status bar needs (screen.ts: barRoom), left black.
    const size = this._screen
      ? `height:calc(100% - ${barRoom()});margin-top:${barRoom()}`
      : inPicker(this)
      ? `aspect-ratio:${own.width}/${own.height}`
      : !f || f.mode === "tile" || f.mode === "cell"
        ? `height:100%;aspect-ratio:${own.width}/${own.height}`
        : tall
          ? `height:${tall}px`
          : "";
    return html`<ha-card style=${size}>
      <div class="box" style=${labelled(mainPlace)}>
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
        ${live && !full
          ? html`${videos(
                `${at(mainRect)};object-fit:${laid.mainHow};${laid.mainHow === "cover" ? `object-position:${keepPosition(own.main_keep)}` : ""}`,
              )}
              ${this.caption(card.cameras[main]?.title ?? main, at(mainRect), live)}`
          : nothing}
        </div>
        ${editing && !inPicker(this) ? html`<div class="hatch"><span>Still picture while editing</span></div>` : nothing}
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
          dot(moving.get(t.camera), at(t.rect), this._config!, () => (t.camera === main ? this.open(card, t.camera) : this.choose(card, t.camera)), dotPx),
        )}
        ${laid.more ? dot(hidden.map((e) => moving.get(e)).find(Boolean), at(laid.more.rect), this._config!, () => undefined, dotPx) : nothing}
        ${mainRect[2] > 0 ? dot(moving.get(main), at(mainRect), this._config!, () => this.open(card, main), dotPx) : nothing}
        ${
          // The Full screen button stands here without the camera's controls too: it is the
          // card's, and the only way to it.
          (this._config?.main_controls || fills.length) && card.cameras[main] && mainRect[2] > 0 && !full && !editing
            ? this._config?.main_controls
              ? controlsBar(this, this.hass!, card.cameras[main], at(mainRect), mainPlace, controlsName(mainPlace), [...sound, ...fills], this.lines(main))
              : controlsBar(this, this.hass!, { ...card.cameras[main], controls: [], presets: [], zoom: undefined }, at(mainRect), mainPlace, controlsName(mainPlace), fills, this.lines(main))
            : nothing
        }
        ${(live || this._talk) && mainRect[2] > 0 && !full ? this.talkParts(card, at(mainRect), nameIn(mainPlace)) : nothing}
        ${down
          ? html`<div class="down"><span class="cm-pill cm-filled cm-bad">${down}</span></div>`
          : unfit
            ? html`<div class="down"><span class="cm-pill cm-filled cm-warn">${unfit}</span></div>`
            : nothing}
        ${full ? nothing : debug}
      </div>
      ${full
        ? html`<div class="full" style=${labelled(screenPlace)}>
            <div class="seen" style="filter:${this.look()}">${videos(`${whole};object-fit:contain`)}</div>
            ${live ? this.caption(card.cameras[main].title, whole, live) : nothing}
            <div class="zone" style=${whole} title="Back" @click=${() => (this._full = "")}></div>
            ${
              // the screen's shape as drawn: the once-a-second redraw while live (live.ts)
              // follows the tablet being turned round
              controlsBar(this, this.hass!, card.cameras[main], whole, screenPlace, controlsName(screenPlace), [...sound, ...fills], this.lines(main))
            }
            ${this.talkParts(card, whole, nameIn(screenPlace))}
            ${debug}
          </div>`
        : nothing}
      ${tuning ? tuneDialog({ hass: this.hass!, select, where, rules: figures.rules, changed: () => this.requestUpdate() }) : nothing}
    </ha-card>`;
  }

  /** Record this device's sizes (the debug box's RECORD): to the app's log, by way of the
   * integration, which takes it only while the commander's debug is on. Its reference, or
   * why it failed, stays in the debug box. */
  private async record(card: Card, figures: Figures, main: string, desk: boolean) {
    const ref = reference();
    const select = this._config!.entity!;
    const picture = new URL(card.picture).pathname.match(/\/g\/(.+)\.mjpg$/)?.[1] ?? "";
    try {
      await this.hass!.callWS({ type: "casa_mia_commander/tuning", picture, entry: recordOf({ ref, select, figures, main, version: VERSION, desk }) });
      this._tuneNote = `Recorded ${ref}`;
      console.info(`casa-mia: tuning recorded as ${ref}`);
    } catch (err) {
      this._tuneNote = `${ref} not recorded: ${(err as { message?: string })?.message ?? String(err)}`;
      console.warn(`casa-mia: ${this._tuneNote}`);
    }
  }

  /** A tap on a panel camera makes it the main one, on every device showing the commander
   * (the select is shared); a call goes on, as talking is a session of its own (talk.ts). */
  private choose(card: Card, camera: string) {
    this.hass?.callService("select", "select_option", { option: card.cameras[camera]?.title }, { entity_id: this._config!.entity });
  }

  /** The main camera's presets and zoom, for the controls bar (full.ts): the line opened
   * out, and the taps, which call the camera's PTZ action or set its zoom's number. One
   * that fails is said with the controls: Home Assistant's own message is outside the
   * card, so unseen while the card has the whole screen. */
  private lines(main: string): Lines {
    const sent = async (what: string, call: Promise<unknown>) => {
      clearTimeout(this.ptzNoteGone);
      this._ptzFailed = "";
      try {
        await call;
        console.info(`casa-mia: ${main}: ${what}`);
        return true;
      } catch (err) {
        const why = (err as { message?: string })?.message ?? String(err);
        console.warn(`casa-mia: ${main}: ${what} failed: ${why}`);
        this._ptzFailed = `${what}: ${why}`;
        this.ptzNoteGone = window.setTimeout(() => (this._ptzFailed = ""), PTZ_NOTE_MS);
        return false;
      }
    };
    const open = this._opened.camera === main ? this._opened.line : "";
    return {
      open,
      failed: this._ptzFailed,
      zoomTo: this._zoomTo?.camera === main ? this._zoomTo.value : null,
      show: (line) => (this._opened = { camera: main, line: open === line ? "" : line }),
      go: (preset: Preset) => {
        const [domain, service] = preset.action.split(".");
        void sent(preset.name, this.hass!.callService(domain, service, preset.data));
      },
      zoom: async (entity, value) => {
        // On its way until the camera says it is there, or the lease lapses.
        clearTimeout(this.zoomToGone);
        this._zoomTo = { camera: main, value };
        this.zoomToGone = window.setTimeout(() => (this._zoomTo = null), ZOOM_PENDING_MS);
        if (!(await sent("Zoom", this.hass!.callService("number", "set_value", { value }, { entity_id: entity })))) {
          clearTimeout(this.zoomToGone);
          this._zoomTo = null;
        }
      },
    };
  }

  /** A tap on the main camera: its more-info (HA's camera dialog, the default), its live
   * page on the camera dashboard (more-info when there is no dashboard), it full screen
   * (more-info where it can't play live here), or nothing. */
  private open(card: Card, camera: string) {
    const how = this._config?.tap_main ?? "more-info";
    const page = card.cameras[camera]?.live;
    if (how === "live" && page) navigate(page);
    else if (how === "full" && this.liveMain(card)) this._full = camera;
    else if (how !== "none") {
      // Home Assistant's dialog is outside the card, so under it while it has the screen.
      if (this._screen) fill(this, false);
      fire(this, "hass-more-info", { entityId: camera });
    }
  }

  static styles = [...styles, PILLS, talkStyles, fullStyles, tuneStyles];
}
