// The Camera Commander card's controls bar, on its full screen (Tap on the main camera:
// Full screen) and over its main area (Config.main_controls): the camera's controls
// along the edge set for the place's shape on the Cameras page, its PTZ presets, its zoom,
// and the card's own buttons (Sound, Full screen). A
// tap on a control is Home Assistant's own toggle, as on the camera dashboard's tiles
// (auto_dashboards/dashboard.py: control_tile), so a lock, a cover or a button does
// what it does there. A control with Two taps (the Cameras page; a lock or a gate unless
// set otherwise) is armed by its first tap and worked by its second, as Dash-Bored's
// guarded devices are, so a finger brushing it opens nothing. A tap on a preset is the
// camera's PTZ action with that preset, as the app built it (cameras.py: preset_calls).
import { css, html, nothing } from "lit";
import { fire, type Hass } from "../ha.ts";
import { alignOf, controlsAt, foldPresets, twoTaps, zoomOf, zoomPct, zoomStep } from "../../../../app/web/src/cameras/controls.ts";
import type { Card, Preset } from "./common.ts";

/** States a control can't be used in: shown dimmed and said, never a dead button. */
const OUT = new Set(["unavailable", "unknown"]);

/** How long a control with Two taps waits for its second tap: a lease, so a gate armed
 * and walked away from can't be opened later by a passing tap. Dash-Bored's ARMED. */
export const ARMED_MS = 6_000;

/** How long "why a preset or a zoom didn't go" stays with the controls. */
export const PTZ_NOTE_MS = 10_000;
/** How long a zoom level asked for is shown as on its way: a lens takes a second or two,
 * and a lease, so a camera that never gets there doesn't say "→ 60%" for ever. */
export const ZOOM_PENDING_MS = 6_000;

/** One of the card's own buttons, where it offers them (Config.sound_button,
 * screen_button): what it says and shows in its state now (`on`: a pressed chip), and its
 * tap. */
export type Own = { on: boolean; icon: string; label: string; title: string; toggle: () => void };

/** The lines a bar can open out on the picture's side of it: the PTZ presets (where they
 * are behind the PTZ button) and the zoom's stepper. One at a time. */
export type Line = "ptz" | "zoom";

/** The card's side of a camera's presets and zoom: the line opened out ("" for none), a
 * tap on the PTZ or the Zoom button (`show`: opens its line, or puts it away), a preset's
 * tap, a zoom level to go to, the level asked for and not yet reached (null: none), and
 * why the last preset or zoom didn't go ("" when it did, or after PTZ_NOTE_MS). And the
 * control armed by its first tap (`armed`, its armKey; "" for none), which `arm` sets for
 * ARMED_MS, or clears with "". */
export type Lines = {
  open: Line | "";
  show: (line: Line) => void;
  go: (preset: Preset) => void;
  zoom: (entity: string, value: number) => void;
  zoomTo: number | null;
  failed: string;
  armed: string;
  arm: (key: string) => void;
};

/** What an armed control is known by, on its button too (data-control): its entity and
 * its state when armed, so one that moves meanwhile (a gate opened from elsewhere) is no
 * longer armed, and a second tap meant for the other way doesn't work it. */
export const armKey = (entity: string, hass: Hass) => `${entity}=${hass.states[entity]?.state}`;

/** The camera's controls and presets (after the card's own buttons) along their edge of
 * `place`: the full screen, or the main area (Config.main_controls), `size` px. The wide
 * or the tall edge goes by the shape of that place, not the screen's: a main area can be
 * wide on an upright tablet. The buttons have the style guide's chip size, font and shape
 * (pills.css: cm-chip), one size on every device, in white on black at the camera's
 * background strength, coloured while their entity is on, and they always keep their
 * names. Where the presets don't fit they go behind one PTZ button
 * (controls.ts: foldPresets), which opens them out as a second line on the picture's side
 * of the bar (under a bar at the top, left of one on the right). A camera
 * with a zoom always has one Zoom button (owner, 2026-11-27), which opens its stepper the
 * same way: out, the level, in, and Reset (all the way out). */
export function controlsBar(el: HTMLElement, hass: Hass, camera: Card["cameras"][string], place: string, size: [number, number], own: Own[], lines: Lines) {
  const controls = camera.controls ?? [];
  const presets = camera.presets ?? [];
  if (!controls.length && !own.length && !presets.length && !camera.zoom) return nothing;
  const at = controlsAt(camera.controls_at);
  // Its zoom: the level is the entity's own, never the one asked for, so it is right
  // after a preset has moved the lens too.
  const zst = camera.zoom ? hass.states[camera.zoom] : undefined;
  const zoom = zst ? zoomOf(zst.state, zst.attributes) : null;
  const zoomOut = !camera.zoom ? "" : !zst ? "Not found" : zoom ? "" : "Unavailable";
  const zoomName = zoom ? `Zoom ${zoomPct(zoom, zoom.value)}%` : "Zoom";
  const edge = size[0] >= size[1] ? at.landscape : at.portrait;
  const nameOf = (c: (typeof controls)[number]) => c.name || (hass.states[c.entity]?.attributes.friendly_name as string | undefined) || c.entity;
  const named = [...own.map((b) => b.label), ...controls.map(nameOf), ...(camera.zoom ? [zoomName] : [])];
  const folded = foldPresets(size, edge, named, presets.map((p) => p.name));
  const preset = (p: Preset) =>
    html`<button class="control cm-chip" title="Move the camera to ${p.name}" @click=${() => lines.go(p)}>
      <ha-icon icon="mdi:camera-control"></ha-icon>
      <span>${p.name}</span>
    </button>`;
  const opened = lines.open === "ptz" ? folded : lines.open === "zoom" ? Boolean(zoom) : false;
  // The zoom's stepper. Each tap goes on from the level asked for, where one is on its
  // way, so three quick taps are three steps and not one.
  const stepper = () => {
    const to = lines.zoomTo !== null && lines.zoomTo !== zoom!.value ? lines.zoomTo : null;
    const from = to ?? zoom!.value;
    const send = (value: number) => lines.zoom(camera.zoom!, value);
    return html`<div class="controls-line">
      <button class="control cm-chip" ?disabled=${from <= zoom!.min} title="Zoom out a step" @click=${() => send(zoomStep(zoom!, from, -1))}>
        <ha-icon icon="mdi:magnify-minus-outline"></ha-icon>
        <span>Out</span>
      </button>
      <span class="control level cm-chip" title="The camera's zoom now${to === null ? "" : ", and the level it is going to"}">
        ${zoomPct(zoom!, zoom!.value)}%${to === null ? "" : ` → ${zoomPct(zoom!, to)}%`}
      </span>
      <button class="control cm-chip" ?disabled=${from >= zoom!.max} title="Zoom in a step" @click=${() => send(zoomStep(zoom!, from, 1))}>
        <ha-icon icon="mdi:magnify-plus-outline"></ha-icon>
        <span>In</span>
      </button>
      <button class="control cm-chip" ?disabled=${from <= zoom!.min} title="Zoom all the way out" @click=${() => send(zoom!.min)}>
        <ha-icon icon="mdi:backup-restore"></ha-icon>
        <span>Reset</span>
      </button>
    </div>`;
  };
  // The bar's chips, in order: the card's own, the camera's controls, its presets (or
  // the PTZ button they are behind), its zoom.
  const chips = [
    ...own.map(
      (b) =>
        html`<button class="control cm-chip ${b.on ? "cm-on" : ""}" title=${b.title} aria-label=${b.label} aria-pressed=${b.on} @click=${b.toggle}>
          <ha-icon icon=${b.icon}></ha-icon>
          <span>${b.label}</span>
        </button>`,
    ),
    ...controls.map((c) => {
      const st = hass.states[c.entity];
      const name = nameOf(c);
      const out = !st ? "Not found" : OUT.has(st.state) ? "Unavailable" : "";
      const key = armKey(c.entity, hass);
      const armed = lines.armed === key;
      const guarded = twoTaps(c, st?.attributes.device_class as string | undefined);
      // A tap anywhere but on the armed button disarms it before it lands (card.ts:
      // disarm), so here a first tap arms and a tap on the armed one works it.
      const tap = () => {
        if (guarded && !armed) return lines.arm(key);
        lines.arm("");
        fire(el, "hass-action", { config: { entity: c.entity, tap_action: { action: "toggle" } }, action: "tap" });
      };
      return html`<button
        class="control cm-chip ${armed ? "armed cm-warn" : st?.state === "on" || st?.state === "open" || st?.state === "unlocked" ? "cm-on" : ""}"
        data-control=${key}
        ?disabled=${Boolean(out)}
        title=${out ? `${c.entity}: ${out}` : armed ? `Tap again for ${name}; a tap anywhere else lets it be` : guarded ? `${name} (two taps)` : name}
        aria-label=${armed ? `${name}: tap again` : name}
        @click=${tap}
      >
        ${st ? html`<ha-state-icon .hass=${hass} .stateObj=${st} .icon=${c.icon}></ha-state-icon>` : html`<ha-icon icon="mdi:alert-circle-outline"></ha-icon>`}
        <span>${armed ? `${name}: tap again` : name}</span>
        ${out ? html`<span class="cm-pill cm-filled cm-bad">${out}</span>` : nothing}
      </button>`;
    }),
    ...(folded
      ? [
          html`<button
            class="control cm-chip ${lines.open === "ptz" ? "cm-on" : ""}"
            title=${lines.open === "ptz" ? "Put the presets away" : `Its ${presets.length} PTZ presets`}
            aria-label="PTZ"
            aria-expanded=${lines.open === "ptz"}
            @click=${() => lines.show("ptz")}
          >
            <ha-icon icon="mdi:camera-control"></ha-icon>
            <span>PTZ</span>
          </button>`,
        ]
      : presets.map(preset)),
    ...(camera.zoom
      ? [
          html`<button
            class="control cm-chip ${lines.open === "zoom" && zoom ? "cm-on" : ""}"
            ?disabled=${Boolean(zoomOut)}
            title=${zoomOut ? `${camera.zoom}: ${zoomOut}` : lines.open === "zoom" ? "Put the zoom away" : "Zoom in or out"}
            aria-label=${zoomName}
            aria-expanded=${lines.open === "zoom" && Boolean(zoom)}
            @click=${() => lines.show("zoom")}
          >
            <ha-icon icon=${zst ? "mdi:magnify" : "mdi:alert-circle-outline"}></ha-icon>
            <span>${zoomName}</span>
            ${zoomOut ? html`<span class="cm-pill cm-filled cm-bad">${zoomOut}</span>` : nothing}
          </button>`,
        ]
      : []),
  ];
  // A tap that misses a button, between two or just beside one, lands on the group they
  // stand in and does nothing: it was going through to the picture, which opened the
  // camera full screen (owner, 2026-11-27). While a line is opened out or a control is
  // armed, a tap anywhere else in the place puts it away or disarms it, and does no more
  // than that.
  const armedHere = controls.some((c) => lines.armed === armKey(c.entity, hass));
  return html`<div class="controls-area" style=${place}>
    ${opened || armedHere ? html`<div class="controls-away" @click=${() => opened && lines.show(lines.open as Line)}></div>` : nothing}
    <div class="controls" style="--cm-chip-align:${alignOf(at)};--cm-chip-alpha:${at.opacity}%" data-edge=${edge}>
      <div class="controls-group">
        <div class="controls-line">
          ${chips}${lines.failed ? html`<span class="cm-pill cm-filled cm-bad failed">${lines.failed}</span>` : nothing}
        </div>
        ${!opened ? nothing : lines.open === "zoom" ? stepper() : html`<div class="controls-line">${presets.map(preset)}</div>`}
      </div>
    </div>
  </div>`;
}

export const fullStyles = css`
  /* Over the whole screen, Home Assistant's own header and sidebar too: the main camera
     (.full), and the card itself when its Full fills the window: a zoomed kiosk's, or
     one whose page can't have the screen (card.ts: toScreen). */
  .full,
  :host([filled]) {
    position: fixed;
    inset: 0;
    z-index: 10;
    background: #000;
  }
  /* Along its edge, the group of buttons sits at the start, the middle or the end. The
     group is only as big as its buttons and the room round them, and takes the taps that
     miss one. Its lines stand side by side from the edge inwards: the bar itself, then
     the PTZ presets or the zoom's stepper when opened out. The buttons are the style
     guide's chip size, font and shape (pills.css) in the controls' own colours, and the
     room is controls.ts ROOM. */
  .controls {
    position: absolute;
    display: flex;
    justify-content: var(--cm-chip-align);
  }
  .controls-group {
    display: flex;
    box-sizing: border-box;
    max-width: 100%;
    max-height: 100%;
    gap: 5px;
    padding: 7px;
    pointer-events: auto;
  }
  /* Over the whole place while a line is opened out: a tap on it puts the line away. */
  .controls-away {
    position: absolute;
    inset: 0;
    pointer-events: auto;
  }
  .controls-line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: var(--cm-chip-align);
    gap: 5px;
  }
  /* The guide's chip size, font and shape, in the controls' colours over a picture:
     white on black at the camera's background strength (the Cameras page), and the
     active colour at it while on. */
  .controls .control.cm-chip {
    position: relative;
    box-shadow: none;
    background: rgb(0 0 0 / var(--cm-chip-alpha));
    color: #fff;
    pointer-events: auto;
    --mdc-icon-size: 14px;
  }
  .controls .control.cm-chip.cm-on {
    background: color-mix(in srgb, var(--state-active-color, var(--primary-color)) var(--cm-chip-alpha), transparent);
  }
  /* Armed by its first tap (Two taps): solid in the warning colour whatever the
     Background, so it stands out over any picture, with dark text, which reads on it. */
  .controls .control.cm-chip.armed {
    background: var(--tone);
    color: #000;
  }
  .controls .control.cm-chip:disabled {
    opacity: 0.7;
  }
  /* A chip is 22 px high, less than a finger: its tap area reaches half-way to the next
     chip along the bar, and across the bar to 44 px. */
  .control::after {
    content: "";
    position: absolute;
    inset: -11px -2.5px;
  }
  .controls[data-edge="left"] .control::after,
  .controls[data-edge="right"] .control::after {
    inset: -2.5px -11px;
  }
  /* A line opened out stands 5 px from the bar, so there the two lines' tap areas meet
     half-way, as chips' do along a line. Reaching 11 px, the opened line's covered 6 px
     of the bar's chips, PTZ's too, and a tap there sent a preset (2026.11.14-b17;
     tests/test_commander_tap_areas.py). */
  .controls[data-edge="top"] .controls-line:not(:last-child) .control::after,
  .controls[data-edge="bottom"] .controls-line + .controls-line .control::after { bottom: -2.5px; }
  .controls[data-edge="bottom"] .controls-line:not(:last-child) .control::after,
  .controls[data-edge="top"] .controls-line + .controls-line .control::after { top: -2.5px; }
  .controls[data-edge="left"] .controls-line:not(:last-child) .control::after,
  .controls[data-edge="right"] .controls-line + .controls-line .control::after { right: -2.5px; }
  .controls[data-edge="right"] .controls-line:not(:last-child) .control::after,
  .controls[data-edge="left"] .controls-line + .controls-line .control::after { left: -2.5px; }
  /* The zoom's level, between its two steps: says, and is not pressed. */
  .controls .level {
    cursor: default;
    font-variant-numeric: tabular-nums;
  }
  /* Why a preset didn't go: wraps, so a long reason stays on a narrow card. */
  .controls .failed {
    white-space: normal;
  }
  /* Its place (the full screen or the main area) lets taps through to the picture
     under it, but for the buttons themselves. */
  .controls-area {
    position: absolute;
    pointer-events: none;
  }
  /* The edge for its place's shape: set on the Cameras page. The second line is on the
     picture's side of the first. */
  .controls[data-edge="top"] { top: 0; left: 0; right: 0; }
  .controls[data-edge="bottom"] { bottom: 0; left: 0; right: 0; }
  .controls[data-edge="left"] { left: 0; top: 0; bottom: 0; flex-direction: column; }
  .controls[data-edge="right"] { right: 0; top: 0; bottom: 0; flex-direction: column; }
  .controls[data-edge="top"] .controls-group { flex-direction: column; }
  .controls[data-edge="bottom"] .controls-group { flex-direction: column-reverse; }
  .controls[data-edge="left"] .controls-group { flex-direction: row; }
  .controls[data-edge="right"] .controls-group { flex-direction: row-reverse; }
  .controls[data-edge="left"] .controls-line,
  .controls[data-edge="right"] .controls-line { flex-direction: column; flex-wrap: nowrap; align-items: stretch; }
  /* A chip's height of room at each end of the edge, so the first button isn't hard
     against the frame, where a finger misses it and presses the one below (owner,
     2026-11-26). The end buttons' tap areas reach across that room, so a tap a little
     short still hits them. */
  .controls[data-edge="top"] .controls-group,
  .controls[data-edge="bottom"] .controls-group { padding-inline: 22px; }
  .controls[data-edge="left"] .controls-group,
  .controls[data-edge="right"] .controls-group { padding-block: 22px; }
  .controls[data-edge="top"] .control:first-child::after,
  .controls[data-edge="bottom"] .control:first-child::after { left: -22px; }
  .controls[data-edge="top"] .control:last-child::after,
  .controls[data-edge="bottom"] .control:last-child::after { right: -22px; }
  .controls[data-edge="left"] .control:first-child::after,
  .controls[data-edge="right"] .control:first-child::after { top: -22px; }
  .controls[data-edge="left"] .control:last-child::after,
  .controls[data-edge="right"] .control:last-child::after { bottom: -22px; }
`;
