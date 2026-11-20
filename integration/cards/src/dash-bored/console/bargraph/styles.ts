// Bargraph's look: a stack of black hi-fi separates, with fine white legends and an
// orange line, and how each control in kit.ts moves. The sizes are Bakelite's
// (../balance.ts counts on them): a knob, a switch, a meter and a screen each take the
// room here that they take there. Nothing has a filter, and the only things that move by
// themselves are a needle's layer, a critical alert's lamp and a display's last segment.
import { css } from "lit";
import { FIGURES } from "../figures.ts";

export const STYLES = css`
  .panel { --vfd: #7df7e6; --amber: #ff7a1a; --ink: #e8e8e8; --glass: #04100f; --seg-on: var(--vfd); --seg-off: rgba(125,247,230,.07); --seg-glow: 0 0 5px rgba(125,247,230,.8); box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink);
    font-family: "Helvetica Neue", "Arial Narrow", Arial, sans-serif; background: #070708; }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  /* A legend: fine white capitals printed on the black. */
  .label { display: inline-block; max-width: 100%; font-size: 9.5px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red LED and a line of print. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .06em; text-transform: none; }
  .lamp { flex: none; width: 10px; height: 10px; border-radius: 50%; background: #ff3a2a; box-shadow: 0 0 8px #ff3a2a; }

  /* A separate: a brushed black front. */
  .room, .knives, .top > .meter, .top > .tv, .lamps { border-radius: 2px; background: repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px), linear-gradient(180deg, #252628, #131415);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.16), inset 0 -1px 0 #000, 0 2px 5px #000; }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
  .top > .meter { flex: 0 1 190px; padding: 10px 10px 8px; }
  .floor .label { font-size: 12px; font-style: italic; letter-spacing: .24em; color: var(--amber); }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). Its lights are at its top left and its name at its top right, over an orange line. */
  .room { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 12px 10px 14px; text-align: center; }
  .room > .label { justify-self: end; font-size: 13px; font-style: italic; letter-spacing: .2em; text-align: right; }
  .room > :not(.leds, .label) { grid-column: 1 / -1; }
  /* Every control is fixed to the panel: it hangs from the top of its row and keeps the
     same height whatever its legend says, so a name that grows or a setting that changes
     moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; margin-top: 9px; padding-top: 4px; border-top: 1px solid var(--amber); }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label, .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec { justify-self: center; margin-top: 10px; padding: 2px 10px; border: 1px solid #8a8a8a; border-radius: 10px; }
  .rec:focus-visible, .push:focus-visible .key, .knife:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* A room's lights: ten LEDs, green then amber then red. */
  .leds { display: flex; gap: 2px; padding: 4px 5px; border: 1px solid #333; background: #000; }
  .leds span { width: 5px; height: 12px; background: #35e35a; opacity: .14; transition: opacity .4s; }
  .leds span:nth-child(n + 7) { background: #ffc21a; } .leds span:nth-child(n + 9) { background: #ff3a2a; }
  .leds .on { opacity: 1; }

  /* Meters. A needle meter's face is still, and its needle is a layer of its own over it:
     the swing to a new reading and the waver are transforms of that layer, which the
     browser moves without drawing anything again. The needle wavers a quarter as far as
     Bakelite's (owner, 2026-11-15: the wobble falls by a quarter with each decade). */
  .meter { text-align: center; }
  .meter > .label { margin-top: 6px; }
  .win { position: relative; overflow: hidden; aspect-ratio: 120 / 70; max-width: 100%; border: 1px solid #3a3b3d; border-radius: 2px; background: radial-gradient(ellipse at 50% 130%, #6b5216, #17130a 70%); box-shadow: inset 0 0 12px #000; }
  .unlit .win { background: #121110; }
  .face { width: 100%; height: 100%; }
  .scale { fill: none; stroke: #f3ead0; stroke-width: .4; } .over { fill: none; stroke: #ff4a2a; stroke-width: 1.4; }
  .face text { fill: #f3ead0; font-size: 5.6px; text-anchor: middle; } .face .unit { font-size: 6px; letter-spacing: .1em; }
  .unlit .face { opacity: .45; }
  .needle { position: absolute; inset: 0; transform-origin: 50% 137.14%; transition: transform 1.1s cubic-bezier(.3, 1.5, .5, 1); }
  .waver { width: 100%; height: 100%; transform-origin: 50% 137.14%; animation: waver 1.2s ease-in-out infinite; }
  .waver path { stroke: #ff8a2a; stroke-width: .4; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.125deg); } 29% { transform: rotate(-.075deg); } 43% { transform: rotate(.175deg); } 57% { transform: rotate(-.15deg); } 71% { transform: rotate(.05deg); } 86% { transform: rotate(-.1deg); } }
  .cowl { position: absolute; left: 0; right: 0; bottom: 0; height: 9%; background: #000; }
  /* The fluorescent display that every third room has for its meter. */
  .display .win { display: flex; flex-wrap: wrap; align-items: center; align-content: center; justify-content: center; gap: 5px 6px; background: var(--glass); }
  .display .unit { align-self: flex-end; margin-bottom: 4px; color: var(--vfd); font-size: 11px; font-weight: 600; text-shadow: 0 0 5px var(--vfd); }
  .display.unlit .unit { opacity: .12; text-shadow: none; }
  /* The fluorescent figures and the sweep (../figures.ts): the sweep's segments lean, and its last four are red. */
  ${FIGURES}
  .sweep i { transform: skewX(-12deg); } .sweep i:nth-child(n + 17) { background: #ff6a3a; }
  /* The last lit segment flickers now and then: all that is left of a needle's waver. */
  .sweep .tip { animation: tip 5.3s steps(1) infinite; }
  @keyframes tip { 0%, 73%, 89% { opacity: 1; } 71% { opacity: .4; } 88% { opacity: .6; } }

  /* Alerts: an LED, and what is wrong on a dot-matrix fluorescent line. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 10px 12px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  /* The weather (../weather.ts): a fluorescent display, with a green LED for now and an amber one for tomorrow. */
  .panel { --sky-ink: var(--vfd); --sky-on: #4fdc4f; --sky-next: var(--amber); --sky-off: rgba(255,255,255,.09); --sky-glow: 0 0 6px currentColor; }
  .panel .sky .win, .panel .days .win { text-shadow: 0 0 5px rgba(125,247,230,.7); }
  .panel .sky .win i.lit { color: var(--sky-on); } .panel .sky .win em:nth-of-type(2) ~ i.lit { color: var(--sky-next); }
  .jewel { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--glow); box-shadow: 0 0 7px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #e8e8e8; } .jewel.warning { --glow: #ffc21a; } .jewel.error, .jewel.critical { --glow: #ff3a2a; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { opacity: .25; } 100% { opacity: 1; } }
  .alert .label { position: relative; padding: 5px 9px; border: 1px solid #333; background: var(--glass); color: var(--vfd); font: 700 13px/1.3 Menlo, "Courier New", monospace; letter-spacing: .1em; text-shadow: 0 0 5px var(--vfd); }
  /* The letters are made of dots: dark lines across them, both ways. */
  .alert .label::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgba(4,16,15,.5) .6px, transparent .6px) 0 0 / 100% 2.6px, linear-gradient(90deg, rgba(4,16,15,.5) .6px, transparent .6px) 0 0 / 2.6px 100%; }

  /* A fader for each level, in a slot with a scale each side, and its ladder of LEDs. The
     fader's element is as tall as its cap travels; the slot and the cap overhang it. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.heat { min-height: 174px; }
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; display: flex; justify-content: center; gap: 8px; width: 104px; height: 104px; margin: 8px auto 6px; }
  .ladder { display: flex; flex-direction: column-reverse; justify-content: center; gap: 2px; }
  .ladder i { width: 8px; height: 8px; background: var(--amber); opacity: .14; } .ladder .lit { opacity: 1; }
  /* A blind's ladder is green, a player's ivory and a fan's blue-green. */
  .ladder.wind i { background: #35e35a; } .ladder.sound i { background: #f3ead0; } .ladder.air i { background: var(--vfd); }
  .slide { position: relative; width: 34px; height: 82px; margin: 11px 0; cursor: ns-resize; touch-action: none; }
  .slide::before { content: ""; position: absolute; inset: -11px 0; border-radius: 2px;
    background: linear-gradient(90deg, transparent 14px, #000 14px 20px, transparent 20px), repeating-linear-gradient(0deg, #8a8a8a 0 1px, transparent 1px 9px) 0 11px / 8px 83px no-repeat, repeating-linear-gradient(0deg, #8a8a8a 0 1px, transparent 1px 9px) 100% 11px / 8px 83px no-repeat; }
  .cap { position: absolute; left: 4px; right: 4px; bottom: calc(var(--lvl, 0) * 1% - 11px); height: 22px; border-radius: 2px; background: linear-gradient(180deg, #5a5b5e, #2a2b2d 42%, #f4f4f4 42% 56%, #232426 56%, #0f0f10);
    box-shadow: 0 4px 5px #000, inset 0 1px 0 rgba(255,255,255,.35); transition: bottom .3s; }
  .drag .cap { transition: none; }
  .slide:focus-visible, .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  /* The heating's knob. Its ring of LEDs is lit as far as it is turned; its body, and the
     light on it, stay where they are, and only its line turns. */
  .knob { position: relative; width: 66px; height: 66px; margin: 19px 0; border-radius: 50%; cursor: grab; touch-action: none; }
  .knob::before { content: ""; position: absolute; inset: -12px; border-radius: 50%; background: conic-gradient(from 225deg, var(--amber) 0 calc(var(--lvl, 0) * 2.7deg), #3a2410 0 270deg, transparent 0);
    -webkit-mask: radial-gradient(circle, transparent 0 60%, #000 61% 68%, transparent 69%), repeating-conic-gradient(from 225deg, #000 0 9deg, transparent 9deg 15deg); -webkit-mask-composite: source-in; mask-composite: intersect; }
  .knob::after { content: ""; position: absolute; inset: 3px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #4d4e51, #0d0d0e 70%); box-shadow: 0 5px 8px #000, inset 0 1px 0 rgba(255,255,255,.25); }
  .mark { position: absolute; inset: 3px; z-index: 1; border-radius: 50%; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .drag .mark { transition: none; }
  .mark::after { content: ""; position: absolute; left: 50%; top: 6%; width: 2px; height: 22%; margin-left: -1px; background: var(--amber); }
  .dial > .figs { margin-top: 5px; padding: 4px 6px; border: 1px solid #333; background: var(--glass); }
  .dial > .figs, .note { display: flex; width: fit-content; margin-left: auto; margin-right: auto; }
  .note { margin-top: 4px; } .note .label { font-size: 8px; letter-spacing: .08em; text-transform: none; opacity: .8; }

  /* A soft-touch key with an LED in its corner. A button centres what is in it: the key
     is pinned to the top instead, with its legend under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .soft { position: relative; flex: none; margin: 12px 0 9px; }
  .throw { display: block; width: 54px; height: 26px; border-radius: 3px; background: linear-gradient(180deg, #414245, #1c1d1f); box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 2px 3px #000; }
  .dolly:active .throw { background: linear-gradient(180deg, #2c2d30, #17181a); }
  .pilot { position: absolute; left: 6px; top: 5px; width: 9px; height: 4px; background: #4a0f0a; transition: background .15s; }
  .dolly.on .pilot { background: #ff3a2a; box-shadow: 0 0 6px #ff3a2a; }
  /* A guard over a key that must not be pressed by accident: a flap of smoked perspex,
     hinged at its top and lifted by the first press. Lifted, it takes no presses: in
     WebKit a cover folded small still took them, and the key under it could not be pressed. */
  .flap { position: absolute; inset: -5px -6px; border: 1px solid rgba(255,255,255,.3); border-radius: 2px; background: linear-gradient(120deg, rgba(255,255,255,.22), rgba(70,50,30,.6) 30%, rgba(40,28,18,.7)); transform-origin: top; transition: transform .18s; }
  .dolly.up .flap { transform: scaleY(.14); pointer-events: none; }
  .dolly .label { font-size: 8px; letter-spacing: .1em; }
  .dolly.away { cursor: default; } .dolly.away .soft { opacity: .45; } .dolly.away .pilot { background: #222; box-shadow: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible .throw { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* An alarm: how it stands, a fluorescent figure for each place of its code with a key over and under it, and its keys. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; }
  .alarm.sounding > .label { color: #ff3a2a; }
  .wheels { display: flex; gap: 3px; }
  .wheel { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .wheel button { width: 18px; height: 13px; border: 1px solid #777; border-radius: 7px; color: #ccc; font-size: 10px; line-height: 11px; text-align: center; }
  .wheel button:first-of-type::after { content: "+"; } .wheel button:last-of-type::after { content: "−"; }
  .wheel button:active, .push:active .key { background: #2c2d30; }
  .wheel button:focus-visible { outline: 2px solid var(--ink); outline-offset: 1px; }
  .wheel .figs { padding: 3px 1px; background: var(--glass); }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push .key { display: block; min-width: 40px; padding: 4px 8px; border: 1px solid #999; border-radius: 11px; font-size: 8.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; text-align: center; }

  /* A camera: a small colour monitor in a black case, with lines across its picture. The
     tube's height is set by padding, not an aspect ratio, which grew without end in WebKit. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 7px; overflow: hidden; border-radius: 6px; background: #0a0d0f; box-shadow: 0 0 0 7px #101011, 0 0 0 8px #3a3b3d; }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
  .tube::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.2) 0 1px, transparent 1px 3px); }
  .top > .tv { flex-basis: 170px; margin-top: 0; padding: 18px 10px 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 9px; }

  /* Scenes: a tuner's presets, numbered as they come, each with a bar that lights when it is pressed. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 10px; align-items: flex-end; padding: 12px; counter-reset: preset; }
  .knife { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 66px; text-align: center; counter-increment: preset; }
  .bar { width: 26px; height: 3px; background: #4a2408; transition: background .1s; }
  .knife.closed .bar { background: var(--amber); box-shadow: 0 0 6px var(--amber); }
  .knife .key { display: block; width: 100%; height: 24px; border: 1px solid #555; border-radius: 12px; font: 600 12px/22px "Helvetica Neue", Arial, sans-serif; }
  .knife .key::after { content: counter(preset); }
  .knife:active .key { background: #2c2d30; }

  /* The recorder: a room's day on a spectrum analyser. Each device has a row of columns,
     a quarter of an hour each and six segments tall, lit as high as it stood. It scrolls
     sideways where the screen is narrower than its day. */
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 1px solid #3a3b3d; border-radius: 2px; color: #e8e8e8; text-align: center; font-family: "Helvetica Neue", "Arial Narrow", Arial, sans-serif;
    --vfd: #7df7e6; --glass: #04100f; --ink: #e8e8e8; background: linear-gradient(180deg, #252628, #131415); box-shadow: 0 20px 40px #000; }
  dialog.recorder::backdrop { background: rgba(0,0,0,.6); }
  dialog.recorder > .label { font-size: 12px; font-style: italic; letter-spacing: .2em; }
  .analyser { margin: 10px 0; padding: 10px; overflow-x: auto; border: 1px solid #333; background: var(--glass); text-align: left; }
  .lane { display: flex; align-items: flex-end; gap: 8px; width: max-content; margin-bottom: 6px; }
  .lane .name { flex: none; width: 96px; overflow: hidden; color: var(--vfd); font-size: 9px; letter-spacing: .08em; text-align: right; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
  .columns { position: relative; display: flex; gap: 1px; width: 576px; height: 17px; color: var(--vfd); font-size: 9px; }
  /* A column: its six segments dark, and over them as many lit as its --n. */
  .columns i { position: relative; flex: none; width: 5px; height: 17px; background: repeating-linear-gradient(to top, rgba(125,247,230,.1) 0 2px, transparent 2px 3px); }
  .columns i::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--n) * 3px); background: repeating-linear-gradient(to top, var(--vfd) 0 2px, transparent 2px 3px); }
  .columns .gap { background: none; }
  .hours .columns { height: 11px; } .hours b { position: absolute; top: 0; font-weight: 400; opacity: .7; transform: translateX(-50%); }

  @media (prefers-reduced-motion: reduce) { .waver, .jewel.critical, .sweep .tip { animation: none; } .needle, .cap, .mark { transition: none; } }
`;
