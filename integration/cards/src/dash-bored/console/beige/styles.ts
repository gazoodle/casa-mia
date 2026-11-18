// Beige's look: moulded beige plastic with recessed bays, grey print and grey LCDs, and
// how each control in kit.ts moves. The sizes are Bakelite's (../balance.ts counts on
// them): a knob, a switch, a meter and a screen each take the room here that they take
// there. Nothing moves by itself but a critical alert's LED, and nothing has a filter.
import { css } from "lit";
import { FIGURES } from "../figures.ts";

export const STYLES = css`
  .panel { --lcd: #aeb79e; --lcd-ink: #1d261a; --ink: #5b5648; --seg-on: var(--lcd-ink); --seg-off: rgba(29,38,26,.07); box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink);
    font-family: Helvetica, Arial, sans-serif; background: radial-gradient(rgba(0,0,0,.04) 1px, transparent 1.4px) 0 0 / 3px 3px, linear-gradient(175deg, #e6dfcb, #d5ccb5); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  /* A legend: grey print on the plastic. */
  .label { display: inline-block; max-width: 100%; font-size: 10px; letter-spacing: .03em; overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red LED and a line of print. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; font-weight: 700; }
  .lamp { flex: none; width: 10px; height: 10px; border-radius: 50%; background: #e3291c; box-shadow: 0 0 6px #e3291c; }

  /* A bay: a shallow recess moulded into the case. */
  .room, .knives, .top > .meter, .top > .tv, .lamps { position: relative; border-radius: 7px; background: linear-gradient(180deg, #dad1bb, #cec4ac); box-shadow: inset 0 2px 3px rgba(0,0,0,.28), inset 0 -1px 0 rgba(255,255,255,.6), 0 1px 0 rgba(255,255,255,.65); }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
  .top > .meter { flex: 0 1 190px; padding: 12px 12px 8px; }
  .floor .label { font-size: 13px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). Its lights are at its top left and its name at its top right, and a row of
     cooling slots is moulded into its foot. */
  .room { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 12px 10px 32px; text-align: center; }
  .room::after { content: ""; position: absolute; right: 14px; bottom: 10px; width: 66px; height: 14px; background: repeating-linear-gradient(90deg, #8f8672 0 2px, transparent 2px 6px); }
  .room > .label { justify-self: end; font-size: 14px; font-weight: 700; font-style: italic; text-align: right; }
  .room > :not(.leds, .label) { grid-column: 1 / -1; }
  /* Every control is fixed to the panel: it hangs from the top of its row and keeps the
     same height whatever its legend says, so a name that grows or a setting that changes
     moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; margin-top: 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .8; }
  .more .label, .rec .label { font-size: 9px; }
  .rec { justify-self: center; margin-top: 10px; padding: 3px 12px; border-radius: 5px; background: linear-gradient(#9a9486, #7d776a); box-shadow: 0 2px 0 #5d584e; color: #f1ecdd; }
  .rec:active { transform: translateY(1px); box-shadow: 0 1px 0 #5d584e; }
  .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* An LCD: black on grey-green, sunk a little into the case. */
  .win, .leds, .dial > .figs, .wheel .figs, .register .figs, .alert .label { background: var(--lcd); box-shadow: inset 0 2px 4px rgba(0,0,0,.4); }
  .register .figs { padding: 4px 5px; border-radius: 2px; }
  /* A room's lights: five strength bars, as a mobile telephone shows its signal. */
  .leds { display: flex; align-items: flex-end; gap: 2px; padding: 4px 7px; border-radius: 2px; }
  .leds span { width: 5px; background: var(--lcd-ink); opacity: .08; }
  .leds span:nth-child(1) { height: 4px; } .leds span:nth-child(2) { height: 7px; } .leds span:nth-child(3) { height: 10px; } .leds span:nth-child(4) { height: 13px; } .leds span:nth-child(5) { height: 16px; }
  .leds .on { opacity: 1; }

  /* Meters: figures over a row of blocks (../figures.ts). An LCD does not glow, and one
     that Home Assistant is not answering is blank. */
  .meter { text-align: center; }
  .meter > .label { margin-top: 6px; }
  .win { position: relative; display: flex; flex-wrap: wrap; align-items: center; align-content: center; justify-content: center; gap: 5px 6px; aspect-ratio: 120 / 70; max-width: 100%; border: 5px solid #b9b09a; border-radius: 3px; }
  .display .unit { align-self: flex-end; margin-bottom: 4px; color: var(--lcd-ink); font-size: 11px; font-weight: 700; }
  .display.unlit .unit { opacity: .1; }
  ${FIGURES}
  .sweep i:nth-child(n) { height: 7px; }

  /* Alerts: an LED, and what is wrong on a character LCD. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 12px 14px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  /* The weather (../weather.ts): an LCD, as a weather station for the home had, its lamps blocks of the display. */
  .panel { --sky-ink: var(--lcd-ink); --sky-on: var(--lcd-ink); --sky-off: rgba(29,38,26,.09); }
  .panel .sky .win i { width: 12px; height: 7px; border-radius: 1px; }
  .jewel { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--glow); box-shadow: 0 0 5px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #4cf04c; } .jewel.warning { --glow: #f0a51a; } .jewel.error, .jewel.critical { --glow: #e3291c; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { opacity: .25; } 100% { opacity: 1; } }
  .alert .label { max-width: 27ch; padding: 5px 9px; border: 3px solid #3a3a3a; border-radius: 2px; background: #b9cc2a; color: #1c2408; font: 13px/1.3 Menlo, "Courier New", monospace; letter-spacing: 0; }

  /* A jog dial in a well, with its setting on an LCD under its legend. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; width: 104px; height: 84px; margin: 4px auto 2px; }
  /* The dial, in layers. Its well and its shadow do not turn; the ridged disc does, and
     the dimple in it is turned back by as much, so that it stays lit from above. */
  .knob { position: absolute; left: 16px; top: 6px; width: 72px; height: 72px; border-radius: 50%; cursor: grab; touch-action: none; background: #c2b9a3; box-shadow: inset 0 2px 4px rgba(0,0,0,.4), 0 1px 0 #fff; }
  .knob::before { content: ""; position: absolute; inset: 5px; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,.45); }
  .disc { position: absolute; inset: 5px; border-radius: 50%; background: repeating-radial-gradient(circle, #8f897b 0 1px, #aaa496 1px 3px); transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .disc::after { content: ""; position: absolute; left: 50%; top: 7%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: radial-gradient(circle at 50% 30%, #6c675b, #b9b3a3); box-shadow: inset 0 2px 3px rgba(0,0,0,.55);
    transform: rotate(calc(135deg - var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag .disc, .knob.drag .disc::after { transition: none; }
  .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .dial > .figs { margin-top: 5px; padding: 3px 5px; border-radius: 2px; }
  .dial > .figs, .note { display: flex; width: fit-content; margin-left: auto; margin-right: auto; }
  /* A note is somebody's own addition: black print on white labeller tape. */
  .note { align-items: flex-start; margin-top: 5px; } .note .label { padding: 1px 6px; background: #fff; color: #111; font-size: 9px; font-weight: 700; box-shadow: 0 1px 1px rgba(0,0,0,.35); }

  /* A rocker marked I and O, under a green LED. A button centres what is in it: the
     rocker is pinned to the top instead, with its legend under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .rocker { position: relative; flex: none; margin-bottom: 6px; }
  .pilot { display: block; width: 6px; height: 6px; margin: 2px auto 5px; border-radius: 50%; background: #3d4a2c; transition: background .15s; }
  .dolly.on .pilot { background: #4cf04c; box-shadow: 0 0 5px #4cf04c; }
  /* The half that is pressed in is in shadow: O at rest, I when on. */
  .throw { display: flex; flex-direction: column; width: 30px; height: 46px; border: 3px solid #2b2b2b; border-radius: 4px; background: linear-gradient(180deg, #f3eddc 0 50%, #aaa28d 50%); box-shadow: 0 2px 2px rgba(0,0,0,.3); }
  .dolly.on .throw { background: linear-gradient(180deg, #aaa28d 0 50%, #f3eddc 50%); }
  .throw b { flex: 1; display: grid; place-items: center; color: #555; font: 700 11px Helvetica, Arial, sans-serif; }
  /* A guard for a switch that must not be thrown by accident: the case's keylock, beside
     it. The first press turns the key, and it turns back when the switch is at rest again. */
  .lock { position: absolute; left: calc(100% + 7px); top: 26px; width: 20px; height: 20px; border: 2px solid #777; border-radius: 50%; background: radial-gradient(circle at 40% 30%, #f2f2f2, #8d8d8d); transition: transform .18s; }
  .lock::after { content: ""; position: absolute; left: 50%; top: 14%; width: 3px; height: 72%; margin-left: -1.5px; border-radius: 1px; background: #222; }
  .dolly.up .lock { transform: rotate(90deg); }
  .dolly.away { cursor: default; } .dolly.away .rocker { opacity: .5; } .dolly.away .pilot { background: #777; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible .throw { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* An alarm: how it stands, an LCD figure for each place of its code with a rubber key over and under it, and its keys. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; font-weight: 700; }
  .alarm.sounding > .label { color: #c2180f; }
  .wheels { display: flex; gap: 3px; }
  .wheel { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .wheel button, .push .key { border-radius: 4px; background: linear-gradient(#9a9486, #7d776a); box-shadow: 0 2px 0 #5d584e; }
  .wheel button { width: 18px; height: 12px; color: #f1ecdd; font-size: 6px; line-height: 12px; text-align: center; }
  .wheel button:first-of-type::after { content: "▲"; } .wheel button:last-of-type::after { content: "▼"; }
  .wheel button:active, .push:active .key { transform: translateY(1px); box-shadow: 0 1px 0 #5d584e; }
  .wheel button:focus-visible, .push:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 1px; }
  .wheel .figs { padding: 3px 1px; border-radius: 2px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .key { display: block; width: 40px; height: 22px; margin: 2px auto 5px; border-radius: 5px; }
  .push .label { font-size: 9px; }

  /* A camera: a beige monitor with its power LED, and its name on labeller tape. The
     tube's height is set by padding, not an aspect ratio, which grew without end in WebKit. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 28px) * .75); margin: 9px 14px 22px; border-radius: 3px; background: #1d2023; box-shadow: 0 0 0 2px #333, 0 0 0 10px #d8cfb8, 0 10px 0 10px #d8cfb8, 0 12px 4px 10px rgba(0,0,0,.35); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; border-radius: 3px; object-fit: cover; }
  .tube::after { content: ""; position: absolute; right: -2px; bottom: -14px; width: 6px; height: 6px; border-radius: 50%; background: #4cf04c; }
  .tv .label { padding: 2px 8px; background: #fff; color: #111; font-weight: 700; box-shadow: 0 1px 1px rgba(0,0,0,.35); transform: rotate(-1deg); }
  .top > .tv { flex-basis: 170px; margin-top: 0; padding: 12px 10px 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 12px; }

  /* Scenes: function keys, numbered as they come, under a paper strip that says what each does. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 8px 6px; align-items: flex-end; padding: 12px; counter-reset: fkey; }
  .knife { display: flex; flex-direction: column; gap: 6px; width: 62px; text-align: center; counter-increment: fkey; }
  .strip { padding: 2px 1px; border: 1px solid #9a9a9a; background: #fff; color: #111; font-size: 9px; line-height: 1.15; overflow-wrap: anywhere; }
  .knife .key { display: block; height: 36px; margin: 0 5px 3px; border-radius: 4px; background: linear-gradient(#ece5d3, #d2c9b3); box-shadow: 0 3px 0 #a79f8a, 0 4px 5px rgba(0,0,0,.35), inset 0 1px 0 #fff; color: #555; font-size: 10px; line-height: 30px; }
  .knife .key::after { content: "F" counter(fkey); }
  .knife.closed .key, .knife:active .key { transform: translateY(2px); box-shadow: 0 1px 0 #a79f8a, inset 0 1px 0 #fff; }
  .knife:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* The recorder: a room's day as a chart in a window of a sixteen-colour desktop. It is
     ../scope.ts's oscilloscope, dressed: a white ground, a dotted grid, no glow, and a
     colour for each device's line. */
  dialog.recorder { width: min(760px, 94vw); padding: 0 0 8px; border: 2px solid; border-color: #fff #404040 #404040 #fff; border-radius: 0; background: #c0c0c0; color: #000; text-align: center; font-family: Tahoma, Helvetica, Arial, sans-serif; box-shadow: 0 20px 40px rgba(0,0,0,.5); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.4); }
  dialog.recorder > .label { display: block; margin: 2px; padding: 3px 6px; background: #000080; color: #fff; font-size: 12px; font-weight: 700; text-align: left; }
  dialog.recorder .warn { margin: 6px 8px 0; }
  .scope { width: calc(100% - 12px); height: auto; margin: 6px; border: 2px solid; border-color: #404040 #fff #fff #404040; background: #fff; }
  .scope .screen { fill: #fff; } .scope .grid { stroke: #008080; stroke-opacity: 1; stroke-dasharray: 1 3; } .scope .glow { display: none; }
  .scope .trace { stroke: #f00; stroke-width: 1.5; }
  .channel:nth-of-type(4n + 2) .trace { stroke: #00f; } .channel:nth-of-type(4n + 3) .trace { stroke: #008000; } .channel:nth-of-type(4n) .trace { stroke: #800080; }
  .scope text { fill: #000; font-size: 9px; }
  .scope .lane { text-anchor: end; } .scope .hour { font-size: 8px; text-anchor: middle; }
  /* The window's own button: grey, with a bevel. */
  dialog.recorder .push .key { display: none; }
  dialog.recorder .push .label { padding: 3px 22px; border: 2px solid; border-color: #fff #404040 #404040 #fff; background: #c0c0c0; color: #000; font-size: 12px; }
  dialog.recorder .push:active .label { border-color: #404040 #fff #fff #404040; }
  dialog.recorder .push:focus-visible .label { outline: 1px dotted #000; outline-offset: -5px; }

  @media (prefers-reduced-motion: reduce) { .jewel.critical { animation: none; } .disc, .disc::after, .lock { transition: none; } }
`;
