// Nixie's look: a rack of test instruments. Blue-grey plates on a wrinkle-finish frame,
// with engraved legends filled white, and how each control in kit.ts moves. The sizes are
// Bakelite's (../balance.ts counts on them): a knob, a switch, a meter and a screen each
// take the room here that they take there. The only things that move by themselves are a
// needle's layer and a critical alert's lamp.
import { css } from "lit";

export const STYLES = css`
  .panel { --ink: #f3f1e6; --case: #17191b; box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink); font-family: "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif;
    /* Wrinkle finish: the dark blue-grey of an instrument rack. */
    background: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1.7px) 0 0 / 4px 4px, radial-gradient(rgba(0,0,0,.2) 1px, transparent 1.7px) 2px 2px / 4px 4px, linear-gradient(170deg, #4c5961, #333d44); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  /* A legend: engraved in the plate and filled white. */
  .label { display: inline-block; max-width: 100%; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(0,0,0,.45); overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red lamp and an engraved line. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .06em; text-transform: none; }
  .lamp { flex: none; width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffd0c8, #ff2a1a 55%, #a30f08); box-shadow: 0 0 0 2px var(--case), 0 0 10px #ff3a22; }

  /* A plate: blue-grey anodised aluminium, with a screw in each top corner. */
  .room, .knives, .top > .meter, .top > .tv, .lamps { position: relative; border-radius: 3px; background: linear-gradient(175deg, #8ba4b0, #6f8996); box-shadow: inset 0 1px 0 rgba(255,255,255,.4), inset 0 -1px 0 rgba(0,0,0,.3), 0 3px 6px rgba(0,0,0,.5); }
  .room::before, .room::after, .knives::before, .knives::after, .lamps::before, .lamps::after { content: ""; position: absolute; top: 3px; width: 8px; height: 8px;
    background: linear-gradient(45deg, transparent 44%, #333 44% 56%, transparent 56%), radial-gradient(circle, #d5d9dc 0 3px, #4a5257 3.2px 3.8px, transparent 4px); }
  .room::before, .knives::before, .lamps::before { left: 3px; } .room::after, .knives::after, .lamps::after { right: 3px; }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 14px; }
  .top > .meter { flex: 0 1 190px; padding: 12px 12px 8px; }
  .floor .label { font-size: 13px; letter-spacing: .3em; }
  /* A chassis is some of the panel's columns across (views.ts lays the rooms out, and
     balance.ts chooses). Its magic eye is at its top left and its name at its top right. */
  .room { display: grid; grid-template-columns: auto 1fr; align-items: center; padding: 14px 10px 14px; text-align: center; }
  .room > .label { justify-self: end; font-size: 12px; text-align: right; }
  .room > :not(.eye, .label) { grid-column: 1 / -1; }
  /* Every control is fixed to the panel: it hangs from the top of its row and keeps the
     same height whatever its legend says, so a name that grows or a setting that changes
     moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; margin-top: 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .8; }
  .more .label, .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec { justify-self: center; margin-top: 10px; padding: 2px 9px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.45), 0 1px 0 rgba(255,255,255,.3); }
  .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* A magic eye: two green bars that close on each other as the room's lights come up. */
  .eye { position: relative; width: 66px; height: 20px; overflow: hidden; border: 2px solid var(--case); border-radius: 10px; background: #07140b; box-shadow: inset 0 0 6px #000, 0 1px 0 rgba(255,255,255,.3); }
  .eye i { position: absolute; top: 2px; bottom: 2px; width: calc(6% + var(--shut, 0) * 44%); opacity: calc(.3 + var(--shut, 0) * .7); background: linear-gradient(#b8ffcf, #35e36f 40%, #0c9a3e); box-shadow: 0 0 8px #3dff7d; transition: width 1s, opacity 1s; }
  .eye i:first-child { left: 0; } .eye i:last-child { right: 0; }

  /* Meters. The two at the top have needles: a cream face under perspex, and a fine black
     needle on a layer of its own (../needle.ts), which wavers three quarters as far as
     Bakelite's (owner, 2026-11-15: the wobble falls by a quarter with each decade). */
  .meter { text-align: center; }
  .meter > .label { margin-top: 6px; }
  .win { position: relative; overflow: hidden; aspect-ratio: 120 / 70; max-width: 100%; border: 4px solid var(--case); border-radius: 5px; background: linear-gradient(#fbf8ec, #ebe6d2); box-shadow: 0 3px 5px rgba(0,0,0,.45); }
  .unlit .win { background: #8f918c; }
  .face { width: 100%; height: 100%; }
  .scale { fill: none; stroke: var(--case); stroke-width: .5; } .over { fill: none; stroke: #c2281c; stroke-width: 1.6; }
  .face text { fill: var(--case); font-size: 6px; text-anchor: middle; } .face .unit { font-size: 6.5px; }
  .needle { position: absolute; inset: 0; transform-origin: 50% 137.14%; transition: transform 1.1s cubic-bezier(.3, 1.6, .5, 1); }
  .waver { width: 100%; height: 100%; transform-origin: 50% 137.14%; animation: waver 1.2s ease-in-out infinite; }
  .waver path { stroke: var(--case); stroke-width: .45; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.375deg); } 29% { transform: rotate(-.225deg); } 43% { transform: rotate(.525deg); } 57% { transform: rotate(-.45deg); } 71% { transform: rotate(.15deg); } 86% { transform: rotate(-.3deg); } }
  .cowl { position: absolute; left: 0; right: 0; bottom: 0; height: 13%; background: var(--case); }
  /* The perspex front: a little of the light on it. */
  .meter:not(.display) .win::after { content: ""; position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255,255,255,.6) 0 10%, transparent 28%); }
  /* A room's meter: its reading in nixie tubes, behind a dark window. */
  .display .win { display: flex; align-items: center; justify-content: center; gap: 6px; background: #140a06; }
  .display .nixies { --fig: 36px; }
  .display .unit { align-self: flex-end; margin-bottom: 16%; color: #c9b9a6; font-size: 10px; }

  /* Nixie tubes. A tube holds all ten figures, stacked: each sits a little to one side
     of the one behind it (--z is its place in the stack). The unlit ones are faint wire.
     The lit one glows, and those after it in the tube, which are in front of it, cross
     it as fine dark lines. Over them all is the anode, a mesh. */
  .nixies { display: inline-flex; gap: 2px; font-size: var(--fig, 24px); }
  .nix { position: relative; width: .9em; height: 1.45em; overflow: hidden; border: 1px solid rgba(255,255,255,.28); border-radius: .45em .45em .12em .12em;
    background: linear-gradient(90deg, rgba(255,255,255,.2), transparent 25% 75%, rgba(255,255,255,.1)), #140a06; }
  .nix.on { background: radial-gradient(ellipse at 50% 55%, rgba(255,120,30,.3), transparent 72%), linear-gradient(90deg, rgba(255,255,255,.2), transparent 25% 75%, rgba(255,255,255,.1)), #140a06; }
  .nix b { position: absolute; inset: 0; display: grid; place-items: center; color: transparent; font: 200 1em/1 "Helvetica Neue", "Avenir Next", Roboto, sans-serif; -webkit-text-stroke: .35px rgba(178,160,146,.2); transform: translateX(calc((var(--z, 4.5) - 4.5) * .016em)); }
  .nix b.lit { color: #ffb05a; font-weight: 300; -webkit-text-stroke: .5px #ffd9a8; text-shadow: 0 0 .12em #ff7a10, 0 0 .4em #ff5a00; }
  .nix b.lit ~ b { -webkit-text-stroke: .35px rgba(60,24,8,.38); }
  .nix u { position: absolute; right: .1em; bottom: .16em; width: .1em; height: .1em; border-radius: 50%; background: rgba(178,160,146,.3); } .nix u.lit { background: #ffb866; box-shadow: 0 0 .25em #ff6a00; }
  .nix::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(60deg, rgba(0,0,0,.2) 0 .5px, transparent .5px 3.5px), repeating-linear-gradient(-60deg, rgba(0,0,0,.2) 0 .5px, transparent .5px 3.5px); }

  /* Alerts: a neon lamp, and what is wrong on a strip torn from the teleprinter. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 10px 24px; margin-bottom: 14px; padding: 12px 14px; }
  .alert { display: flex; align-items: center; gap: 9px; max-width: 100%; }
  .jewel { flex: none; width: 12px; height: 20px; border-radius: 6px; background: radial-gradient(ellipse at 50% 40%, #ffe2b0, var(--glow) 60%, #7a2a00); box-shadow: 0 0 10px var(--glow); }
  .jewel.nominal { --glow: #4fdc4f; } .jewel.task { --glow: #e9c98a; } .jewel.warning { --glow: #ff9a1e; } .jewel.error, .jewel.critical { --glow: #ff4a1e; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { opacity: .35; } 100% { opacity: 1; } }
  .alert .label { padding: 3px 16px 3px 8px; background: #f2ecd9; color: #222; font: 12px/1.35 "Courier New", Courier, monospace; letter-spacing: .04em; text-shadow: none; transform: rotate(-.4deg);
    clip-path: polygon(0 0, 100% 0, calc(100% - 4px) 25%, 100% 50%, calc(100% - 4px) 75%, 100% 100%, 0 100%); }
  .alert:nth-child(even) .label { transform: rotate(.3deg); }

  /* An instrument knob over its engraved scale: eleven lines round three quarters of a turn. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.heat { min-height: 184px; }
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 6px auto 4px; }
  .dimmer::before { content: ""; position: absolute; inset: 6px; border-radius: 50%; background: repeating-conic-gradient(from 224.5deg, var(--ink) 0 1deg, transparent 1deg 27deg);
    -webkit-mask: radial-gradient(circle, transparent 0 60%, #000 61% 70%, transparent 71%), conic-gradient(from 224deg, #000 0 272deg, transparent 272deg); -webkit-mask-composite: source-in; mask-composite: intersect; }
  /* The knob, in layers. Its skirt and its shadow do not turn, nor does the light on it;
     the fluted grip and the index line on the skirt do. --mid is the grip's coloured middle. */
  .knob { --mid: #4d5459; position: absolute; inset: 15px; border-radius: 50%; cursor: grab; touch-action: none; background: #c9ced2; box-shadow: 0 0 0 1px #555c61, 0 6px 9px rgba(0,0,0,.5); }
  .grip { position: absolute; inset: 0; border-radius: 50%; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s;
    background: radial-gradient(circle, var(--mid) 0 14%, transparent 15%), radial-gradient(circle, transparent 0 56%, #c9ced2 57%), repeating-conic-gradient(#15181a 0 8deg, #3d444a 8deg 16deg); }
  .knob.drag .grip { transition: none; }
  .grip::after { content: ""; position: absolute; left: 50%; top: 2px; width: 2px; height: 14px; margin-left: -1px; background: var(--case); }
  .knob::after { content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none; background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.28), transparent 45%), radial-gradient(circle at 70% 78%, rgba(0,0,0,.3), transparent 55%); }
  .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  /* A blind's knob has a brass middle, the heating's red, a player's ivory and a fan's green. */
  .knob.wind { --mid: #b89238; } .knob.heat { --mid: #b3261b; } .knob.sound { --mid: #e6dfc8; } .knob.air { --mid: #3f7a5a; }
  /* A setting's tubes, in a dark window under the knob's legend. */
  .dial > .nixies { margin-top: 5px; padding: 2px 3px; border-radius: 3px; background: var(--case); }
  .dial > .nixies, .note { display: flex; width: fit-content; margin-left: auto; margin-right: auto; }
  .note { margin-top: 4px; } .note .label { font-size: 8px; letter-spacing: .08em; text-transform: none; }

  /* A lever key under a neon pilot. A button centres what is in it: the key is pinned to
     the top instead, with its legend under it. Down is on. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .key { position: relative; flex: none; }
  .dolly svg { width: 44px; height: 66px; margin-bottom: 4px; }
  .lever { transform-origin: 22px 39px; transition: transform .1s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: scaleY(-1); }
  .pilot { fill: #5a2a10; stroke: var(--case); transition: fill .15s; } .dolly.on .pilot { fill: #ffb070; }
  .glow { fill: #ff7a2a; opacity: 0; transition: opacity .15s; } .dolly.on .glow { opacity: .4; }
  /* A guard over a key that must not be thrown by accident: a red cover, hinged at its
     top and lifted by the first press. Lifted, it takes no presses: in WebKit a cover
     folded small still took them, and the key under it could not be thrown. */
  .cover { position: absolute; left: 5px; right: 5px; top: 19px; bottom: 2px; border-radius: 3px; background: linear-gradient(90deg, rgba(160,15,12,.94), rgba(238,62,50,.88) 40%, rgba(140,10,10,.94)); box-shadow: 0 2px 3px rgba(0,0,0,.5); transform-origin: top; transition: transform .18s; }
  .dolly.up .cover { transform: scaleY(.12); pointer-events: none; }
  .dolly .label { font-size: 8px; letter-spacing: .1em; }
  .dolly.away { cursor: default; } .dolly.away .key { opacity: .5; } .dolly.away .pilot { fill: #222; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--ink); outline-offset: 2px; border-radius: 4px; }

  /* An alarm: how it stands, thumbwheels for its code, and its keys. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; }
  .alarm.sounding > .label { color: #ffd2c8; text-shadow: 0 0 6px #ff3a22; }
  /* Thumbwheels: black wheels with white figures, seen from the front. The figures above
     and below the one in front curve away; a press on a wheel's top half turns it on by
     one and on its bottom half back, and the figures roll to their new places. */
  .wheels { display: flex; gap: 1.5px; padding: 3px; border-radius: 2px; background: #000; box-shadow: 0 0 0 1px #9aa2a7, 0 2px 3px rgba(0,0,0,.5); }
  .wheel { position: relative; width: 20px; height: 62px; overflow: hidden; border-radius: 1.5px; background: linear-gradient(#000, #26282a 28%, #3c3f42 50%, #26282a 72%, #000); color: #f4f1e6; font: 700 15px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: center; }
  .wheel::before, .wheel::after { content: ""; position: absolute; left: 0; right: 0; height: 1px; background: #000; box-shadow: 0 1px 0 rgba(255,255,255,.14); }
  .wheel::before { top: 19px; } .wheel::after { bottom: 20px; }
  .wheel span { position: absolute; left: 0; right: 0; top: 21px; height: 20px; opacity: .45; transform: translateY(calc(var(--n) * 24px)) scaleY(.65); transition: transform .45s cubic-bezier(.45, 0, .3, 1.2); }
  .wheel span.at { opacity: 1; transform: none; }
  .wheel button { position: absolute; left: 0; right: 0; height: 50%; } .wheel button:first-of-type { top: 0; } .wheel button:last-of-type { bottom: 0; }
  .wheel button:focus-visible { outline: 2px solid var(--ink); outline-offset: -2px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .key { display: block; width: 30px; height: 30px; margin: 3px auto 5px; border: 2px solid var(--case); border-radius: 3px; background: linear-gradient(160deg, rgba(255,255,255,.8), rgba(215,222,226,.5)); box-shadow: 0 3px 4px rgba(0,0,0,.5); }
  .push:active .key { transform: translateY(1px); }
  .push .label { font-size: 8px; letter-spacing: .1em; }
  .push:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 3px; }

  /* A camera: a black-and-white tube, its glass bulging at the corners, with its lines.
     The tube's height is set by padding, not an aspect ratio, which grew without end in WebKit. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 8px; overflow: hidden; border-radius: 18% / 22%; background: radial-gradient(#27302b, #0a0d0b); box-shadow: 0 0 0 6px var(--case), 0 5px 8px 5px rgba(0,0,0,.4); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.2) brightness(1.1); }
  .tube::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.28) 0 1px, transparent 1px 3px), radial-gradient(ellipse, rgba(140,170,255,.1) 40%, rgba(0,0,0,.6)); }
  .top > .tv { flex-basis: 170px; margin-top: 0; padding: 18px 10px 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 8px; }

  /* Scenes: large round pushes, lit from behind for a moment when pressed. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 10px; align-items: center; padding: 14px; }
  .knife .key { display: grid; place-items: center; width: 56px; height: 56px; padding: 0 3px; border: 3px solid var(--case); border-radius: 50%; color: #222; font-size: 8px; line-height: 1.1; letter-spacing: .05em; text-transform: uppercase; text-align: center; overflow-wrap: anywhere;
    background: radial-gradient(circle at 35% 30%, #fffdf2, #d2ccb6 70%); box-shadow: 0 0 0 2px #b9bec2, 0 4px 6px rgba(0,0,0,.5); }
  .knife.closed .key { background: radial-gradient(circle at 40% 35%, #fff6c9, #ffb53c 75%); box-shadow: 0 0 0 2px #b9bec2, 0 0 16px #ffad33; }
  .knife:active .key { transform: translateY(1px); }
  .knife:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 4px; }

  /* The recorder: a room's day on an oscilloscope (../scope.ts), on a plate of its own. */
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 0; border-radius: 3px; color: #f3f1e6; text-align: center; font-family: "Gill Sans", "Gill Sans MT", "Helvetica Neue", sans-serif;
    --ink: #f3f1e6; --case: #17191b; background: linear-gradient(175deg, #8ba4b0, #6f8996); box-shadow: 0 20px 40px rgba(0,0,0,.6); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.55); }
  dialog.recorder > .label { font-size: 12px; letter-spacing: .2em; }
  .scope { width: 100%; height: auto; margin: 10px 0 8px; border-radius: 22px; box-shadow: 0 0 0 6px var(--case), inset 0 0 30px #000; }
  .scope text { fill: #7dffc0; font-size: 9px; }
  .scope .lane { text-anchor: end; letter-spacing: .04em; } .scope .hour { font-size: 8px; text-anchor: middle; opacity: .7; }

  @media (prefers-reduced-motion: reduce) { .waver, .jewel.critical { animation: none; } .needle, .grip, .wheel span, .eye i { transition: none; } }
`;
