// How Digs looks. Everything is sized in blocks (--b, in px) and texels (--t, a sixteenth
// of a block), and shown unsmoothed. The element sets --b for the screen's height, and --w
// and --h to the world's size in blocks.
import { css } from "lit";

export const STYLES = css`
  .digs { position: relative; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; background: var(--sky); transition: background 1s;
    container-type: inline-size; font-size: 0; user-select: none; -webkit-user-select: none; --t: calc(var(--b) / 16); }
  canvas, button, i, img, .who, .fall, .board, .icon, .orb { image-rendering: pixelated; }
  button { border: 0; padding: 0; margin: 0; background: transparent 0 0 / 100% 100% no-repeat; cursor: pointer; }
  button:hover, button:focus-visible { outline: 3px solid #fff; outline-offset: -3px; }
  img { display: block; height: calc(var(--t) * 6 * var(--k, 1)); width: auto; flex: none; }

  /* The sky is behind the world and stays put when the world is walked along. */
  .sky, .hud { position: absolute; inset: 0; pointer-events: none; }
  .orb { position: absolute; width: calc(var(--b) * 2); height: calc(var(--b) * 2); background: 0 0 / 100% 100% no-repeat; transition: left 1s, top 1s; }
  .cloud { position: absolute; left: calc(var(--b) * -5); width: calc(var(--b) * 3); height: var(--b); background: #fff; opacity: .9;
    box-shadow: var(--b) calc(var(--b) / -2) 0 0 #fff; animation: drift 140s linear infinite; }
  @keyframes drift { to { translate: calc(100vw + var(--b) * 6); } }
  .fall { position: absolute; inset: 0; background-size: var(--b) calc(var(--b) * 2); animation: fall .5s linear infinite; }
  .fall.snow { background-size: var(--b) var(--b); animation-duration: 5s; }
  @keyframes fall { to { background-position: 0 calc(var(--b) * 2); } }

  /* A house wider than the screen is walked along sideways. */
  .scroll { position: relative; overflow-x: auto; overflow-y: hidden; }
  .stage { position: relative; margin: 0 auto; width: calc(var(--b) * var(--w)); height: calc(var(--b) * var(--h)); }
  .stage > canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
  /* A room's card (room.ts): the world cut down to the one room (--rx, --ry, --rw and --rh,
     in blocks: _cut in digs.ts). It has no map, and its level's stack is as tall as the
     card, down its right edge, with the tip and the scenes clear of it. */
  .cut { overflow: hidden; margin: 0 auto; width: calc(var(--b) * var(--rw)); height: calc(var(--b) * var(--rh)); }
  .cut .stage { margin: calc(var(--b) * var(--ry) * -1) 0 0 calc(var(--b) * var(--rx) * -1); }
  .alone .map { display: none; }
  .alone .levels { top: 0; bottom: 0; }
  .alone .levels button { flex: 1; height: auto; }
  .alone .tips { right: var(--b); }
  .alone .hot { left: 0; right: var(--b); translate: none; justify-content: safe center; }
  .dark { pointer-events: none; }
  .at { position: absolute; left: calc(var(--b) * var(--x)); top: calc(var(--b) * var(--y)); width: calc(var(--b) * var(--cw, 1)); height: calc(var(--b) * var(--ch, 1)); }
  .dev { overflow: hidden; }
  .blind { position: absolute; left: 0; top: 0; width: 100%; background-size: var(--b) var(--b); transition: height .4s steps(8); }
  /* A camera's picture: what it last saw, a texel to a texel, over its name. */
  .shot { position: absolute; left: calc(var(--t) * 2); top: calc(var(--t) * 2); width: calc(var(--t) * 44); height: calc(var(--t) * 22); }
  .painting img { position: absolute; left: calc(var(--t) * 3); bottom: calc(var(--t) * 1.5); }
  /* A guarded block cracks at the first hit and gives way at the second. */
  .cracked::after { content: ""; position: absolute; inset: 0; background: var(--crack) 0 0 / 100% 100%; }
  .sounding { animation: sound .5s steps(2) infinite; }
  @keyframes sound { 50% { filter: brightness(2); } }
  .label, .board { display: flex; flex-direction: column; justify-content: center; align-items: center; gap: var(--t); overflow: hidden; }
  .icon, .who, .label:disabled { pointer-events: none; }
  .board, .icon, .who { background: 0 0 / 100% 100% no-repeat; }
  /* A figure walks a straight leg in the time walk.ts gives it (--ms). Its body is a strip
     of seven frames (textures.ts figure): standing, four of a stride, two of a climb. The
     body flips to walk left; the name over it does not. */
  .who { transition: left var(--ms, 0ms) linear, top var(--ms, 0ms) linear; }
  .who::before { content: ""; position: absolute; inset: 0; background: var(--fig) 0 0 / 700% 100% no-repeat; image-rendering: pixelated; }
  .who.left::before { scale: -1 1; }
  .who.walking::before { animation: stride .45s steps(4) infinite; }
  .who.climbing::before { animation: climb .7s steps(2) infinite; }
  /* A toddler's steps are quicker, though it gets less far with each (walk.ts pace). */
  .who.toddler.walking::before { animation-duration: .3s; }
  .who.baby.walking::before { animation-duration: .6s; }
  /* A party hat on a birthday, over the head, with the name over the hat. */
  .who.birthday::after { content: ""; position: absolute; left: 0; width: 100%; top: calc(var(--t) * -7); height: calc(var(--t) * 8); background: var(--hat) 0 0 / 100% 100% no-repeat; image-rendering: pixelated; }
  .who.birthday img { translate: -50% calc(var(--t) * -8); }
  @keyframes stride { from { background-position-x: calc(100% / 6); } to { background-position-x: calc(500% / 6); } }
  @keyframes climb { from { background-position-x: calc(500% / 6); } to { background-position-x: calc(700% / 6); } }
  /* A lit lamp: as bright as it is turned up (--lit), with a pool of light under it. */
  .lamp { overflow: visible; filter: brightness(calc(.5 + .5 * var(--lit))); }
  .lamp::before { content: ""; position: absolute; left: -75%; top: 70%; width: 250%; height: 180%; pointer-events: none;
    background: radial-gradient(ellipse 50% 100% at 50% 0, rgba(255,233,160,.5), transparent); opacity: var(--lit); }
  /* Each kind's pool of light starts under its own lamp: a spotlight's and a strip's at the
     ceiling, a standing lamp's under its shade, which is a third of the way down its two blocks. */
  .lamp.spot::before, .lamp.strip::before { top: 18%; }
  .lamp.strip::before { left: -50%; width: 200%; background: linear-gradient(rgba(255,233,160,.45), transparent); height: 120%; }
  .lamp.standing::before { top: 34%; height: 70%; }
  /* The block that is chosen: a white edge, and its name over it, in the light whatever the hour. */
  .tag, .label.sel { outline: 3px solid #fff; outline-offset: -3px; }
  .tag { pointer-events: none; }
  .tag img { position: absolute; bottom: 100%; left: 50%; translate: -50% calc(var(--t) * -1); background: rgba(0,0,0,.6); padding: var(--t); }
  .who img { position: absolute; bottom: 100%; left: 50%; translate: -50% calc(var(--t) * -1); }

  /* The prank: a show in the world that takes no press. The imp runs, its crate's fuse blinks, the bits fly, the bot comes down. */
  .prank, .prank i { pointer-events: none; }
  .prank i { background: 0 0 / 100% 100% no-repeat; image-rendering: pixelated; }
  .imp { transition: left .8s steps(6); animation: arrive .3s steps(3); }
  .imp.laugh { animation: hop .35s steps(2) infinite; }
  .tnt { transition: top .3s steps(3); }
  .tnt.lit { animation: fuse .3s steps(2) infinite; }
  .bot { transition: left .6s, top .6s; animation: arrive .6s; }
  .bang b { position: absolute; left: 40%; top: 40%; width: calc(var(--t) * 3); height: calc(var(--t) * 3); animation: fly .8s ease-out forwards; }
  .bang { background: radial-gradient(circle, #fff 0 30%, #ffd83a 45%, transparent 70%); animation: burst .5s steps(4) forwards; }
  .shake { animation: shake .4s steps(4); }
  @keyframes arrive { from { translate: 0 calc(var(--b) * -3); opacity: 0; } }
  @keyframes hop { 50% { translate: 0 calc(var(--t) * -4); } }
  @keyframes fuse { 50% { filter: brightness(1.8); } }
  @keyframes burst { from { scale: 1; } 60% { scale: 4; opacity: 1; } to { scale: 4.5; opacity: 0; } }
  @keyframes fly { to { transform: rotate(var(--a)) translateX(calc(var(--b) * 1)) rotate(180deg); opacity: 0; } }
  @keyframes shake { 25% { translate: calc(var(--t) * 2) calc(var(--t) * -1); } 50% { translate: calc(var(--t) * -2) var(--t); } 75% { translate: var(--t) 0; } }
  /* The bars, the clock, the tip and the scenes, over the world and still while it is walked along. */
  .hud > * { position: absolute; }
  .bar { display: flex; gap: var(--t); align-items: center; top: calc(var(--t) * 4); pointer-events: auto; }
  .bar i { width: calc(var(--t) * 7); height: calc(var(--t) * 6); background: 0 0 / 100% 100% no-repeat; }
  .bar.power { right: calc(var(--t) * 4); pointer-events: none; }
  .bar.power i { width: calc(var(--t) * 4); }
  .hearts { left: calc(var(--t) * 4); }
  .row { display: flex; gap: calc(var(--t) * 2); left: 50%; translate: -50%; max-width: 100%; }
  .top { top: calc(var(--t) * 2); }
  .hot { bottom: calc(var(--t) * 3); overflow-x: auto; pointer-events: auto; box-sizing: border-box; padding: 0 calc(var(--t) * 2); }
  .box { display: flex; align-items: center; justify-content: center; flex: none; height: var(--b); padding: 0 calc(var(--t) * 5); background: rgba(0,0,0,.55); box-shadow: inset 0 0 0 var(--t) #8b8b8b; }
  button.box.sel { box-shadow: inset 0 0 0 var(--t) #fff; }
  .tips { bottom: calc(var(--b) + var(--t) * 7); left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: var(--t); }
  .tip img { max-width: 100%; object-fit: contain; }
  .tip { display: flex; align-items: center; max-width: 100%; overflow: hidden; box-sizing: border-box; height: calc(var(--t) * 10); padding: 0 calc(var(--t) * 3); background: rgba(0,0,0,.55); }
  /* A fault is said in plain type, so that however long it is it wraps and can be read. */
  .fault { max-width: 90%; padding: 6px 10px; background: #8a1c1c; color: #fff; font: 14px/1.3 ui-monospace, monospace; overflow-wrap: anywhere; }
  /* The map: the whole world in small, with a frame round what is on the screen. Over the scenes, clear of the top storey's names. */
  .map { position: relative; max-width: 96%; pointer-events: auto; box-shadow: 0 0 0 var(--t) rgba(0,0,0,.55); background-color: var(--sky); }
  .map canvas { display: block; width: calc(var(--w) * 3px); max-width: 100%; }
  .map i { position: absolute; top: 0; bottom: 0; left: var(--from); width: var(--seen); box-shadow: inset 0 0 0 1px #fff; pointer-events: none; }
  /* A room's list: everything in it, by name. */
  .chest { inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: auto; background: rgba(0,0,0,.45); }
  .inv { box-sizing: border-box; width: min(92%, calc(var(--b) * 24)); max-height: 82%; overflow-y: auto; display: flex; flex-direction: column; gap: calc(var(--t) * 3); padding: calc(var(--t) * 4);
    background: rgba(24,24,30,.94); box-shadow: inset 0 0 0 var(--t) #8b8b8b; }
  .head { display: flex; align-items: center; justify-content: space-between; gap: calc(var(--t) * 4); }
  .scenes { display: flex; flex-wrap: wrap; gap: calc(var(--t) * 2); }
  .cells { display: grid; grid-template-columns: repeat(auto-fill, minmax(calc(var(--b) * 7), 1fr)); gap: calc(var(--t) * 3); }
  .cell { display: flex; align-items: center; gap: calc(var(--t) * 2); min-width: 0; }
  .cell .dev { position: relative; flex: none; width: var(--b); height: var(--b); }
  .cell span { display: flex; flex-direction: column; align-items: flex-start; gap: var(--t); min-width: 0; overflow: hidden; }
  .levels { right: 0; bottom: calc(var(--b) * 3); display: flex; flex-direction: column-reverse; pointer-events: auto; background: rgba(0,0,0,.35); }
  .levels button { width: var(--b); height: var(--b); }
  /* Too narrow for the hearts, the clock and the power side by side: one under another. */
  @container (max-width: 760px) {
    .bar.power { right: auto; left: calc(var(--t) * 4); top: calc(var(--t) * 13); }
    .top { top: calc(var(--t) * 22); left: calc(var(--t) * 4); translate: none; }
  }
  @media (prefers-reduced-motion: reduce) { .cloud, .fall, .sounding, .who::before { animation: none; } .who, .blind { transition: none; } }
`;
