// Bakelite's look: a hammer-finish enamel panel, a Bakelite chassis for each room, and
// how each control in kit.ts moves. Sizes follow the element's own width, since it may be
// a whole page or a card in a column.
import { css } from "lit";

export const STYLES = css`
  :host { display: block; }
  :host([panel]) { height: 100vh; overflow-y: auto; }
  .panel { --cream: #e9dfc3; --bake2: #1c0f0a; --brass: #c9a24b; box-sizing: border-box; min-height: 100%; padding: 18px 22px; color: var(--cream);
    font-family: "Gill Sans", "Gill Sans MT", "Futura", sans-serif;
    /* Hammer-finish enamel: the grey-green of a 1950s instrument panel. */
    background: radial-gradient(rgba(255,255,255,.06) 1px, transparent 1.6px) 0 0 / 5px 5px, linear-gradient(160deg, #7d8d80, #55645a); }
  .panel * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; margin: 0 auto; overflow: visible; }
  .defs { position: absolute; }
  /* Traffolyte: engraved labels, white letters cut through black laminate. */
  .label { display: inline-block; max-width: 100%; background: #111; color: #f4f0e4; font-size: 10.5px; letter-spacing: .2em; text-transform: uppercase;
    padding: 3px 9px; border-radius: 2px; box-shadow: 0 0 0 1px #777, 0 1px 2px #000; overflow-wrap: anywhere; }

  /* What must never be missed: a lost connection, a refused action. A red lamp and a plate. */
  .warn { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .warn .label { font-size: 12px; letter-spacing: .12em; text-transform: none; }
  .lamp { flex: none; width: 16px; height: 16px; border-radius: 50%; background: #ff5a3c; box-shadow: 0 0 0 2px var(--brass), 0 0 10px #ff5a3c; }

  .top { display: flex; flex-wrap: wrap; gap: 18px; align-items: flex-end; margin-bottom: 16px; }
  .top .meter { flex: 0 1 170px; }
  .floor { flex: 0 0 100%; margin-top: 6px; }
  .floor .label { font-size: 12px; }
  /* A chassis is one, two or three widths across (balance.ts chooses, and counts on these
     sizes). They wrap and share out a row's spare width, but one alone on a row is not stretched right across. */
  .rooms { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  .room { flex: var(--wide, 1) 1 calc(var(--wide, 1) * 172px - 12px); max-width: min(100%, calc(var(--wide, 1) * 250px));
    background: linear-gradient(170deg, #4a2a1d, var(--bake2)); border-radius: 14px; padding: 10px 10px 14px; text-align: center;
    box-shadow: inset 0 2px 0 rgba(255,255,255,.15), inset 0 -4px 8px rgba(0,0,0,.5), 0 8px 14px rgba(0,0,0,.35); }
  /* A room's meter, knobs and switches share rows where the chassis is wide enough. Every
     control is fixed to the panel: it hangs from the top of its row and keeps the same
     height whatever its plate says, with room under it for a plate of two lines, so a
     name that grows or a setting that changes moves nothing (owner, 2026-11-15). */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 4px 6px; }
  .works > .meter { flex: 0 1 150px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label { font-size: 8.5px; letter-spacing: .12em; }

  /* Moving-coil meters: the case and face are drawn in kit.ts, the lettering set here. */
  .meter { text-align: center; }
  .meter svg { width: 100%; height: auto; margin-bottom: 6px; filter: drop-shadow(0 6px 8px rgba(0,0,0,.5)); }
  .scale { fill: none; stroke: #2a1a10; stroke-width: .6; }
  /* The needle swings to a new reading and settles by its easing. Inside it, the pointer
     wavers a little all the time, as a moving coil does: it glides between seven places
     in about a second (owner, 2026-11-14: smooth, not in steps). Each meter has a period
     of its own (kit.ts), so they are never in step. The browser draws it; no script runs.
     This is the most a needle wavers in any era: the wobble falls by a quarter with each
     decade, to none in the 1990s (owner, 2026-11-15). */
  .needle { transform-origin: 60px 84px; transition: transform 1.1s cubic-bezier(.3, 1.7, .5, 1); }
  .waver { transform-origin: 60px 84px; animation: waver 1.2s ease-in-out infinite; }
  @keyframes waver { 0% { transform: rotate(0deg); } 14% { transform: rotate(.5deg); } 29% { transform: rotate(-.3deg); } 43% { transform: rotate(.7deg); } 57% { transform: rotate(-.6deg); } 71% { transform: rotate(.2deg); } 86% { transform: rotate(-.4deg); } }
  .meter text { fill: #2a1a10; font-size: 6px; text-anchor: middle; letter-spacing: .04em; }
  .meter .legend { font-size: 5.6px; letter-spacing: .12em; text-transform: uppercase; }
  .meter .unit { font-size: 6.5px; } .meter .small { font-size: 2.6px; letter-spacing: .1em; }

  /* Warning lamps: Sensor Watch's alerts, a pilot lamp and a plate each. The glass takes the
     level's colour; the lamp behind it is the white spot, and the light it throws on the
     panel is the shadow. A critical one flashes, as an annunciator's does. */
  .lamps { display: flex; flex-wrap: wrap; gap: 13px 16px; margin-bottom: 18px; }
  .alert { display: flex; align-items: center; gap: 8px; max-width: 100%; }
  /* What is wrong is written by hand, in India ink on thick card, and slid into a brass
     card holder: a bevelled frame with an ear and a screw at each end. No two cards sit
     quite square. */
  .alert .label { position: relative; margin: 0 17px; padding: 5px 14px 3px; border: 5px solid; border-image: linear-gradient(160deg, #f6e3a0, #b8923c 35%, #7a5c1e 60%, #e2c070) 1; border-radius: 0;
    background: var(--blots, none), linear-gradient(175deg, #f7efd9, #e9dcba); color: #17110a; text-shadow: 0 0 .7px rgba(23,17,10,.75), var(--smear, 0 0 0 transparent); font: 400 14px/1.55 "Dash-Bored Hand", "Snell Roundhand", "Segoe Script", "Lucida Handwriting", cursive; letter-spacing: 0; text-transform: none;
    box-shadow: inset 0 2px 3px rgba(0,0,0,.45), inset 0 0 0 1px rgba(60,40,5,.5), 0 2px 3px rgba(0,0,0,.6); }
  .alert .label::before, .alert .label::after { content: ""; position: absolute; top: 50%; width: 17px; height: 24px; margin-top: -12px;
    background: radial-gradient(circle at var(--screw) 50%, #20140a 0 2.3px, #6b5018 2.4px 3.2px, transparent 3.4px), linear-gradient(160deg, #f1d98d, #b08a35 50%, #7a5c1e); box-shadow: 0 2px 3px rgba(0,0,0,.6); }
  .alert .label::before { --screw: 7px; left: -22px; border-radius: 12px 0 0 12px; }
  .alert .label::after { --screw: 10px; right: -22px; border-radius: 0 12px 12px 0; }
  .alert:nth-child(3n + 1) .label { transform: rotate(-.35deg); } .alert:nth-child(3n + 2) .label { transform: rotate(.3deg); }
  /* Nobody wrote them that neatly. The ink has bled a little into the card everywhere;
     here and there is a blot where the nib was rested, a faint smear where a hand went
     over wet ink, and a line of writing dragged a little to the right. Three cards in
     four have something, each a different thing. */
  .alert:nth-child(4n + 1) .label { --blots: radial-gradient(ellipse 4px 3px at 86% 72%, rgba(23,17,10,.5), rgba(23,17,10,.12) 70%, transparent), radial-gradient(ellipse 30px 5px at 34% 78%, rgba(23,17,10,.09), transparent 75%); }
  .alert:nth-child(4n + 2) .label { --smear: 2px .6px 2.5px rgba(23,17,10,.2); --blots: radial-gradient(ellipse 9px 7px at 12% 30%, rgba(23,17,10,.07), transparent 80%); }
  .alert:nth-child(4n + 3) .label { --blots: radial-gradient(ellipse 2.5px 2.5px at 58% 22%, rgba(23,17,10,.45), transparent), radial-gradient(ellipse 1.5px 1.5px at 60% 34%, rgba(23,17,10,.4), transparent), radial-gradient(ellipse 40px 6px at 70% 66%, rgba(23,17,10,.08), transparent 75%); }
  .jewel { flex: none; margin: 0; filter: drop-shadow(0 0 4px var(--glow)) drop-shadow(0 0 14px var(--glow)); }
  .jewel .glass { fill: var(--glow); }
  .jewel.task { --glow: #efe7cc; } .jewel.warning { --glow: #ff9d14; } .jewel.error, .jewel.critical { --glow: #ff3b1f; }
  .jewel.critical { animation: flash 1s steps(2, jump-none) infinite; }
  @keyframes flash { 0% { filter: none; opacity: .45; } 100% { opacity: 1; } }

  /* Valves: one to a room, glowing with its lights. */
  .valve .heater { opacity: calc(.12 + var(--heat, 0) * .88); transition: opacity 1.4s; }
  .valve .halo { opacity: var(--heat, 0); transition: opacity 1.4s; animation: flicker 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes flicker { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.06); } 43% { transform: scale(.97); } 70% { transform: scale(1.03); } }

  /* The dimmer: a fluted knob over an engraved scale. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; min-height: 152px; }
  .dial.heat { min-height: 174px; }
  /* A player's note has three lines' room kept for it, and anything longer is cut off there. */
  .dial.sound .note { height: 42px; overflow: hidden; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 8px auto 6px; }
  .dimmer svg { position: absolute; inset: 0; }
  /* A fluted Bakelite knob, in layers. The flutes and the pointer turn with the level. The
     light does not: the shading over the flutes, the cap's highlight and the shadow on the
     panel stay where they are, as they would on a real knob lit from the upper left.
     --k1 to --k3 are the flutes from their shadow to their shine; --c1 and --c2 the cap. */
  .knob { --k1: #0b0b0b; --k2: #262626; --k3: #4d4d4d; --c1: #5c5c5c; --c2: #151515; --ring: #8f8f86; --line: #f4f0e4;
    position: absolute; inset: 14px; border-radius: 50%; cursor: grab; touch-action: none;
    box-shadow: 0 9px 12px rgba(0,0,0,.6), 0 3px 3px rgba(0,0,0,.55), 0 0 0 1.5px rgba(0,0,0,.6); }
  .knob span { position: absolute; border-radius: 50%; }
  .flutes, .mark { inset: 0; transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag .flutes, .knob.drag .mark { transition: none; }
  .flutes { background: repeating-conic-gradient(var(--k1) 0deg, var(--k2) 5deg, var(--k3) 9deg, var(--k2) 12deg, var(--k1) 15deg); }
  /* The light on the flutes: bright at the upper left, dark at the lower right, and a darker edge all round. */
  .knob::before { content: ""; position: absolute; inset: 0; z-index: 1; border-radius: 50%; pointer-events: none;
    background: radial-gradient(circle at 30% 24%, rgba(255,255,255,.3), transparent 46%), radial-gradient(circle at 72% 80%, rgba(0,0,0,.55), transparent 58%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.1), inset 0 -3px 6px rgba(0,0,0,.55), inset 0 2px 3px rgba(255,255,255,.18); }
  /* The cap: a shallow dome inside a metal ring. Named with its knob: a push button has a cap too. */
  .knob .cap { inset: 23%; z-index: 2; background: radial-gradient(circle at 34% 28%, var(--c1), var(--c2) 72%);
    box-shadow: 0 0 0 1.5px rgba(0,0,0,.7), 0 0 0 3px var(--ring), 0 0 0 4px rgba(0,0,0,.55), 0 3px 5px 4px rgba(0,0,0,.45), inset 0 2px 2px rgba(255,255,255,.3), inset 0 -3px 4px rgba(0,0,0,.5); }
  .knob .cap::after { content: ""; position: absolute; left: 18%; top: 12%; width: 34%; height: 20%; border-radius: 50%; background: rgba(255,255,255,.3); transform: rotate(-32deg); filter: blur(1.5px); }
  /* The pointer: a white line let into the knob, from the cap to the rim. */
  .mark { z-index: 3; pointer-events: none; }
  .mark::after { content: ""; position: absolute; left: 50%; top: 3%; width: 3.4px; height: 25%; margin-left: -1.7px; border-radius: 1.5px;
    background: var(--line); box-shadow: 0 0 0 .6px rgba(0,0,0,.6), inset 0 -1px 1px rgba(0,0,0,.25); }
  .knob:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  .note { display: block; margin-top: 4px; } .note .label { font-size: 8px; letter-spacing: .08em; text-transform: none; }
  /* A blind's winder is brass, the heating's knob oxblood, a player's ivory and a fan's grey-green. */
  .knob.wind { --k1: #4d370c; --k2: #a8832f; --k3: #f3dc94; --c1: #f8e7ae; --c2: #7d5e1c; --ring: #5a4210; --line: #2a1a05; }
  .knob.heat { --k1: #230504; --k2: #651711; --k3: #b54a3f; --c1: #b0483d; --c2: #330907; }
  .knob.sound { --k1: #776f5a; --k2: #cbc1a2; --k3: #fffbe8; --c1: #fffaea; --c2: #a1977a; --ring: #6f6853; --line: #1c0f0a; }
  .knob.air { --k1: #121a16; --k2: #3b4e43; --k3: #7f9d8b; --c1: #86a391; --c2: #1b2620; }

  /* Dolly switches: a stepped round base, a dome with a slot, a lever in the slot. */
  /* A button centres what is in it. The switch is pinned to the top instead, with its plate under it. */
  .dolly { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; width: 92px; min-height: 100px; margin-top: 10px; text-align: center; }
  .dolly svg { flex: none; width: 60px; height: 70px; margin: 0 0 3px; filter: drop-shadow(0 4px 4px rgba(0,0,0,.55)); }
  .dolly .label { font-size: 8px; letter-spacing: .1em; padding: 2px 5px; }
  .dolly .lever { transform-origin: 32px 32px; transition: transform .1s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: scaleY(-1); }
  .dolly .pilot { fill: #4a1410; transition: fill .15s; }
  .dolly.on .pilot { fill: #ff5a3c; filter: drop-shadow(0 0 4px #ff5a3c); }
  /* A guard over a switch that must not be thrown by accident: hinged at its top, and lifted by the first press. */
  .dolly .guard { transform-origin: 32px 4px; transition: transform .18s; }
  .dolly.up .guard { transform: scaleY(.1); }
  .dolly.away { cursor: default; } .dolly.away svg { opacity: .45; } .dolly.away .pilot { fill: #222; filter: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--cream); border-radius: 8px; }

  /* An alarm: a plate saying how it stands, thumbwheels for its code, and push buttons. */
  .alarm { flex: 0 1 140px; display: flex; flex-direction: column; align-items: center; gap: 7px; margin-top: 10px; }
  /* The alarm's plate is the same size whatever it says, since the thumbwheels are under it. */
  .alarm > .label { display: flex; align-items: center; justify-content: center; width: 132px; min-height: 34px; }
  .alarm.sounding > .label { background: #c8281e; }
  /* Thumbwheels: brass barrels seen from the front. The shading makes the barrel round,
     and the digits above and below are squashed as they curve away. */
  .wheels { display: flex; gap: 3px; padding: 5px; background: #0b0605; border-radius: 5px; box-shadow: inset 0 0 0 1px #000, 0 1px 0 rgba(255,255,255,.12); }
  .wheel { position: relative; width: 19px; height: 62px; overflow: hidden; border-radius: 4px; color: var(--bake2); font: bold 17px/18px "Gill Sans", "Gill Sans MT", sans-serif; text-align: center;
    background: linear-gradient(#2e2006, #8a6a22 10%, #c9a24b 24%, #f3dc9a 44%, #f8e9b8 52%, #c9a24b 76%, #7a5c1e 90%, #2e2006);
    box-shadow: inset 0 0 0 1px #2a1c05, 0 2px 3px rgba(0,0,0,.6); }
  /* The grooves either side of the front face. */
  .wheel::before, .wheel::after { content: ""; position: absolute; left: 0; right: 0; height: 1px; background: rgba(60,40,5,.65); box-shadow: 0 1px 0 rgba(255,255,255,.45); }
  .wheel::before { top: 16px; } .wheel::after { bottom: 17px; }
  /* The digits are engraved: dark in the cut, with a bright edge below where the light
     catches it. They roll to their new places when a wheel is turned, a little past and back. */
  .wheel span { position: absolute; left: 0; right: 0; top: 22px; height: 18px; color: rgba(46, 28, 4, .88); transform: translateY(calc(var(--n) * 27px + var(--off))) scaleY(.6);
    text-shadow: 0 1px 0 rgba(255, 246, 205, .85), 0 -.6px 0 rgba(0, 0, 0, .45); transition: transform .6s cubic-bezier(.45, 0, .3, 1.25); }
  .wheel span.at { transform: translateY(var(--off)); }
  .wheel span:not(.at) { opacity: .7; }
  .wheel button { position: absolute; left: 0; right: 0; height: 50%; } .wheel button:first-of-type { top: 0; } .wheel button:last-of-type { bottom: 0; }
  .wheel button:focus-visible { outline: 2px solid var(--cream); outline-offset: -2px; }
  .pushes { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
  .push { text-align: center; }
  .push .cap { display: block; width: 28px; height: 28px; margin: 4px auto 6px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #b8433a, #4a0f0a);
    box-shadow: 0 0 0 3px var(--bake2), 0 0 0 4px var(--brass), 0 3px 4px rgba(0,0,0,.6); }
  .push:active .cap { transform: translateY(1px); }
  .push .label { font-size: 8px; letter-spacing: .1em; padding: 2px 5px; }
  .push:focus-visible .cap { outline: 2px solid var(--cream); outline-offset: 4px; }

  /* A television screen: a camera's picture in black and white, behind a curved glass
     with its lines and a reflection. The surround is Bakelite with a brass trim. */
  .tv { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; flex: 0 1 150px; min-height: 146px; margin-top: 10px; text-align: center; }
  /* The screen's height is set from its width by padding, with the picture laid over it:
     an aspect ratio with a picture as tall as its box grows without end in WebKit. */
  .tube { display: block; position: relative; flex: none; align-self: stretch; height: 0; padding-top: calc((100% - 12px) * .75); margin: 0 6px 8px; overflow: hidden; border-radius: 22% / 26%; background: radial-gradient(#27302b, #0a0d0b);
    box-shadow: 0 0 0 5px #1c0f0a, 0 0 0 6px var(--brass), 0 6px 10px rgba(0,0,0,.6); }
  .tube img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; filter: grayscale(1) contrast(1.15) brightness(1.05) sepia(.14); }
  .tube::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(125deg, rgba(255,255,255,.2), transparent 32%), repeating-linear-gradient(rgba(0,0,0,.2) 0 1px, transparent 1px 3px), radial-gradient(transparent 55%, rgba(0,0,0,.6));
    box-shadow: inset 0 0 14px #000; }
  .tv .label { font-size: 8.5px; letter-spacing: .1em; padding: 2px 6px; }
  .tv:focus-visible .tube { outline: 2px solid var(--cream); outline-offset: 7px; }
  .top .tv { flex-basis: 170px; }

  /* The chart recorder: a strip of sepia paper in a Bakelite case. */
  .rec { margin-top: 10px; opacity: .85; } .rec .label { font-size: 8.5px; letter-spacing: .12em; }
  .rec:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  dialog.recorder { width: min(760px, 94vw); padding: 14px; border: 0; border-radius: 14px; color: var(--cream); text-align: center;
    background: linear-gradient(170deg, #4a2a1d, #1c0f0a); box-shadow: inset 0 2px 0 rgba(255,255,255,.15), 0 20px 40px rgba(0,0,0,.6); }
  dialog.recorder::backdrop { background: rgba(0,0,0,.55); }
  .paper { width: 100%; height: auto; margin: 10px 0 6px; border-radius: 3px; box-shadow: inset 0 0 0 1px #7a5a2c, 0 2px 6px rgba(0,0,0,.6); }
  .paper text { fill: #5a3d16; }
  .paper .lane { font-size: 9px; text-anchor: end; letter-spacing: .04em; } .paper .hour { font-size: 8px; text-anchor: middle; }

  /* Knife switches: the scenes. */
  /* An open blade stands well above its own switch: a second row of them is set that far below the first. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 46px 14px; justify-content: space-around; align-items: flex-end; padding: 38px 18px 10px;
    background: linear-gradient(170deg, #2b1811, #120906); border-radius: 12px; box-shadow: inset 0 2px 0 rgba(255,255,255,.14), 0 8px 14px rgba(0,0,0,.4); }
  .knife { text-align: center; max-width: 130px; }
  .knife svg { width: 130px; height: 84px; margin-bottom: 4px; }
  .blade { transform-origin: 22px 60px; transform: rotate(-52deg); transition: transform .16s cubic-bezier(.5, 0, 1, .6); }
  .knife.closed .blade { transform: rotate(0deg); transition: transform .1s cubic-bezier(.6, 0, 1, 1); }
  .spark { opacity: 0; transform-box: fill-box; transform-origin: center; } .knife.closed .spark { animation: spark .35s ease-out; }
  @keyframes spark { 10% { opacity: 1; } 100% { opacity: 0; transform: scale(2); } }
  .knife:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .valve .halo, .waver, .jewel.critical { animation: none; } .needle { transition: none; } }
`;
