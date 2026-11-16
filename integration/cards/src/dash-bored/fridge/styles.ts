// The Fridge's look: the door, and how each thing sits on it. Nothing on a fridge is
// straight or clean, so each thing is turned a little (--r, from fridge.ts) and the door
// carries fingerprints and smears. A household (skins.ts) is a class on the door, with its
// own door, handwriting and paper, and its sections are at the end.
// Heights that follow a width are set by padding, not by an aspect ratio: WebKit grew a
// picture in a box with an aspect ratio without end (the Console, 2026-11-15).
import { css } from "lit";

export const STYLES = css`
  .door { --ink: #2b2b2b; --paper: #fdfdf8; --grease: rgba(90, 70, 50, .22); --hand: "Chalkboard SE", "Marker Felt", "Comic Sans MS", "Bradley Hand", cursive;
    position: relative; box-sizing: border-box; min-height: 100%; padding: 16px 26px 34px 76px; overflow: hidden; color: var(--ink); font-family: var(--hand); font-size: 15px;
    background: linear-gradient(90deg, rgba(0,0,0,.1), transparent 3%, transparent 96%, rgba(0,0,0,.12)), linear-gradient(175deg, #fcfcf9, #e7e7e1); }
  .door * { box-sizing: border-box; }
  button { all: unset; cursor: pointer; }
  svg { display: block; overflow: visible; }
  .defs { position: absolute; }
  button:focus-visible, input:focus-visible { outline: 3px solid #2b6cb0; outline-offset: 3px; }
  .who, .urgent, .notes, .board { position: relative; z-index: 1; }

  /* The handle, down the door's opening edge. */
  .handle { position: absolute; left: 24px; top: 150px; width: 22px; height: 380px; border-radius: 11px; background: linear-gradient(90deg, #fafafa, #b9bcc0 45%, #7d8186); box-shadow: 4px 6px 10px rgba(0,0,0,.3); }

  /* What the door has picked up: fingerprints near the handle and where hands go, and each household's own mess. */
  .wear { position: absolute; inset: 0; pointer-events: none; }
  .wear i { position: absolute; display: none; }
  .wear .fingers { display: block; width: 26px; height: 34px; border-radius: 50%; opacity: .6; background: repeating-radial-gradient(ellipse at 50% 62%, var(--grease) 0 1px, transparent 1px 3px); }
  .fingers.a { left: 52px; top: 250px; transform: rotate(22deg); } .fingers.b { left: 62px; top: 286px; transform: rotate(-14deg); }
  .fingers.c { right: 13%; top: 430px; transform: rotate(40deg); } .fingers.d { left: 41%; top: 96px; transform: rotate(-30deg); }

  /* Whose fridge it is: three magnets in the corner, the one in use the biggest. */
  .who { display: flex; justify-content: flex-end; gap: 12px; min-height: 8px; margin-bottom: 4px; }
  .who button { width: 62px; text-align: center; font-size: 10.5px; line-height: 1.1; opacity: .7; transform: rotate(var(--r)) scale(.8); transition: transform .25s, opacity .25s; }
  .who button[aria-checked="true"] { opacity: 1; transform: rotate(0deg) scale(1); }
  .who .novelty { width: 44px; margin: 0 auto 2px; }
  .novelty { filter: drop-shadow(1px 3px 2px rgba(0,0,0,.4)); }

  /* What must never be missed: a lost connection, a refused action. A torn sheet in red marker. */
  .urgent { max-width: 620px; margin: 4px 0 16px; padding: 10px 16px; border-left: 7px solid #d81f26; background: #fff; color: #b3121d; font-weight: 700; font-size: 16px; overflow-wrap: anywhere;
    transform: rotate(-.8deg); box-shadow: 2px 5px 8px rgba(0,0,0,.3); clip-path: polygon(0 0, 100% 0, 99% 30%, 100% 62%, 98.600% 100%, 0 100%); }

  /* Sensor Watch's alerts: sticky notes. Yellow is a task, orange a warning, pink an error, and red is critical and won't keep still. */
  .notes { display: flex; flex-wrap: wrap; gap: 16px 18px; margin: 6px 0 22px; }
  .postit { --lv: #fff48f; width: 172px; min-height: 118px; padding: 16px 12px 10px; border-bottom-right-radius: 34px 7px; font-size: 14.5px; line-height: 1.25; overflow-wrap: anywhere;
    background: linear-gradient(rgba(0,0,0,.07), transparent 16px), var(--lv); transform: rotate(var(--r)); box-shadow: 2px 7px 8px rgba(0,0,0,.24); }
  .postit b { display: block; margin-bottom: 3px; font-size: 15.500px; } .postit small { display: block; margin-top: 5px; opacity: .65; font-size: 12px; }
  .postit.warning { --lv: #ffc56b; } .postit.error { --lv: #ff9db0; } .postit.critical { --lv: #ff6464; animation: flap 1.2s ease-in-out infinite; }
  @keyframes flap { 50% { transform: rotate(calc(var(--r) + 2.500deg)) translateY(-2px); } }

  /* The door's two parts: the rooms, and beside them the notepad and the rest. */
  .board { display: grid; grid-template-columns: minmax(0, 3fr) minmax(210px, 1fr); gap: 28px; align-items: start; }
  .photos { display: flex; flex-wrap: wrap; gap: 30px 14px; align-items: flex-start; }
  /* A floor's name, on a strip of masking tape torn off by hand. */
  .floor { flex: 0 0 100%; margin-bottom: -12px; }
  .floor span { display: inline-block; padding: 3px 22px 4px; background: rgba(232, 219, 170, .92); font-size: 16px; transform: rotate(var(--r)); box-shadow: 0 1px 2px rgba(0,0,0,.2);
    clip-path: polygon(0 12%, 2% 0, 4% 14%, 96% 6%, 98% 0, 100% 16%, 99% 60%, 100% 100%, 97% 88%, 3% 100%, 0 84%, 1.500% 50%); }
  .room { flex: 1 1 200px; max-width: 330px; }

  /* A room's polaroid. Its edges have curled and it has been handled, so its outline is
     not square, it is creased once across, and a corner has gone dark. */
  .snap { position: relative; width: 184px; margin: 16px auto 12px; transform: rotate(var(--r)); filter: drop-shadow(2px 5px 5px rgba(0,0,0,.3)); }
  .polaroid { position: relative; padding: 9px 9px 6px; background: var(--paper);
    clip-path: polygon(.600% 1.200%, 30% 0, 62% .800%, 99.400% .400%, 100% 34%, 99.200% 68%, 99.800% 99%, 66% 100%, 31% 99.200%, .500% 99.600%, 0 61%, .800% 30%); }
  .polaroid::after, .photo::after { content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none;
    background: var(--crease, none), radial-gradient(circle at 100% 100%, rgba(0,0,0,.16), transparent 17%), radial-gradient(circle at 0 0, rgba(0,0,0,.07), transparent 12%); }
  /* No two have been handled alike: one is creased across a corner, one folded once down its length, one bent near an edge, and one is only dog-eared. */
  .worn0 { --crease: linear-gradient(118deg, transparent 46%, rgba(255,255,255,.55) 47%, rgba(0,0,0,.08) 48.500%, transparent 51%); }
  .worn1 { --crease: linear-gradient(72deg, transparent 22%, rgba(255,255,255,.5) 23%, rgba(0,0,0,.07) 24.500%, transparent 27%); }
  .worn2 { --crease: linear-gradient(176deg, transparent 61%, rgba(0,0,0,.07) 62%, rgba(255,255,255,.5) 63.500%, transparent 66%), radial-gradient(circle at 0 100%, rgba(0,0,0,.18), transparent 20%); }
  .worn3 { --crease: radial-gradient(circle at 100% 0, rgba(0,0,0,.2), rgba(255,255,255,.35) 9%, transparent 15%); }
  /* The picture is the room's lights: dark with them off, and warm with any on. */
  .pic { display: block; position: relative; width: 100%; height: 0; padding-top: 72%; overflow: hidden; background: linear-gradient(160deg, #27304d, #121829); transition: background .6s; }
  .pic:disabled { cursor: default; }
  .lit .pic { background: radial-gradient(circle at 60% 30%, #fff4c4, #ffd166 55%, #f2a541); }
  .pic img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(.42) saturate(.6); transition: filter .6s; }
  .lit .pic img { filter: none; }
  /* A room with no picture of its own has a drawn one: a window at night and a standard lamp. */
  .scene { position: absolute; inset: 0; }
  .window { display: block; position: absolute; left: 12%; top: 14%; width: 30%; height: 50%; border: 3px solid rgba(255,255,255,.6);
    background: linear-gradient(90deg, transparent 46%, rgba(255,255,255,.6) 46% 54%, transparent 54%), linear-gradient(transparent 46%, rgba(255,255,255,.6) 46% 54%, transparent 54%), linear-gradient(#1c2545, #0d1226); }
  .lit .window { border-color: rgba(120, 80, 30, .55); background: linear-gradient(90deg, transparent 46%, rgba(120,80,30,.55) 46% 54%, transparent 54%), linear-gradient(transparent 46%, rgba(120,80,30,.55) 46% 54%, transparent 54%), linear-gradient(#35406a, #1a2140); }
  .lamp { display: block; position: absolute; right: 16%; bottom: 0; width: 30%; height: 66%; }
  .lamp::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 42%; background: #8f8a7c; clip-path: polygon(24% 0, 76% 0, 100% 100%, 0 100%); transition: background .6s; }
  .lamp::after { content: ""; position: absolute; left: 50%; top: 42%; bottom: 0; width: 4px; margin-left: -2px; background: #55493a; }
  .lit .lamp::before { background: #fffbe2; filter: drop-shadow(0 0 12px #fff3b0); }
  .cap { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; margin: 6px 2px 2px; font-size: 17px; line-height: 1.15; overflow-wrap: anywhere; }
  .cap small { flex: none; font-size: 14px; opacity: .7; }
  .snap > .novelty { position: absolute; left: 50%; top: -19px; z-index: 3; width: 42px; margin-left: -21px; transform: rotate(calc(var(--r) * -2)); }

  /* Under it, a button magnet for each device. Grey while its device is off, then its own
     colour. A press makes it wobble; one that needs a second press lifts off the door and waits. */
  .magnets { display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 12px 8px; }
  .mag { position: relative; width: 72px; text-align: center; font-size: 12.500px; line-height: 1.15; }
  .press { display: block; width: 50px; margin: 0 auto 3px; transform: rotate(var(--r)); transition: transform .2s, filter .2s; }
  .button { width: 100%; height: auto; } .button .disc { fill: var(--c); }
  .mag:not(.on) .button { filter: grayscale(1) brightness(1.08) contrast(.82); }
  .mag.tapped .press { animation: wobble .5s; }
  @keyframes wobble { 30% { transform: rotate(calc(var(--r) - 14deg)) scale(1.15); } 60% { transform: rotate(calc(var(--r) + 9deg)); } }
  .mag.armed .press { transform: rotate(var(--r)) translateY(-7px) scale(1.14); filter: drop-shadow(0 9px 5px rgba(0,0,0,.35)); }
  .again { position: absolute; left: 50%; top: -24px; z-index: 4; padding: 3px 7px; background: #fff48f; font-size: 11.500px; white-space: nowrap; transform: translateX(-50%) rotate(-4deg); box-shadow: 1px 3px 4px rgba(0,0,0,.3); }
  .name { display: block; overflow-wrap: anywhere; }
  .name small { display: block; font-size: 11px; opacity: .68; } .name .also { font-style: italic; }
  .mag.away .press { opacity: .45; cursor: default; } .mag.away .name { text-decoration: line-through; }
  /* A level is set on a paper strip marked like a ruler, with a small magnet to slide along it. */
  .strip { -webkit-appearance: none; appearance: none; display: block; width: 66px; height: 26px; margin: 1px auto 0; background: transparent; cursor: pointer; }
  .strip::-webkit-slider-runnable-track { height: 8px; border-radius: 1px; background: repeating-linear-gradient(90deg, rgba(0,0,0,.4) 0 1px, transparent 1px 6.600px), var(--paper); box-shadow: 0 1px 2px rgba(0,0,0,.4); }
  .strip::-moz-range-track { height: 8px; border-radius: 1px; background: repeating-linear-gradient(90deg, rgba(0,0,0,.4) 0 1px, transparent 1px 6.600px), var(--paper); box-shadow: 0 1px 2px rgba(0,0,0,.4); }
  .strip::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -4px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), transparent 45%), var(--c); box-shadow: 0 2px 2px rgba(0,0,0,.45); }
  .strip::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: radial-gradient(circle at 35% 30%, rgba(255,255,255,.7), transparent 45%), var(--c); box-shadow: 0 2px 2px rgba(0,0,0,.45); }
  .more { flex: 0 0 100%; text-align: center; font-size: 12px; opacity: .7; }

  /* A camera's picture, printed and stuck up with a novelty magnet. It is dog-eared and
     creased as the polaroids are, and somebody has left a thumb print in its corner. */
  .print { position: relative; width: 132px; margin: 16px 6px 4px; text-align: center; transform: rotate(var(--r)); filter: drop-shadow(2px 4px 4px rgba(0,0,0,.3)); }
  .photo { display: block; position: relative; height: 0; padding-top: 76%; background: var(--paper);
    clip-path: polygon(1% .600%, 38% 0, 99% 1.400%, 100% 44%, 98.800% 99%, 60% 100%, 22% 99%, 0 100%, .800% 52%); }
  .photo img, .blank { position: absolute; left: 6px; top: 6px; width: calc(100% - 12px); height: calc(100% - 12px); object-fit: cover; }
  .blank { display: flex; align-items: center; justify-content: center; background: #20242b; color: #aab; font-size: 11px; }
  .photo::before { content: ""; position: absolute; right: 7%; bottom: 9%; z-index: 3; width: 22px; height: 29px; border-radius: 50%; opacity: .55; transform: rotate(24deg);
    background: repeating-radial-gradient(ellipse at 50% 62%, rgba(255,255,255,.55) 0 1px, transparent 1px 2.600px); }
  .print .novelty { position: absolute; left: 50%; top: -17px; z-index: 4; width: 40px; margin-left: -20px; }
  .tab { display: block; margin-top: 4px; font-size: 12.500px; line-height: 1.15; overflow-wrap: anywhere; } .tab small { display: block; font-size: 11px; opacity: .7; }
  .print.away .tab { text-decoration: line-through; }

  /* An alarm: a note of how it stands, number magnets to press its code out with, and a word magnet for each thing it can be told. */
  .alarm { flex: 0 0 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 6px; }
  .status { padding: 6px 12px; background: #fff48f; font-size: 14px; transform: rotate(var(--r)); box-shadow: 1px 4px 5px rgba(0,0,0,.25); }
  .alarm.sounding .status { background: #ff5a5a; color: #fff; animation: flap .6s ease-in-out infinite; }
  .code { min-width: 128px; padding: 3px 10px; background: var(--paper); font: 700 19px/1.3 ui-monospace, Menlo, monospace; letter-spacing: .28em; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.35); }
  .keys { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 4px; max-width: 200px; }
  .keys button { width: 31px; height: 38px; color: var(--c, #555); font: 900 31px/38px "Arial Rounded MT Bold", "Chalkboard SE", "Helvetica Neue", sans-serif; text-align: center; transform: rotate(var(--r, 0deg));
    text-shadow: 0 2px 0 rgba(0,0,0,.28), 2px 3px 4px rgba(0,0,0,.25); -webkit-text-stroke: 1px rgba(0,0,0,.14); }
  .keys button:active, .poetry button:active, .words button:active { transform: rotate(var(--r, 0deg)) scale(.9); }

  /* Beside the rooms: the notepad on its clip, the word magnets, and whatever else is up. */
  .side { display: flex; flex-direction: column; align-items: center; gap: 28px; }
  .pad { position: relative; width: 100%; max-width: 290px; padding: 46px 16px 14px 26px; border-left: 3px double #e88; font-size: 18px; line-height: 30px;
    background: repeating-linear-gradient(#fffbe0 0 29px, #b9d3ea 29px 30px); transform: rotate(1.500deg); box-shadow: 2px 5px 10px rgba(0,0,0,.25); }
  .pad::before { content: ""; position: absolute; left: 50%; top: -12px; width: 86px; height: 34px; margin-left: -43px; border-radius: 6px; background: linear-gradient(#3d3d3d, #111); box-shadow: 0 3px 5px rgba(0,0,0,.4); }
  .pad h2 { margin: 0; font-size: 22px; line-height: 30px; font-weight: 700; } .pad ul { margin: 0; padding: 0; list-style: none; } .pad li { overflow-wrap: anywhere; }
  .pad .ring { display: none; }
  /* Word magnets. The ones that are scenes have a coloured edge and can be pressed. */
  .poetry, .words { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px 7px; }
  .poetry span, .poetry button, .words button { padding: 5px 9px; background: #fff; color: #111; font: 400 19px/1 Georgia, "Times New Roman", serif; transform: rotate(var(--r)); box-shadow: 1px 3px 4px rgba(0,0,0,.3); }
  .poetry button, .words button { border-bottom: 3px solid #f2a541; }
  .poetry .tapped { animation: hop .5s; }
  @keyframes hop { 40% { transform: rotate(var(--r)) translateY(-7px) scale(1.08); } }
  .extra { position: relative; width: 210px; padding: 28px 14px 12px; background: var(--paper); font-size: 14px; line-height: 1.5; transform: rotate(var(--r)); box-shadow: 2px 5px 8px rgba(0,0,0,.25); }
  .extra b { display: block; margin-bottom: 4px; font-size: 16px; } .extra span { display: block; }
  .extra .novelty { position: absolute; left: 50%; top: -17px; width: 40px; margin-left: -20px; }

  /* --- A young family's fridge: white enamel, felt pen, and a child's reach of mess. --- */
  /* Chocolate spread, put on with a hand and dragged: a thick end, and three fingers' worth of streaks trailing off. */
  .family .smear { display: block; left: 36px; top: 596px; width: 150px; height: 46px; border-radius: 42%; opacity: .9; transform: rotate(-14deg);
    background: radial-gradient(ellipse 34% 62% at 20% 52%, #3b200e 0 52%, rgba(59,32,14,.75) 76%, transparent 100%),
      linear-gradient(90deg, transparent 16%, rgba(74,42,18,.72) 30%, rgba(74,42,18,.26) 74%, transparent 96%) 0 26% / 100% 17% no-repeat,
      linear-gradient(90deg, transparent 18%, rgba(74,42,18,.62) 34%, rgba(74,42,18,.18) 84%, transparent 100%) 0 54% / 100% 15% no-repeat,
      linear-gradient(90deg, transparent 20%, rgba(74,42,18,.5) 36%, rgba(74,42,18,.12) 68%, transparent 88%) 0 80% / 100% 13% no-repeat; }
  .family .dab { display: block; left: 196px; top: 566px; width: 20px; height: 27px; border-radius: 50%; opacity: .8; transform: rotate(18deg);
    background: repeating-radial-gradient(ellipse at 50% 62%, #4a2a12 0 1.400px, rgba(74,42,18,.35) 1.400px 3px); }
  .family .scribble { display: block; left: 10px; top: 720px; width: 58px; height: 150px; border-radius: 58% 42% 66% 34% / 52% 60% 40% 48%; opacity: .5; transform: rotate(-6deg);
    background: repeating-linear-gradient(68deg, transparent 0 5px, #e63946 5px 7.500px), repeating-linear-gradient(-58deg, transparent 0 7px, #457b9d 7px 9px); }
  .family .extra { background: #fff; border: 2px dashed #f4a261; }
  /* And on a photograph or two: a thumb that had been in the chocolate spread. */
  .family .room:nth-of-type(3n + 2) .polaroid::before { content: ""; position: absolute; right: 9px; bottom: 5px; z-index: 3; width: 19px; height: 25px; border-radius: 50%; opacity: .75; transform: rotate(-20deg);
    background: repeating-radial-gradient(ellipse at 50% 62%, #4a2a12 0 1.400px, rgba(74,42,18,.3) 1.400px 3px); }
  .family .extra span { color: #2a9d8f; font-size: 16px; }

  /* --- Corporate yuppies': brushed steel that shows every finger, and everything printed and squared up. --- */
  .yuppies { --ink: #16181b; --paper: #fbfbfb; --grease: rgba(255, 255, 255, .55); --hand: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 13px;
    background: repeating-linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, rgba(0,0,0,.035) 1px 2px, transparent 2px 4px), linear-gradient(100deg, #c6c9cd, #aeb2b7 30%, #d6d9dc 55%, #a3a7ac 80%, #bfc2c6); }
  .yuppies .handle { left: 30px; top: 60px; bottom: 60px; width: 13px; height: auto; border-radius: 3px; background: linear-gradient(90deg, #4a4e54, #17191c 60%, #33363b); }
  .yuppies .wear .fingers { opacity: .8; }
  .yuppies .streak { display: block; left: 18%; top: 70px; width: 58%; height: 300px; background: linear-gradient(113deg, transparent 30%, rgba(255,255,255,.16) 44%, rgba(255,255,255,.05) 56%, transparent 70%); }
  .yuppies .cap { font-size: 11.500px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; } .yuppies .cap small { font-size: 11px; }
  .yuppies .polaroid { padding: 6px 6px 5px; } .yuppies .pic img { filter: grayscale(1) brightness(.42); } .yuppies .lit .pic img { filter: grayscale(.25); }
  .yuppies .snap > .novelty, .yuppies .print .novelty, .yuppies .extra .novelty { width: 32px; margin-left: -16px; top: -13px; }
  .yuppies .mag { width: 86px; font-size: 9px; }
  .yuppies .name { display: inline-block; max-width: 100%; padding: 1px 5px; background: #fff; font-weight: 500; letter-spacing: .03em; text-transform: uppercase; overflow-wrap: break-word; box-shadow: 0 1px 1.500px rgba(0,0,0,.35); }
  .yuppies .name small { font-size: 9px; text-transform: none; letter-spacing: 0; }
  .yuppies .floor span { padding: 3px 12px; background: #fff; font-size: 11px; font-weight: 600; letter-spacing: .2em; text-transform: uppercase; clip-path: none; }
  .yuppies .postit { --lv: #f6c84a; width: 164px; min-height: 100px; padding: 12px 12px 10px; border-top: 8px solid var(--lv); border-bottom-right-radius: 0; background: #fbfbfb; font-size: 12.500px; }
  .yuppies .postit.warning { --lv: #f08a24; } .yuppies .postit.error, .yuppies .postit.critical { --lv: #d81f26; }
  .yuppies .postit b { font-size: 12.500px; letter-spacing: .04em; text-transform: uppercase; }
  .yuppies .pad { padding: 44px 18px 16px; border-left: 0; background: #fbfbfb; font-size: 13.500px; line-height: 26px; transform: rotate(.400deg); }
  .yuppies .pad h2 { font-size: 12px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; border-bottom: 1px solid #16181b; margin-bottom: 4px; }
  .yuppies .pad li::before { content: ""; display: inline-block; width: 9px; height: 9px; margin-right: 9px; border: 1.500px solid #16181b; }
  .yuppies .poetry span, .yuppies .poetry button, .yuppies .words button { background: #1f2328; color: #f4f4f2; font: 500 13px/1 "Helvetica Neue", Helvetica, Arial, sans-serif; letter-spacing: .08em; text-transform: lowercase; padding: 6px 9px; }
  .yuppies .poetry button, .yuppies .words button { border-bottom-color: #c7541e; }
  .yuppies .status, .yuppies .again { background: #fbfbfb; border-top: 5px solid #f6c84a; }
  .yuppies .extra { font-size: 12.500px; } .yuppies .extra b { font-size: 11px; letter-spacing: .24em; border-bottom: 1px solid #16181b; padding-bottom: 3px; }
  .yuppies .keys button { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 700; }

  /* --- Grandparents': a cream enamel door with a chrome pull, joined-up handwriting, and paper that has yellowed. --- */
  .grandparents { --ink: #2a2118; --paper: #f6eedb; --grease: rgba(90, 70, 40, .17); --hand: "Dash-Bored Hand", "Snell Roundhand", "Segoe Script", cursive; font-size: 12px;
    background: linear-gradient(90deg, rgba(0,0,0,.09), transparent 4%, transparent 95%, rgba(0,0,0,.11)), radial-gradient(ellipse at 30% 0, rgba(255,255,255,.5), transparent 55%), linear-gradient(175deg, #f5ecd2, #dfd0a9); }
  .grandparents .handle { top: 170px; width: 26px; height: 190px; border-radius: 13px; background: linear-gradient(90deg, #ffffff, #c9ccd0 40%, #8a8e93 80%, #b9bcc0); box-shadow: 4px 6px 10px rgba(0,0,0,.3), 0 -14px 0 -6px #9a9da2, 0 14px 0 -6px #9a9da2; }
  .grandparents .cap { font-size: 13px; line-height: 1.5; } .grandparents .cap small { font-size: 11px; }
  .grandparents .pic img { filter: sepia(.6) brightness(.45); } .grandparents .lit .pic img { filter: sepia(.45) contrast(.92); }
  .grandparents .photo img { filter: sepia(.35) contrast(.94); }
  .grandparents .mag { width: 86px; font-size: 11px; line-height: 1.6; } .grandparents .name small { font-size: 9.500px; opacity: .75; }
  .grandparents .tab { font-size: 11px; line-height: 1.6; } .grandparents .tab small { font-size: 9.500px; }
  .grandparents .floor span { padding: 2px 18px 5px; border: 1px solid rgba(90,70,40,.5); background: #fbf6e6; font-size: 12px; clip-path: none; }
  /* Notes are on lined paper from a pad, with the level as a coloured margin: no sticky notes in this house. */
  .grandparents .postit { --lv: #d9b23a; width: 178px; padding: 12px 10px 8px 14px; border-left: 6px solid var(--lv); border-bottom-right-radius: 0; font-size: 11.500px; line-height: 22px;
    background: repeating-linear-gradient(#fbf6e6 0 21px, #c5d2e2 21px 22px); }
  .grandparents .postit.warning { --lv: #d07a1e; } .grandparents .postit.error, .grandparents .postit.critical { --lv: #b3272d; }
  .grandparents .postit { width: 196px; } .grandparents .postit b { font-size: 12px; } .grandparents .postit small { font-size: 10px; }
  .grandparents .pad { font-size: 13px; line-height: 30px; background: repeating-linear-gradient(#fbf6e6 0 29px, #c5d2e2 29px 30px); border-left-color: #c98; }
  .grandparents .pad h2 { font-size: 14px; }
  /* Somebody put a cup down on the pad. */
  .grandparents .pad .ring { display: block; position: absolute; right: 10px; bottom: 8px; width: 58px; height: 58px; border-radius: 50%; background: radial-gradient(circle, transparent 55%, rgba(120,80,30,.3) 57% 63%, transparent 66%); }
  .grandparents .poetry span, .grandparents .poetry button, .grandparents .words button { background: #fbf6e6; }
  .grandparents .status, .grandparents .again { background: #fbf6e6; border-left: 5px solid #d9b23a; font-size: 10.500px; }
  .grandparents .urgent { font-size: 12px; }
  /* The card is a postcard: a line down its middle and a place for the stamp. */
  .grandparents .extra { padding: 28px 70px 14px 14px; border: 1px solid rgba(90,70,40,.35); font-size: 10.500px; line-height: 1.9;
    background: linear-gradient(90deg, transparent 66%, rgba(90,70,40,.4) 66% 66.600%, transparent 66.600%), linear-gradient(#f6eedb, #efe3c6); }
  .grandparents .extra b { font-size: 11.500px; }
  .grandparents .extra::after { content: ""; position: absolute; right: 10px; top: 26px; width: 34px; height: 40px; border: 1.500px dashed rgba(90,70,40,.6); }

  @media (max-width: 760px) {
    .door { padding-left: 18px; padding-right: 18px; }
    .handle { display: none; }
    .board { grid-template-columns: minmax(0, 1fr); }
    .who { justify-content: center; }
    /* Two notes to a row on a phone. */
    .notes { gap: 14px 12px; }
    .door .postit { width: calc(50% - 6px); min-height: 96px; }
  }
  @media (prefers-reduced-motion: reduce) { .postit.critical, .alarm.sounding .status, .mag.tapped .press, .poetry .tapped { animation: none; } }
`;
