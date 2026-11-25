// The big player's own look (big.ts): the player over its artwork, the panel beside or
// over it, and the sheets that ask before something is done.
import { css } from "lit";

export const STYLES = css`
  /* The handle that sets the side panel's width: only where the panel is beside the cover. */
  .side > .grip { display: none; position: absolute; left: -7px; top: 0; bottom: 0; z-index: 3; }
  /* Its own width decides its layout, not the screen's: it may be over the whole screen,
     or in a card of any size. */
  :host { position: fixed; inset: 0; z-index: 1000; container-type: inline-size; font: 14px/1.4 var(--ha-font-family-body, Roboto, system-ui, sans-serif); }
  .big { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr); overflow: clip; background: #111; color: #fff; --muted: rgb(255 255 255 / 66%); --line: rgb(255 255 255 / 14%); --jb-fill: #fff; --jb-glow: #fff; --jb-track: rgb(255 255 255 / 22%); animation: up 0.28s ease-out; }
  /* Clipped, not hidden: a hidden box can still be scrolled (a tap brings its target into
     view), and the light behind the player overflows it on purpose. */
  .big::before { content: ""; position: absolute; inset: -60px; background: var(--pic, conic-gradient(from 200deg at 60% 40%, var(--a), var(--b), var(--a))) center / cover; filter: blur(50px) saturate(1.3); }
  .big::after { content: ""; position: absolute; inset: 0; background: linear-gradient(rgb(0 0 0 / 30%), rgb(0 0 0 / 72%)); }
  /* The one column is no wider than the screen. Left to itself it grows to fit a long
     title, which may not wrap, and the buttons go off the right edge with it. */
  .big > * { position: relative; z-index: 1; min-width: 0; min-height: 0; }
  @keyframes up { from { transform: translateY(40px); opacity: 0; } }
  .now { display: flex; flex-direction: column; gap: 12px; padding: max(12px, env(safe-area-inset-top)) 22px max(14px, env(safe-area-inset-bottom)); }
  .bar { display: flex; align-items: center; gap: 8px; }
  .where { flex: 1; min-width: 0; text-align: center; }
  .pill { display: flex; align-items: center; gap: 5px; flex: none; padding: 8px 12px 8px 9px; border-radius: 999px; background: rgb(255 255 255 / 14%); font-size: 12px; font-weight: 700; }
  .pill svg { width: 16px; height: 16px; }
  .pill.on { background: #fff; color: #111; }
  .where small { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
  .where b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* The artwork is a square that fits the space left for it, whichever way that space is
     the narrower, and the picture is shown whole inside it, never cropped. */
  .cover { flex: 1; min-height: 0; display: grid; place-items: center; container-type: size; }
  /* No bigger than Spotify's covers are, so one of those is never stretched. */
  .cover .art { width: min(100cqw, 100cqh, 640px); border-radius: 18px; box-shadow: 0 20px 50px rgb(0 0 0 / 50%); }
  .cover .art:has(img) { overflow: visible; background: none; box-shadow: none; }
  .cover .art:has(img) i { display: none; }
  .cover .art img { object-fit: contain; border-radius: 18px; filter: drop-shadow(0 16px 30px rgb(0 0 0 / 50%)); }
  .cover .art img.badge { object-fit: cover; border-radius: 50%; filter: none; }
  .title { text-align: center; }
  /* Two lines at most: enough to tell one version of a song from another, and no title
     can squeeze the artwork. */
  .title b { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; font-size: 21px; line-height: 1.2; overflow-wrap: anywhere; text-wrap: balance; }
  .title span { color: var(--muted); }
  .title casa-mia-thumbs { display: flex; justify-content: center; --secondary-text-color: rgb(255 255 255 / 66%); --secondary-background-color: rgb(255 255 255 / 12%); }
  .title .keep { display: inline-flex; margin-top: 8px; }
  /* Not found on Spotify (yet): still pressed, to say why. */
  .title .keep.off { opacity: 0.55; }
  .love { margin: 6px 0 0; font-size: 12.5px; line-height: 1.35; color: #fff; overflow-wrap: anywhere; }
  .love.over { color: var(--muted); }
  .barred { margin: 0; padding: 8px 12px; border-radius: 12px; background: rgb(255 255 255 / 12%); font-size: 13px; text-align: center; }
  .switch { display: flex; align-items: center; gap: 12px; width: 100%; margin: 0 0 14px; padding: 12px 14px; border-radius: 14px; background: rgb(255 255 255 / 8%); text-align: left; }
  .switch span { flex: 1; min-width: 0; }
  .switch small { display: block; color: rgb(255 255 255 / 70%); }
  .switch i { position: relative; flex: none; width: 44px; height: 26px; border-radius: 999px; background: rgb(255 255 255 / 25%); transition: background 0.15s; }
  .switch i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: translate 0.15s; }
  .switch[aria-checked="true"] i { background: #3fae5a; }
  .switch[aria-checked="true"] i::after { translate: 18px; }
  .seek { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
  .live { text-align: center; color: var(--muted); font-size: 12px; font-weight: 700; letter-spacing: 0.1em; }
  .tp { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .tp .ib svg { width: 30px; height: 30px; }
  .tp .ib.sm { position: relative; color: var(--muted); }
  .tp .ib.sm svg { width: 22px; height: 22px; }
  .tp .ib.sm.on { color: #fff; background: rgb(255 255 255 / 22%); }
  .tp sup { position: absolute; top: 4px; right: 6px; font-size: 10px; font-weight: 800; }
  .tp .play { width: 66px; height: 66px; background: #fff; color: #111; }
  .tp .play:hover:not(:disabled) { background: #fff; transform: scale(1.05); }
  .tp .play svg { width: 36px; height: 36px; }
  .gvol { display: flex; align-items: center; gap: 12px; color: var(--muted); }
  .gvol svg { width: 20px; height: 20px; flex: none; }
  .gvol output { flex: none; min-width: 2.8em; text-align: right; font-size: 13px; font-variant-numeric: tabular-nums; }
  .gvol .ib:first-child { margin: 0 -11px; }
  .gvol .own { flex: 1; font-size: 13px; }
  .room .mute { justify-self: center; color: var(--muted); }
  .room .mute svg { width: 20px; height: 20px; }
  .gvol casa-mia-jukebox-slider, .seek casa-mia-jukebox-slider { color: #fff; }
  .tabs { display: flex; gap: 6px; }
  .tabs button { flex: 1; display: grid; justify-items: center; gap: 2px; padding: 8px 4px; border-radius: 12px; font-size: 11px; font-weight: 700; color: var(--muted); }
  .tabs svg { width: 22px; height: 22px; }
  .tabs .up { background: rgb(255 255 255 / 16%); color: #fff; }

  /* The rooms and favourites: a sheet over the player on a phone. */
  .side { position: absolute; inset: 64px 0 0; z-index: 3; display: none; flex-direction: column; border-radius: 22px 22px 0 0; background: rgb(22 20 18); box-shadow: 0 -10px 40px rgb(0 0 0 / 50%); animation: up 0.24s ease-out; }
  .side.up { display: flex; }
  .side .tabs { display: none; padding: 10px 10px 0; }
  .head { display: flex; align-items: center; gap: 8px; padding: 12px 10px 8px 16px; }
  .head b { flex: 1; font-size: 16px; }
  .head small { display: block; color: var(--muted); font-weight: 500; font-size: 12px; }
  .tools { display: flex; gap: 8px; padding: 0 12px 8px; }
  .tools button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 6px; border-radius: 12px; background: rgb(255 255 255 / 10%); font-size: 13px; font-weight: 600; }
  .tools svg { width: 18px; height: 18px; flex: none; }
  .tools .go { background: #fff; color: #111; }
  /* The editor has two lists side by side: only where the screen is wide enough. */
  .tools .wide { display: none; }
  @media (min-width: 900px) { .tools .wide { display: flex; } }
  .fold { display: flex; align-items: center; gap: 4px; width: 100%; min-height: 36px; text-transform: inherit; letter-spacing: inherit; }
  .fold svg { width: 18px; height: 18px; }
  .scroll { flex: 1; min-height: 0; overflow: auto; padding: 0 6px max(16px, env(safe-area-inset-bottom)); }
  .scroll h3 { margin: 16px 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  .empty { padding: 28px 18px; text-align: center; color: var(--muted); overflow-wrap: anywhere; }
  .room { display: grid; grid-template-columns: 44px minmax(0, 1fr) 34px; gap: 4px 12px; align-items: center; padding: 10px; border-radius: 14px; }
  .room.in { margin-bottom: 6px; background: rgb(255 255 255 / 9%); }
  .tick { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--line); color: var(--muted); }
  .room.in .tick { background: #fff; border-color: #fff; color: #111; }
  .room .t b { display: block; }
  .room .t small { color: var(--muted); }
  .room casa-mia-jukebox-slider { grid-column: 2; }
  .room output { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
  .tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 10px; padding: 0 10px; }
  .tiles button { display: grid; gap: 6px; min-width: 0; }
  .tiles b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .veil { position: absolute; inset: 0; z-index: 5; display: grid; place-items: end center; padding: 14px; background: rgb(0 0 0 / 60%); }
  .sheet { width: min(100%, 440px); padding: 18px; border-radius: 22px; background: #26231f; box-shadow: 0 20px 60px rgb(0 0 0 / 60%); animation: up 0.2s ease-out; }
  .sheet h4 { margin: 0 0 2px; font-size: 16px; }
  .sheet p { margin: 0 0 14px; color: rgb(255 255 255 / 70%); overflow-wrap: anywhere; }
  .sheet input { display: block; width: 100%; margin: 0 0 14px; padding: 13px 14px; border: 1px solid var(--line); border-radius: 14px; background: rgb(255 255 255 / 8%); color: #fff; font: inherit; font-size: 16px; }
  .sheet .lost, .undone .failed { color: #ff9a8f; }
  .undone { max-height: 34vh; margin: 0 0 14px; padding: 0; overflow: auto; list-style: none; }
  .undone li { display: flex; gap: 10px; padding: 7px 0; border-top: 1px solid var(--line); font-size: 13px; overflow-wrap: anywhere; }
  .undone time { flex: none; color: var(--muted); font-variant-numeric: tabular-nums; }
  .sheet .warn { margin: 0 0 10px; color: #ff6b5e; font-size: 30px; font-weight: 900; line-height: 1.05; text-transform: uppercase; }
  .acts { display: grid; gap: 8px; }
  .acts button { padding: 14px; border-radius: 14px; background: rgb(255 255 255 / 10%); font-size: 15px; font-weight: 700; text-align: center; }
  .acts button:hover { background: rgb(255 255 255 / 18%); }
  .acts .main { background: #fff; color: #111; }
  .acts .danger { background: none; border: 1px solid #ff6b5e; color: #ff6b5e; }
  .acts .sep { margin-top: 10px; }
  .sheet .or { margin: 16px 0 8px; }
  .over { max-height: 32vh; overflow: auto; }
  .toast { position: absolute; left: 14px; right: 14px; bottom: 18px; z-index: 6; margin: 0 auto; width: fit-content; max-width: calc(100% - 28px); padding: 11px 16px; border-radius: 14px; background: #fff; color: #111; font-weight: 600; overflow-wrap: anywhere; box-shadow: 0 10px 30px rgb(0 0 0 / 45%); opacity: 0; transform: translateY(12px); transition: 0.25s; pointer-events: none; }
  .toast.on { opacity: 1; transform: none; }
  /* Out of the way of a question's buttons. */
  .veil ~ .toast { top: max(18px, env(safe-area-inset-top)); bottom: auto; }

  /* A wide screen (a wall tablet): the rooms and favourites sit beside the player. */
  /* In a dashboard card (the Now playing card): in place, the size the card is given. */
  :host([inline]) { position: relative; inset: auto; z-index: 0; display: block; height: 100%; min-height: 560px; overflow: hidden; border-radius: var(--ha-card-border-radius, 18px); }
  :host([inline]) .big { animation: none; }

  @container (min-width: 900px) {
    .big { grid-template-columns: minmax(0, 1fr) min(var(--side, 460px), 100cqw - 380px); }
    .side > .grip { display: grid; }
    .now { padding: 16px 56px 22px; }
    .now .tabs, .shut { display: none; }
    .side { position: relative; inset: auto; display: flex; border-radius: 0; border-left: 1px solid var(--line); background: rgb(12 11 10 / 46%); backdrop-filter: blur(24px); box-shadow: none; animation: none; }
    .side .tabs { display: flex; }
    .side .tabs .shown { background: rgb(255 255 255 / 16%); color: #fff; }
    .veil { place-items: center; }
  }
`;
