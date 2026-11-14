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
  .top .meter { flex: 0 1 200px; }
  .floor { flex: 0 0 100%; margin-top: 6px; }
  .floor .label { font-size: 12px; }
  /* A chassis is one, two or three widths across (balance.ts chooses, and counts on these
     sizes). They wrap and share out a row's spare width, but one alone on a row is not stretched right across. */
  .rooms { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; }
  .room { flex: var(--wide, 1) 1 calc(var(--wide, 1) * 172px - 12px); max-width: min(100%, calc(var(--wide, 1) * 250px));
    background: linear-gradient(170deg, #4a2a1d, var(--bake2)); border-radius: 14px; padding: 10px 10px 14px; text-align: center;
    box-shadow: inset 0 2px 0 rgba(255,255,255,.15), inset 0 -4px 8px rgba(0,0,0,.5), 0 8px 14px rgba(0,0,0,.35); }
  /* A room's meter, knobs and switches share rows where the chassis is wide enough. */
  .works { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 6px; }
  .works > .meter { flex: 0 1 190px; margin-top: 8px; }
  .more { margin-top: 10px; opacity: .7; }
  .more .label { font-size: 8.5px; letter-spacing: .12em; }

  /* Moving-coil meters. */
  .meter { background: linear-gradient(170deg, #2b1811, #120906); border-radius: 12px 12px 40px 40px; padding: 8px 8px 10px; text-align: center;
    box-shadow: inset 0 2px 0 rgba(255,255,255,.14), 0 8px 14px rgba(0,0,0,.4); }
  .meter svg { width: 100%; height: auto; margin-bottom: 6px; }
  .face { fill: #efe6c8; } .scale { fill: none; stroke: #2a1a10; stroke-width: 1.2; }
  /* ponytail: the needle overshoots and settles by its easing alone. The mock-up's needles
     also trembled all the time, which is a frame drawn sixty times a second for ever; if
     that is wanted, give each needle a spring in a requestAnimationFrame loop. */
  .needle { stroke: #151515; stroke-width: 1.6; stroke-linecap: round; transform-origin: 60px 66px; transition: transform 1.1s cubic-bezier(.3, 1.7, .5, 1); }
  .meter text { fill: #2a1a10; font-size: 8px; text-anchor: middle; letter-spacing: .08em; }

  /* Valves: one to a room, glowing with its lights. */
  .valve .heater { opacity: calc(.12 + var(--heat, 0) * .88); transition: opacity 1.4s; }
  .valve .halo { opacity: var(--heat, 0); transition: opacity 1.4s; animation: flicker 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes flicker { 0%, 100% { transform: scale(1); } 40% { transform: scale(1.06); } 43% { transform: scale(.97); } 70% { transform: scale(1.03); } }

  /* The dimmer: a fluted knob over an engraved scale. */
  .dials, .dollies { display: contents; }
  .dial { flex: 0 1 104px; min-width: 0; }
  .dimmer { position: relative; width: 104px; height: 104px; margin: 8px auto 6px; }
  .dimmer svg { position: absolute; inset: 0; }
  .knob { position: absolute; inset: 20px; border-radius: 50%; cursor: ns-resize; touch-action: none;
    background: repeating-conic-gradient(#1a1a1a 0 9deg, #333 9deg 18deg); box-shadow: 0 5px 8px rgba(0,0,0,.6), inset 0 0 0 9px #161616, inset 0 2px 0 9px #444;
    transform: rotate(calc(-135deg + var(--lvl, 0) * 2.7deg)); transition: transform .3s; }
  .knob.drag { transition: none; }
  .knob::after { content: ""; position: absolute; left: 50%; top: -6px; margin-left: -3px; border: 3px solid transparent; border-bottom: 12px solid #f4f0e4; }
  .knob:focus-visible { outline: 2px solid var(--cream); outline-offset: 2px; }

  /* Dolly switches: a stepped round base, a dome with a slot, a lever in the slot. */
  .dolly { width: 92px; margin-top: 10px; text-align: center; }
  .dolly svg { width: 60px; height: 70px; filter: drop-shadow(0 4px 4px rgba(0,0,0,.55)); }
  .dolly .label { font-size: 8px; letter-spacing: .1em; padding: 2px 5px; }
  .dolly .lever { transform-origin: 32px 32px; transition: transform .1s cubic-bezier(.5, 0, 1, .5); }
  .dolly.on .lever { transform: scaleY(-1); }
  .dolly .pilot { fill: #4a1410; transition: fill .15s; }
  .dolly.on .pilot { fill: #ff5a3c; filter: drop-shadow(0 0 4px #ff5a3c); }
  .dolly.away { cursor: default; } .dolly.away svg { opacity: .45; } .dolly.away .pilot { fill: #222; filter: none; } .dolly.away .label { text-decoration: line-through; }
  .dolly:focus-visible svg { outline: 2px solid var(--cream); border-radius: 8px; }

  /* Knife switches: the scenes. */
  .knives { display: flex; flex: 1 1 300px; flex-wrap: wrap; gap: 14px; justify-content: space-around; align-items: flex-end; padding: 12px 18px 10px;
    background: linear-gradient(170deg, #2b1811, #120906); border-radius: 12px; box-shadow: inset 0 2px 0 rgba(255,255,255,.14), 0 8px 14px rgba(0,0,0,.4); }
  .knife { text-align: center; max-width: 130px; }
  .knife svg { width: 130px; height: 84px; margin-bottom: 4px; }
  .blade { transform-origin: 22px 60px; transform: rotate(-52deg); transition: transform .16s cubic-bezier(.5, 0, 1, .6); }
  .knife.closed .blade { transform: rotate(0deg); transition: transform .1s cubic-bezier(.6, 0, 1, 1); }
  .spark { opacity: 0; transform-box: fill-box; transform-origin: center; } .knife.closed .spark { animation: spark .35s ease-out; }
  @keyframes spark { 10% { opacity: 1; } 100% { opacity: 0; transform: scale(2); } }
  .knife:focus-visible { outline: 2px solid var(--cream); outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .valve .halo { animation: none; } .needle { transition: none; } }
`;
