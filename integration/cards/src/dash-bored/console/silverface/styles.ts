// Silverface's look: brushed aluminium faceplates in a teak cabinet, with black
// screen-printed legends, and how each control in kit.ts moves. The sizes are Bakelite's
// (../balance.ts counts on them): a knob, a switch, a meter and a screen each take the
// room here that they take there.
import { css } from "lit";

export const STYLES = css`
  :host { display: block; }
  :host([panel]) { height: 100vh; overflow-y: auto; }
  .panel { --ink: #141516; --plate: #c9cccf; box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--ink);
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    /* Teak veneer: long grain across the cabinet. */
    background: repeating-linear-gradient(88deg, rgba(0,0,0,.09) 0 2px, transparent 2px 7px, rgba(255,255,255,.04) 7px 9px, transparent 9px 23px), linear-gradient(175deg, #8a5a33, #6b4020 60%, #7a4c28); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; margin: 0 auto; overflow: visible; }
  .defs { position: absolute; }
  /* A legend. On the teak it is a small aluminium plate; on a faceplate it is printed straight on. */
  .label { display: inline-block; max-width: 100%; padding: 3px 8px; border-radius: 2px; background: linear-gradient(#e2e4e6, #b9bcbf); color: var(--ink);
    font-size: 10px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; box-shadow: 0 1px 2px rgba(0,0,0,.5); overflow-wrap: anywhere; }
  .room .label, dialog .label { padding: 2px 4px; background: none; box-shadow: none; }
  /* A device's name is an engraved strip: white laminate with black capitals cut through
     to its core, fixed over the control by whoever fitted the panel. */
  .dial > .label, .dolly > .label, .tv > .label, .alarm > .label, .push > .label, .meter > .label { padding: 2.5px 7px 2px; border-radius: 1px; background: linear-gradient(#fbfaf5, #e9e7de); color: #17181a;
    font-size: 8.5px; font-weight: 600; letter-spacing: .1em; text-shadow: 0 .6px 0 rgba(255,255,255,.9); box-shadow: 0 1px 1.5px rgba(0,0,0,.45), inset 0 0 0 .5px rgba(0,0,0,.3), inset 0 1px 0 #fff; }
  .meter > .label { font-size: 9.5px; }

  .label .word { display: inline-block; white-space: nowrap; }
  .label i { font-style: normal; }

  /* What the house's owner added to the panel after it left the factory is embossed tape
     from a label maker: the names of the floors and rooms, what is wrong with a sensor,
     what a player has on. --tape is the letter's size; everything else follows from it.
     The tape is glossy black vinyl: a bright line along its upper edge where it curves
     over, a band of sheen across it, and a duller lower edge. */
  .floor .label, .room > .label, .alert .label, .note:not(.reading) .label { --tape: 12px; padding: calc(var(--tape) * .42) calc(var(--tape) * .9) calc(var(--tape) * .34) calc(var(--tape) * .7); border-radius: 1px;
    color: #8b9196; font: 500 var(--tape)/1.5 "Avenir Next", "DIN Alternate", "Helvetica Neue", Helvetica, Arial, sans-serif; letter-spacing: 0; text-transform: uppercase; word-spacing: calc(var(--tape) * .5);
    background: linear-gradient(101deg, transparent 0 8%, rgba(255,255,255,.3) 15%, rgba(255,255,255,.07) 23%, transparent 34%, transparent 52%, rgba(255,255,255,.2) 61%, rgba(255,255,255,.05) 70%, transparent 82%),
      linear-gradient(180deg, rgba(255,255,255,.8) 0, rgba(255,255,255,.34) 6%, rgba(255,255,255,.14) 20%, rgba(255,255,255,.02) 42%, transparent 66%, rgba(255,255,255,.12) 86%, rgba(255,255,255,.4) 96%, rgba(0,0,0,.5)), #08090b;
    box-shadow: 0 1.5px 2.5px rgba(0,0,0,.6), 0 0 0 .5px #000;
    clip-path: polygon(0 3%, 100% 0, calc(100% - 1px) 100%, 1px 97%); }
  /* Each letter has the same width, as the embossing wheel gives it, and is struck a little
     off the line. It is raised: lit from the upper left, with its shadow to the lower
     right, and its edges are white where the vinyl has stretched. Round it is the pale
     patch the die leaves. */
  .floor .label i, .room > .label i, .alert .label i, .note:not(.reading) .label i { display: inline-block; width: calc(var(--tape) * .98); text-align: center; transform: translateY(var(--y)) rotate(var(--r));
    background: radial-gradient(ellipse 62% 58% at 50% 52%, rgba(255,255,255,.13), rgba(255,255,255,.05) 55%, transparent 78%);
    /* The stroke is the bright rim of the raised letter, and the fill its greyer face. */
    -webkit-text-stroke: calc(var(--tape) * .055) #cfd3d6; paint-order: stroke fill;
    text-shadow: -.4px -.5px 0 rgba(230,233,235,.85), 1.1px 1.4px 1.1px rgba(0,0,0,.95), 0 0 3px rgba(255,255,255,.28); }
  .floor .label { --tape: 14px; transform: rotate(-.5deg); }
  .room > .label { margin-bottom: 5px; transform: rotate(.6deg); }
  .room:nth-child(even) > .label { transform: rotate(-.7deg); }
  /* A message too long for one strip is cut into a strip for each line. */
  .alert .label { display: inline; line-height: 2.25; clip-path: none; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
  .alert:nth-child(odd) { transform: rotate(.25deg); } .alert:nth-child(even) { transform: rotate(-.3deg); }
  .note:not(.reading) .label { --tape: 9px; transform: rotate(-.8deg); }
  .note.reading .label { font-size: 8px; font-weight: 500; letter-spacing: .08em; text-transform: none; }

  /* What must never be missed: a lost connection, a refused action. A red lamp and a plate. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .06em; text-transform: none; }
  .lamp { flex: none; width: 14px; height: 14px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffd0c8, #ff2a1a 55%, #a30f08); box-shadow: 0 0 0 2px var(--ink), 0 0 10px #ff3a22; }

  .top { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; margin-bottom: 16px; }
  .top .meter { flex: 0 1 190px; }
  .floor { flex: 0 0 100%; margin-top: 6px; }
  .rooms { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  /* A faceplate: brushed aluminium, a socket screw in each corner. */
  .room { flex: var(--wide, 1) 1 calc(var(--wide, 1) * 172px - 12px); max-width: min(100%, calc(var(--wide, 1) * 250px)); padding: 16px 10px 14px; border-radius: 3px; text-align: center;
    background: radial-gradient(circle at 9px 9px, #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px), radial-gradient(circle at calc(100% - 9px) 9px, #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px),
      radial-gradient(circle at 9px calc(100% - 9px), #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px), radial-gradient(circle at calc(100% - 9px) calc(100% - 9px), #2a2c2e 0 1.6px, #8e9296 1.7px 3.6px, transparent 4px),
      repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #dfe1e3, #bfc2c5 55%, #d3d5d7);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7), inset 0 -1px 0 rgba(0,0,0,.3), 0 6px 12px rgba(0,0,0,.45); }
  /* Every control is fixed to the plate. It hangs from the top of its row and keeps the
     same height whatever its lettering says, with room under it for a strip of two lines,
     so a name that grows or a display that changes moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label, .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec { margin-top: 10px; padding: 1px 6px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0,0,0,.45); }
  .rec:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* A room's lights: five red LEDs. */
  .leds { display: flex; justify-content: center; gap: 6px; margin: 0 0 8px; }
  .leds span { width: 9px; height: 9px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #7a2a24, #3a0b08); box-shadow: 0 0 0 1.5px var(--ink); transition: background .4s, box-shadow .4s; }
  .leds .on { background: radial-gradient(circle at 35% 30%, #ffd9d2, #ff2a1a 55%, #a30f08); box-shadow: 0 0 0 1.5px var(--ink), 0 0 8px #ff3a22; }

  /* Panel meters: the window is drawn in kit.ts, the lettering set here. The needle
     wavers as Bakelite's does, each meter at a pace of its own. */
  .meter { text-align: center; }
  .meter svg { width: 100%; height: auto; margin-bottom: 5px; filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); }
  .needle { transform-origin: 60px 74px; transition: transform 1.1s cubic-bezier(.3, 1.7, .5, 1); }
  .waver { transform-origin: 60px 74px; animation: waver 1.2s ease-in-out infinite; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.5deg); } 29% { transform: rotate(-.3deg); } 43% { transform: rotate(.7deg); } 57% { transform: rotate(-.6deg); } 71% { transform: rotate(.2deg); } 86% { transform: rotate(-.4deg); } }
  .meter text { fill: #101614; font-size: 6px; font-weight: 600; text-anchor: middle; }
  .meter .legend { font-size: 4.2px; letter-spacing: .14em; }

  /* The annunciator: Sensor Watch's alerts, a lit window and a plate each. A critical one flashes. */
  .lamps { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-bottom: 16px; }
  .alert { position: relative; max-width: 100%; min-height: 36px; padding: 5px 0 0 98px; }
  .alert .jewel { position: absolute; left: 4px; top: 4px; height: 30px; }
  /* An annunciator window, after a ship's control board: a stepped black bezel standing
     proud of the panel, and recessed in it a milky lens with the level engraved in dark
     capitals. The lamp is behind the lens: brightest in the middle, and the level's
     colour (--glow). The border is the bezel, lighter along its top where the light falls. */
  .jewel { display: flex; flex: none; align-items: center; justify-content: center; width: 74px; padding: 0 3px; border: 5px solid #141516; border-top-color: #2f3134; border-bottom-color: #08090a; border-radius: 4px;
    color: rgba(34, 26, 20, .9); font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; text-shadow: 0 1px 0 rgba(255,255,255,.55);
    background: radial-gradient(ellipse 70% 90% at 50% 45%, rgba(255,255,255,.85), rgba(255,255,255,.25) 60%, rgba(0,0,0,.14)), var(--glow); background-clip: padding-box;
    box-shadow: 0 0 0 1px #000, 0 0 0 2.5px #2b2d30, 0 0 0 3.5px #000, 0 3px 4px 3px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.55), inset 0 3px 5px rgba(0,0,0,.35), 0 0 16px 2px var(--glow); }
  .jewel.task { --glow: #f1ede2; } .jewel.warning { --glow: #ffb326; } .jewel.error, .jewel.critical { --glow: #ff4b36; }
  /* A critical one flashes: between lit and the grey-white of a lens with no lamp behind it. */
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { background: linear-gradient(#d9d6cd, #b9b6ad); background-clip: padding-box; box-shadow: 0 0 0 1px #000, 0 0 0 2.5px #2b2d30, 0 0 0 3.5px #000, 0 3px 4px 3px rgba(0,0,0,.5), inset 0 0 0 1px rgba(0,0,0,.55), inset 0 3px 5px rgba(0,0,0,.35); } }

  /* A machined knob, in layers. Its knurled edge and its line turn with the level; the
     light on its spun face and its shadow stay where they are. --dot is the colour of its
     centre, which says what kind of thing it sets. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 6px auto 4px; }
  .dimmer svg { position: absolute; inset: 0; }
  .knob { --dot: #1b1c1d; position: absolute; inset: 17px; border-radius: 50%; cursor: grab; touch-action: none; box-shadow: 0 8px 10px rgba(0,0,0,.45), 0 2px 3px rgba(0,0,0,.5), 0 0 0 1px rgba(0,0,0,.55); }
  .knob span { position: absolute; border-radius: 50%; }
  .flutes, .mark { inset: 0; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag .flutes, .knob.drag .mark { transition: none; }
  .flutes { background: repeating-conic-gradient(#7f8387 0deg, #eef0f1 2deg, #7f8387 4deg); }
  .knob::before { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle at 30% 24%, rgba(255,255,255,.45), transparent 50%), radial-gradient(circle at 72% 80%, rgba(0,0,0,.4), transparent 58%); }
  /* The face: spun aluminium, which catches the light in wedges. */
  .knob .cap { inset: 11%; z-index: 2; box-shadow: 0 0 0 1px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.8), inset 0 -2px 3px rgba(0,0,0,.35);
    background: conic-gradient(from 25deg, #f4f5f6, #9a9ea2 11%, #e6e8e9 24%, #84888c 38%, #f1f2f3 51%, #9da1a5 63%, #e2e4e6 76%, #868a8e 89%, #f4f5f6); }
  .knob .cap::after { content: ""; position: absolute; inset: 34%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.55), transparent 55%), var(--dot); box-shadow: 0 0 0 1px rgba(0,0,0,.6), inset 0 -1px 2px rgba(0,0,0,.5); }
  .mark { z-index: 3; pointer-events: none; }
  .mark::after { content: ""; position: absolute; left: 50%; top: 5%; width: 3px; height: 30%; margin-left: -1.5px; border-radius: 1px; background: var(--ink); box-shadow: 0 0 0 .5px rgba(255,255,255,.5); }
  .knob:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
  .knob.wind { --dot: #2f6fd0; } .knob.sound { --dot: #e3a21a; } .knob.air { --dot: #2f9a5a; }
  /* The heating's knob is the pointer knob in the middle of its dial: black, with a white
     line that reaches to the scale. The dial's face and hand are drawn in kit.ts. */
  .knob.heat { inset: 29px; }
  .knob.heat .flutes { background: repeating-conic-gradient(#0b0b0b 0deg, #303234 6deg, #0b0b0b 12deg); }
  .knob.heat .cap { inset: 16%; background: radial-gradient(circle at 34% 28%, #55585b, #0e0f10 72%); box-shadow: 0 0 0 1px #000, inset 0 2px 2px rgba(255,255,255,.25), inset 0 -3px 4px rgba(0,0,0,.6); }
  .knob.heat .cap::after { display: none; }
  .knob.heat .mark::after { top: -7px; width: 3.2px; height: 58%; margin-left: -1.6px; background: linear-gradient(#f6f6f3 0 46%, #0e0f10 46%); box-shadow: 0 0 0 .5px rgba(0,0,0,.6); }
  .face { fill: #f8f7f1; } .figures text { font-size: 6.2px; font-weight: 700; text-anchor: middle; }
  .hand { transform-origin: 52px 52px; transition: transform 1.1s cubic-bezier(.3, 1.4, .5, 1); }
  .note { display: block; margin-top: 4px; }
  /* A player's tape has three lines' room kept for it, and anything longer is cut off there. */
  .dial.sound .note { height: 50px; overflow: hidden; }
  /* A setting in red digits, with the glow of the LEDs behind the window. */
  .readout { margin: 3px auto 0; filter: drop-shadow(0 0 2px rgba(255,58,34,.55)); }

  /* Toggle switches: up is on. The lever is drawn up and thrown over for off. */
  /* A button centres what is in it. The drawing is pinned to the top instead, with the strip under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 116px; margin-top: 8px; text-align: center; }
  .dolly.shut, .dolly.up { min-height: 145px; }
  .dolly svg { flex: none; width: 62px; height: auto; margin: 0; filter: drop-shadow(0 3px 3px rgba(0,0,0,.4)); }
  .dolly > .label { font-size: 8px; }
  .onoff { fill: #f4f4f2; font-size: 4.4px; font-weight: 700; letter-spacing: .04em; text-anchor: middle; text-transform: uppercase; }
  .dolly .lever { transform-origin: 29px 46px; transform: scaleY(-1); transition: transform .09s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: none; }
  .dolly .pilot { fill: #4a0d0a; transition: fill .15s; }
  .dolly.on .pilot { fill: #ff3322; filter: drop-shadow(0 0 4px #ff3322); }
  /* The red cover is hinged above the switch, and the first press flips it up. It is
     drawn twice: shut, it folds away towards the hinge, and then the open one unfolds
     above it, which reads as one cover swinging over. */
  .dolly .shell { transform-origin: 29px 4.5px; }
  /* The cover that is folded away takes no presses. Why: WebKit still took a tap on one
     folded to nothing, so a press on the switch under a lifted cover never reached it (2026-11-15). */
  .dolly.up .shut-shell, .dolly.shut .up-shell { pointer-events: none; }
  .dolly .shut-shell { transition: transform .12s ease-in .1s; }
  .dolly.up .shut-shell { transform: scaleY(0); transition-delay: 0s; }
  .dolly .up-shell { transform: scaleY(0); transition: transform .12s ease-in; }
  .dolly.up .up-shell { transform: scaleY(1); transition: transform .14s ease-out .1s; }
  .dolly.away { cursor: default; } .dolly.away svg { opacity: .5; } .dolly.away .pilot { fill: #222; filter: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--ink); outline-offset: 2px; }

  /* An alarm: how it stands, thumbwheels for its code, and keys. The thumbwheels are black
     plastic with white figures, as the switches of the time were. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  /* The alarm's strip is the same size whatever it says, since the thumbwheels are under it. */
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 33px; }
  .alarm.sounding > .label { background: #ff4a35; }
  .wheels { display: flex; gap: 1.5px; padding: 3px; border-radius: 2px; background: #000; box-shadow: 0 0 0 1px #8e9296, 0 2px 3px rgba(0,0,0,.5); }
  /* One module: a window with one white figure, and a push button above it to step it on
     and one below to step it back. The figure rolls past the window when it is stepped. */
  .wheel { position: relative; width: 20px; height: 62px; overflow: hidden; border-radius: 1.5px; background: #17181a; color: #f4f4f2; font: 700 14px/20px "Helvetica Neue", Helvetica, Arial, sans-serif; text-align: center;
    box-shadow: inset 0 0 0 1px #000, inset 0 1px 0 rgba(255,255,255,.14); }
  .wheel::before { content: ""; position: absolute; left: 2px; right: 2px; top: 20px; height: 22px; border-radius: 1px; background: linear-gradient(#000, #101112 60%, #1d1e20); box-shadow: inset 0 2px 3px #000, 0 1px 0 rgba(255,255,255,.12); }
  .wheel span { position: absolute; left: 0; right: 0; top: 21px; height: 20px; transform: translateY(calc(var(--n) * 24px)); transition: transform .35s cubic-bezier(.45, 0, .3, 1.15); }
  .wheel button { position: absolute; left: 2.5px; right: 2.5px; height: 14px; border-radius: 2px; background: linear-gradient(#5b5e62, #2b2d2f); box-shadow: 0 0 0 1px #000, inset 0 1px 0 rgba(255,255,255,.3), 0 1px 1px rgba(0,0,0,.6); }
  .wheel button:first-of-type { top: 3px; } .wheel button:last-of-type { bottom: 3px; }
  .wheel button::after { position: absolute; inset: 0; color: #f4f4f2; font: 700 11px/13px "Helvetica Neue", Helvetica, Arial, sans-serif; }
  .wheel button:first-of-type::after { content: "+"; } .wheel button:last-of-type::after { content: "−"; }
  .wheel button:active { transform: translateY(.5px); background: linear-gradient(#3a3c3f, #1d1e20); }
  .wheel button:focus-visible { outline: 2px solid #f4f4f2; outline-offset: -1px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .key { display: block; width: 30px; height: 22px; margin: 3px auto 5px; border-radius: 3px; background: linear-gradient(#f1f2f3, #a9adb1); box-shadow: 0 0 0 2px var(--ink), inset 0 1px 0 #fff, 0 3px 4px rgba(0,0,0,.5); }
  .push:active .key { transform: translateY(1px); }
  .push > .label { font-size: 7.5px; }
  .push:focus-visible .key { outline: 2px solid var(--ink); outline-offset: 4px; }

  /* A colour television: a camera's picture behind a rounded glass, with its lines. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  /* The screen's height is set from its width by padding, with the picture laid over it.
     Why: with an aspect ratio and a picture as tall as its box, WebKit grew the screen
     without end (2026-11-15), and an old WebView has no aspect ratio at all. */
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 7px; overflow: hidden; border-radius: 13% / 16%; background: radial-gradient(#1c2428, #06090b);
    box-shadow: 0 0 0 4px var(--ink), 0 0 0 5.5px #e6e8ea, 0 5px 8px rgba(0,0,0,.5); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; filter: saturate(1.35) contrast(1.06) sepia(.2) hue-rotate(-8deg) brightness(1.05); }
  .tube::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(125deg, rgba(255,255,255,.22), transparent 30%), repeating-linear-gradient(rgba(0,0,0,.16) 0 1px, transparent 1px 3px), radial-gradient(transparent 60%, rgba(0,0,0,.5));
    box-shadow: inset 0 0 12px #000; }
  .tv > .label { font-size: 8px; }
  .tv:focus-visible .tube { outline: 2px solid var(--ink); outline-offset: 7px; }
  .top .tv { flex-basis: 170px; }

  /* Scenes: a bank of illuminated push buttons, each with its legend on its face. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 8px; align-items: center; padding: 10px 12px; border-radius: 3px; background: var(--ink); box-shadow: inset 0 1px 0 rgba(255,255,255,.2), 0 4px 8px rgba(0,0,0,.45); }
  .knife .key { display: flex; align-items: center; justify-content: center; min-width: 76px; max-width: 130px; min-height: 40px; padding: 4px 8px; border-radius: 3px; color: #3a2a10; text-align: center;
    font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; overflow-wrap: anywhere; background: linear-gradient(#efe6c6, #cdbb85);
    box-shadow: 0 0 0 2px #000, inset 0 1px 0 rgba(255,255,255,.7), inset 0 -3px 0 rgba(0,0,0,.22), 0 3px 4px rgba(0,0,0,.6); transition: background .12s, box-shadow .12s; }
  .knife.closed .key { transform: translateY(1px); background: linear-gradient(#fffbd6, #ffd24a); box-shadow: 0 0 0 2px #000, inset 0 1px 0 #fff, 0 0 16px #ffc93a; }
  .knife:focus-visible .key { outline: 2px solid #f1f1ef; outline-offset: 3px; }

  /* The recorder: an oscilloscope in an aluminium case. */
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 0; border-radius: 4px; color: var(--ink); text-align: center;
    background: repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 3px), linear-gradient(180deg, #dfe1e3, #bfc2c5); box-shadow: 0 20px 40px rgba(0,0,0,.6); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.55); }
  dialog.recorder > .label { font-size: 12px; letter-spacing: .2em; }
  .scope { width: 100%; height: auto; margin: 10px 0 8px; border-radius: 14px; box-shadow: 0 0 0 5px var(--ink), 0 0 0 6px #f1f2f3, inset 0 0 30px #000; }
  .scope text { fill: #7dffc0; font-size: 9px; }
  .scope .lane { text-anchor: end; letter-spacing: .04em; } .scope .hour { font-size: 8px; text-anchor: middle; opacity: .7; }

  /* On a phone an alert's window sits over its tape, which is cut narrower, so that one
     long word (an entity's id) still fits across the screen. */
  @media (max-width: 520px) {
    .alert { padding: 44px 0 0; }
    .alert .label { --tape: 10px; }
  }
  @media (prefers-reduced-motion: reduce) { .waver, .jewel.critical { animation: none; } .needle, .wheel span { transition: none; } }
`;
