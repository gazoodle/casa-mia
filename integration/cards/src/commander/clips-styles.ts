// The Camera Commander card's clips dialog's look (clips-dialog.ts): its size, its two
// layouts (the list beside the preview on a wide landscape screen, else above it), the
// tiles and the rows. Sizes are fixed CSS px; the dialog's own is the screen less a
// margin, up to a cap, and the preview's is the camera's shape (--shape, set by the card).
import { css } from "lit";

export const clipsStyles = css`
  /* The room: the screen less a margin, up to a cap, and that size from the moment it
     opens, so it never grows as days come. The cap is the same both ways, so a portrait
     tablet is filled as a landscape one is. The screen is the part clear of an iPhone's
     status bar, home bar and notch: the iOS app's page runs under them, and a dialog from
     the screen's top put its header (Close, the kinds) under the clock (2026.11.14-b35).
     dvh where the browser has it. In landscape its height is the preview's (below). */
  dialog {
    --top: env(safe-area-inset-top, 0px);
    --bottom: env(safe-area-inset-bottom, 0px);
    --left: env(safe-area-inset-left, 0px);
    --right: env(safe-area-inset-right, 0px);
    --screen-h: 100vh;
    --room-w: min(1280px, calc(100vw - 32px - var(--left) - var(--right)));
    --room-h: min(1280px, calc(var(--screen-h) - 32px - var(--top) - var(--bottom)));
    /* The body's padding and gap, and the list's width beside the preview. */
    --pad: 16px;
    --gap: 12px;
    --list: 412px;
    inset: var(--top) var(--right) var(--bottom) var(--left);
    width: var(--room-w);
    height: var(--room-h);
    max-width: none;
    max-height: none;
    padding: 0;
    border: none;
    border-radius: 16px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
    font: 14px / 1.4 var(--ha-font-family-body, Roboto, sans-serif);
  }
  @supports (height: 100dvh) {
    dialog {
      --screen-h: 100dvh;
    }
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  /* Portrait, or narrow: the preview above the list. */
  .body {
    display: grid;
    grid-template: "head" auto "preview" auto "list" minmax(0, 1fr) / minmax(0, 1fr);
    gap: var(--gap);
    box-sizing: border-box;
    height: 100%;
    padding: var(--pad);
  }
  header {
    grid-area: head;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    --mdc-icon-size: 16px;
  }
  h2 {
    flex: 1;
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
  nav {
    display: flex;
    flex: 1 0 100%;
    flex-wrap: wrap;
    gap: 6px;
  }
  .preview,
  .lost {
    grid-area: preview;
  }
  .preview {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
  }
  /* The camera's own shape, so its picture fills the box with no black bands round it; no
     taller than 480px above the list, narrower instead, and centred. One cell, the box's
     own size: the picture fitted in it and Play centred over it (a cell sized by the
     picture put Play below the box's edge on a portrait tablet). */
  .stage {
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    place-items: center;
    align-self: center;
    box-sizing: border-box;
    width: min(100%, 480px * var(--shape));
    aspect-ratio: var(--shape);
    border-radius: 8px;
    background: #000;
    overflow: hidden;
  }
  .stage > * {
    grid-area: 1 / 1;
  }
  .stage .note {
    color: #bbb;
  }
  .big {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .big.none {
    display: grid;
    place-items: center;
    color: #bbb;
    --mdc-icon-size: 64px;
  }
  .play {
    padding: 6px 14px;
    font-size: 12px;
    --mdc-icon-size: 18px;
  }
  .said {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .said .what {
    font-weight: 500;
  }
  /* Landscape, wide enough: the list on the left, the preview on the right at the column's
     width, anchored to its top. The dialog is as tall as that preview, at the camera's
     shape, with 150px for the header, the lines under the picture and the padding; up to
     the room. At the room's height a big monitor showed the picture between tall black
     bands (owner, 2026-11-27); a height taken from its contents instead (b33) left it one
     header high on a Mac. On a screen too short for it, or under a header on two lines,
     the box is shorter and the picture fitted in it. */
  @media (orientation: landscape) and (min-width: 700px) {
    dialog {
      height: min(
        var(--room-h),
        calc((var(--room-w) - var(--list) - var(--gap) - 2 * var(--pad)) / var(--shape) + 150px)
      );
    }
    .body {
      grid-template: "head head" auto "list preview" minmax(0, 1fr) / var(--list) minmax(0, 1fr);
    }
    .stage {
      width: 100%;
      min-height: 0;
    }
  }
  .list {
    grid-area: list;
    min-height: 0;
    overflow-y: auto;
  }
  /* Each day's heading stays at the top while its clips scroll under it. */
  h3 {
    position: sticky;
    top: 0;
    z-index: 1;
    margin: 0 0 8px;
    padding: 4px 0;
    background: var(--card-background-color, #fff);
    font-size: 14px;
    font-weight: 500;
  }
  /* 96px, so three fit across a phone. */
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, 96px);
    gap: 8px;
    margin-bottom: 16px;
  }
  .rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 16px;
  }
  .item {
    box-sizing: border-box;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 12px;
    line-height: 1.3;
    text-align: left;
    cursor: pointer;
  }
  .tiles .item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 96px;
  }
  .rows .item {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 4px;
  }
  .rows .item.chosen {
    background: color-mix(in srgb, var(--primary-color, #03a9f4) 15%, transparent);
  }
  .thumb {
    box-sizing: border-box;
    border-radius: 8px;
    object-fit: cover;
    background: var(--secondary-background-color, #e5e5e5);
  }
  .tiles .thumb {
    width: 96px;
    height: 96px;
  }
  .rows .thumb {
    width: 48px;
    height: 48px;
    border-radius: 6px;
  }
  .thumb.none {
    display: grid;
    place-items: center;
    color: var(--secondary-text-color, #727272);
    --mdc-icon-size: 32px;
  }
  .rows .thumb.none {
    --mdc-icon-size: 20px;
  }
  .tiles .item.chosen .thumb {
    outline: 3px solid var(--primary-color, #03a9f4);
    outline-offset: -3px;
  }
  .text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .what {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
    overflow-wrap: anywhere;
    --mdc-icon-size: 14px;
  }
  .when,
  .note {
    color: var(--secondary-text-color, #727272);
  }
  .note {
    margin: 0 0 12px;
  }
  .end {
    height: 1px;
  }
  /* The admin UI's callout (ui.module.css .callout, docs/design/chrome.html#callout),
     which a card can't import: something to know, in its tone. */
  .callout {
    margin: 0 0 8px;
    padding: 10px 14px;
    border: 1px solid color-mix(in srgb, var(--tone) 45%, var(--divider-color, #ddd));
    border-radius: 12px;
    background: color-mix(in srgb, var(--tone) 10%, var(--card-background-color, #fff));
    font-size: 13.5px;
    overflow-wrap: anywhere;
  }
  .callout.warn {
    --tone: var(--warning-color, #ffa600);
  }
  .callout.bad {
    --tone: var(--error-color, #db4437);
  }
`;
