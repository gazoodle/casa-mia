// Aurora's look: glass tiles over a sky that warms as the lights come on, after
// docs/design/dash-bored/aurora.html. Three things differ from the mock-up, each for a
// tablet's sake:
// - The sky is soft gradients moved by transform alone, with no blur filter on it.
// - A tile has no backdrop-filter. Nothing but the sky is behind a tile, and the sky is
//   already soft, so blurring it again cost a tablet a pass per tile for nothing that can
//   be seen. Only the sheet, which opens over the tiles, blurs what is behind it.
// - The house is on screens side by side, each filled with tiles (bento.ts), where the
//   mock-up had six rooms on one. A screen never scrolls down, so family.ts's rule that a
//   page is scrolled by the document has nothing to apply to.
import { css, unsafeCSS } from "lit";

/** A spring as an easing curve: it overshoots once and settles. The sheet's own animation uses it too (aurora.ts). */
export const SPRING =
  "linear(0, .009, .035 2.1%, .141 4.4%, .723 12.9%, .938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, .991, .977 51%, .974 53.8%, .975 57.1%, .997 69.8%, 1.003 76.9%, 1.004 83.8%, 1)";

export const STYLES = css`
  .aurora {
    --bg: #e9edf5; --text: #0d1220; --soft: rgba(13,18,32,.6);
    --glass: rgba(255,255,255,.5); --glass-hi: rgba(255,255,255,.85); --rim: rgba(255,255,255,.9);
    --track: rgba(13,18,32,.1); --sky: .8; --sheet: rgba(205,212,226,.94); --bar: rgba(244,246,251,.95);
    --lift: 0 18px 36px -10px rgba(0,0,40,.45), 0 3px 8px rgba(0,0,40,.22); /* what floats over the screens casts this */
    --warm: 0; /* 0 to 1: how much of the house's light is on (glow in words.ts) */
    /* The plain curve is for a browser without linear(): SPRING above replaces it where it can. */
    --spring: cubic-bezier(.34, 1.56, .64, 1);
    position: relative; isolation: isolate; overflow: hidden; box-sizing: border-box;
    font-family: ui-rounded, "SF Pro Rounded", system-ui, sans-serif; color: var(--text); background: var(--bg);
    -webkit-font-smoothing: antialiased;
  }
  .aurora.dark {
    --bg: #07080d; --text: #f4f6fb; --soft: rgba(244,246,251,.62);
    --glass: rgba(255,255,255,.07); --glass-hi: rgba(255,255,255,.16); --rim: rgba(255,255,255,.2);
    --track: rgba(255,255,255,.1); --sky: .5; --sheet: rgba(18,20,30,.92); --bar: rgba(26,29,41,.95);
    --lift: 0 18px 36px -10px rgba(0,0,0,.8), 0 3px 8px rgba(0,0,0,.5);
  }
  @supports (transition-timing-function: linear(0, 1)) {
    .aurora { --spring: ${unsafeCSS(SPRING)}; }
  }
  * { box-sizing: border-box; }
  button { font: inherit; color: inherit; border: 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  :focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }

  /* ---------- the sky ---------- */
  .sky { position: absolute; inset: 0; z-index: -1; overflow: hidden; opacity: var(--sky); pointer-events: none; }
  .sky i { position: absolute; width: 80vmax; height: 80vmax; margin: -22vmax; border-radius: 50%; animation: drift 26s ease-in-out infinite alternate; }
  .sky i:nth-child(1) { background: radial-gradient(closest-side, oklch(.68 .2 calc(265 - var(--warm) * 60) / .75), transparent); left: 0; top: 0; }
  .sky i:nth-child(2) { background: radial-gradient(closest-side, oklch(.74 .19 calc(190 - var(--warm) * 120) / .75), transparent); right: 0; top: 10%; animation-delay: -8s; animation-duration: 32s; }
  .sky i:nth-child(3) { background: radial-gradient(closest-side, oklch(.7 .22 calc(330 + var(--warm) * 50) / .75), transparent); left: 30%; bottom: -10%; animation-delay: -15s; animation-duration: 38s; }
  .sky i:nth-child(4) { background: radial-gradient(closest-side, oklch(.82 .17 85), transparent); right: 12%; bottom: 0; opacity: calc(.1 + var(--warm) * .7); transition: opacity 1.2s; }
  @keyframes drift { to { translate: 12vw 9vh; scale: 1.25; } }

  /* ---------- glass ---------- */
  .glass { position: relative; border-radius: 30px; overflow: hidden; isolation: isolate;
    background: linear-gradient(140deg, var(--glass-hi), var(--glass) 45%); border: 1px solid var(--rim);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -1px 0 rgba(0,0,0,.12), 0 30px 50px -30px rgba(0,0,20,.5); }
  /* A highlight that follows a mouse, so the glass seems to catch the light. A finger has none. */
  @media (hover: hover) {
    .glass::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0; transition: opacity .4s;
      background: radial-gradient(240px circle at var(--mx, 50%) var(--my, 0%), rgba(255,255,255,.34), transparent 70%); }
    .glass:hover::before { opacity: 1; }
  }

  /* ---------- the screens ---------- */
  /* One screen is on show at a time. They stand side by side in a box that the browser
     scrolls sideways and stops on each: no script moves them. */
  .pages { position: absolute; inset: 0; display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; overscroll-behavior-x: contain; scrollbar-width: none; }
  .pages::-webkit-scrollbar { display: none; }
  /* The foot of a screen is left for the bar, so that the tiles fill what can be seen and none is under it. */
  .page { flex: 0 0 100%; height: 100%; scroll-snap-align: start; scroll-snap-stop: always; display: grid; gap: 14px; padding: 18px 18px 88px;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); grid-template-rows: repeat(var(--rows), minmax(0, 1fr)); }
  /* A tile's contents are enlarged with its cell (zoom, in pages.ts): the tile still fills its cells. */
  .page > * { min-width: 0; min-height: 0; margin: 0; zoom: var(--zoom, 1); }
  .label { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); font-weight: 600; }
  .none { color: var(--soft); font-size: 14px; }
  .dim { opacity: .3; }

  .hero { padding: 26px 28px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }
  .hero time { font-size: 15px; color: var(--soft); font-variant-numeric: tabular-nums; }
  .hero h1 { margin: 0; font-size: 52px; line-height: .98; font-weight: 650; letter-spacing: -.035em; }
  .hero p { margin: 0; font-size: 20px; line-height: 1.35; color: var(--soft); max-width: 30ch; text-wrap: balance; }
  .hero p b { color: var(--text); font-weight: 600; }

  .urgent { padding: 14px 20px; border-radius: 22px; border: 1px solid oklch(.7 .2 25); background: var(--bar); font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
  .urgent.over { position: absolute; z-index: 2; top: 14px; left: 50%; translate: -50%; width: max-content; max-width: calc(100% - 28px); box-shadow: var(--lift); }
  .sheet .urgent { margin-bottom: 16px; }

  .alerts { padding: 16px 20px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
  .note { font-size: 14px; line-height: 1.3; overflow-wrap: anywhere; --tone: oklch(.78 .16 85); }
  .note.critical, .note.error { --tone: oklch(.68 .22 25); }
  .note.task { --tone: oklch(.72 .14 240); }
  .note b { display: block; }
  .note b::before { content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; background: var(--tone); box-shadow: 0 0 12px var(--tone); }
  .note small { color: var(--soft); margin-left: 6px; }

  .scenes { display: flex; flex-wrap: wrap; align-content: start; gap: 10px; padding: 12px; overflow-y: auto; }
  .scenes button { flex: 1 1 auto; min-height: 44px; padding: 8px 18px; border-radius: 20px; background: var(--track); font-size: 16px; font-weight: 600;
    transition: scale .5s var(--spring), background .3s; }
  .scenes button:active { scale: .92; }
  .scenes button.thrown { background: var(--text); color: var(--bg); }
  .sheet .scenes { padding: 0 0 18px; overflow: visible; }

  .energy { padding: 16px 20px 0; display: flex; flex-direction: column; }
  .big { font-size: 44px; font-weight: 650; letter-spacing: -.04em; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .big small { font-size: 18px; color: var(--soft); letter-spacing: 0; margin-left: 4px; }
  .energy svg { flex: 1; width: calc(100% + 40px); margin: 0 -20px; min-height: 0; }

  /* The ring is as big as its tile has room for: the tile may be one cell on a phone. */
  .climate { container-type: size; padding: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .ringwrap { position: relative; display: grid; place-items: center; width: min(150px, 100cqw, 100cqh - 34px); }
  .ring { width: 100%; aspect-ratio: 1; border-radius: 50%;
    background: conic-gradient(from 220deg, oklch(.75 .16 230), oklch(.8 .17 60) calc(var(--pct) * 280deg), var(--track) 0 280deg, transparent 0);
    -webkit-mask: radial-gradient(circle, transparent 57%, #000 58%); mask: radial-gradient(circle, transparent 57%, #000 58%); }
  .read { position: absolute; text-align: center; max-width: 70%; }
  .read b { display: block; font-size: 34px; font-weight: 650; letter-spacing: -.04em; }
  .read span { font-size: 12px; color: var(--soft); }
  .steps { display: flex; gap: 10px; margin-top: -14px; z-index: 1; }
  .steps button { width: 44px; height: 44px; border-radius: 50%; background: var(--track); font-size: 22px; transition: scale .5s var(--spring); }
  .steps button:active { scale: .85; }

  /* ---------- rooms, and sets of rooms ---------- */
  .room, .set { padding: 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; text-align: left;
    --lit: 0; --hue: 60; transition: scale .6s var(--spring), opacity .3s; }
  @media (hover: hover) { .room:hover, .set:hover { scale: 1.02; } }
  /* The tile glows from a corner in proportion to the light actually on in it. */
  .room::after, .set::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: var(--lit); transition: opacity .8s;
    background: radial-gradient(120% 90% at 100% 0%, oklch(.86 .17 var(--hue) / .85), transparent 62%); }
  /* The whole tile is pressed to open its sheet; its round buttons sit over that. */
  .room .open { position: absolute; inset: 0; background: none; border-radius: inherit; }
  .head { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
  h2 { margin: 0; font-size: 22px; line-height: 1.15; font-weight: 650; letter-spacing: -.02em; overflow-wrap: anywhere; }
  .temp { font-size: 24px; font-weight: 300; letter-spacing: -.04em; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .w2.h2 .temp { font-size: 40px; line-height: 1; } /* a tile one cell wide has no room for it beside the name */
  .sub { font-size: 14px; color: var(--soft); }
  /* A set's rooms, as many as its tile has room for, each with how many of its lights are on. */
  .set h2, .set .sub, .set .in > span { display: block; }
  .in { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: end; gap: 3px; font-size: 14px; color: var(--soft); }
  .in > span { display: flex !important; justify-content: space-between; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .in .lit { color: var(--text); }
  .in b { flex: none; min-width: 20px; padding: 0 6px; border-radius: 10px; background: #fff; color: #111; font-size: 12px; line-height: 20px; text-align: center; }
  .dots { display: flex; flex-wrap: wrap; gap: 8px; }
  .dot { position: relative; flex: none; width: 44px; height: 44px; border-radius: 50%; background: var(--track); font-size: 14px; font-weight: 600;
    display: grid; place-items: center; transition: scale .5s var(--spring), background .3s, box-shadow .3s; }
  .dot.on, .key.on { background: #fff; color: #111; }
  .dot.lamp.on { box-shadow: 0 0 22px rgba(255,235,170,.9); } /* only a light gives light */
  .dot:active { scale: .8; }
  .away { opacity: .4; }
  /* A device's picture is the Fridge's, drawn in white line (fridge/magnets.ts): here it takes the text's colour. */
  .pic { width: 24px; height: 24px; display: block; }
  .pic [stroke="#fff"] { stroke: currentColor; }
  .pic [fill="#fff"] { fill: currentColor; }

  /* ---------- the way round: the edges and the bar ---------- */
  /* Both float over the screens, and their shadow says so. Neither needs a blur to be read. */
  .edge { position: absolute; top: 50%; translate: 0 -50%; z-index: 1; writing-mode: vertical-rl; max-height: 46%; padding: 16px 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    background: var(--bar); border: 1px solid var(--rim); box-shadow: var(--lift); font-size: 12px; font-weight: 600; letter-spacing: .04em; color: var(--soft); }
  .edge.left { left: 0; border-left: 0; border-radius: 0 14px 14px 0; }
  .edge.right { right: 0; border-right: 0; border-radius: 14px 0 0 14px; }
  .narrow .edge { display: none; } /* a phone's two columns need the width, and it is swiped anyway */
  .bar { position: absolute; z-index: 1; left: 50%; translate: -50%; bottom: 14px; display: flex; align-items: center; gap: 4px; padding: 6px; border-radius: 99px;
    max-width: calc(100% - 28px); overflow-x: auto; scrollbar-width: none; background: var(--bar); border: 1px solid var(--rim); box-shadow: var(--lift); }
  .bar::-webkit-scrollbar { display: none; }
  .bar > button { position: relative; flex: none; height: 44px; padding: 0 16px; border-radius: 99px; background: none; font-size: 15px; font-weight: 600; white-space: nowrap;
    transition: background .3s, color .3s; }
  .bar > button.here { background: var(--text); color: var(--bg); }
  /* A set with several screens has a spot for each under its name. */
  .bar i { position: absolute; left: 0; right: 0; bottom: 5px; display: flex; justify-content: center; gap: 4px; }
  .bar i b { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: .35; }
  .bar i b.on { opacity: 1; }
  .bar .other { padding: 0 12px; }
  .bar .other svg { width: 20px; height: 20px; display: block; }
  .ask { flex: none; display: flex; align-items: center; gap: 6px; height: 44px; padding: 0 8px 0 14px; border-radius: 99px; background: var(--track); }
  .ask input { border: 0; background: none; outline: 0; font: inherit; color: inherit; width: 120px; min-width: 0; }
  .narrow .ask input { width: 70px; }
  .ask input::placeholder { color: var(--soft); }
  .ask kbd { font: inherit; font-size: 12px; color: var(--soft); border: 1px solid var(--rim); border-radius: 8px; padding: 2px 7px; }
  @media (hover: none) { .ask kbd { display: none; } }

  /* ---------- the room's sheet ---------- */
  /* Fixed by name: a dialog that is glass would take the glass's position, and the browser
     then puts it at the top of the document, not of the screen. */
  /* Nearly opaque by itself, so that it can be read in a browser that does not blur what
     is behind it: headless WebKit showed the page straight through a sheet that relied on the blur. */
  .sheet { position: fixed; padding: 30px; width: min(720px, 92vw); max-height: 90vh; overflow-y: auto; color: var(--text); transform-origin: 0 0;
    /* Less of the glass's white than a tile has: on the light theme a fader's white fill and a lit key must stand out from it. */
    background: linear-gradient(140deg, rgba(255,255,255,.22), transparent 45%), var(--sheet);
    backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%); }
  dialog::backdrop { background: rgba(0,0,10,.35); }
  dialog header { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 22px; }
  .sheet h2 { font-size: 40px; letter-spacing: -.03em; }
  .close { background: var(--track); border-radius: 99px; padding: 8px 16px; }
  .controls { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 16px; }
  /* On a tile big enough to hold them (holds in pages.ts): over the tile's own press. */
  .room .controls { position: relative; gap: 12px; align-content: end; } /* its columns are the sheet's, which is what holds counts by */
  /* As tall as on a sheet, unless a tile that holds them says how tall (holds in pages.ts). */
  .fader, .key { height: var(--tall, 250px); border-radius: 30px; background: var(--track); position: relative; overflow: hidden; font-size: 13px; font-weight: 600; text-align: center; }
  .fader { cursor: ns-resize; touch-action: none; user-select: none; -webkit-user-select: none; }
  .fader i { position: absolute; inset: auto 0 0; height: calc(var(--lvl) * 100%); overflow: hidden; background: #fff; color: #111; font-style: normal; transition: height .5s var(--spring); box-shadow: 0 0 18px rgba(255,235,170,.5); }
  .fader.drag i { transition: none; }
  /* The lettering, as tall as the fader and standing on its foot: the copy in the fill is cut off where the fill ends. */
  .face { position: absolute; inset: auto 0 0; height: var(--tall, 250px); pointer-events: none; }
  .face b, .face span { position: absolute; left: 6px; right: 6px; overflow-wrap: anywhere; }
  .face b { top: 16px; display: grid; justify-items: center; gap: 4px; font-size: 15px; }
  .face span { bottom: 14px; }
  .key { width: 100%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 16px 6px 14px; overflow-wrap: anywhere;
    transition: scale .5s var(--spring), background .3s; }
  .key:active { scale: .94; }
  .key em { display: block; font-style: normal; font-weight: 400; opacity: .7; }
  .key .deg { font-size: 26px; font-weight: 650; letter-spacing: -.03em; }
  .key .steps { margin: 0; }
  .key.on .steps button { background: rgba(0,0,0,.1); }
  div.key:active { scale: none; }
  .key.armed { outline: 2px solid oklch(.7 .2 25); outline-offset: -2px; }
  .none { color: var(--soft); }

  .narrow .page { gap: 10px; padding: 12px 12px 84px; }
  .narrow .hero { padding: 18px 20px; }
  .narrow .hero h1 { font-size: 38px; }
  .narrow .hero p { font-size: 17px; }
  .narrow .room, .narrow .set { padding: 12px; }
  .narrow h2 { font-size: 18px; }
  .narrow .dot { width: 40px; height: 40px; }
  .narrow .dots { gap: 6px; }
  .narrow .sheet { padding: 20px; }
  .narrow .sheet h2 { font-size: 30px; }
  @media (prefers-reduced-motion: reduce) { .sky i { animation: none; } * { transition-duration: 0s !important; } }
`;
