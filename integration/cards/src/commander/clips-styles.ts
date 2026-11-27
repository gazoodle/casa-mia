// The Camera Commander card's clips dialog's look (clips-dialog.ts): its size, its two
// layouts (the list beside the preview on a wide landscape screen, else above it), the
// tiles and the rows. Sizes are fixed CSS px; the dialog's own is the screen less a
// margin, up to a cap.
import { css } from "lit";

export const clipsStyles = css`
  /* The screen less a margin, up to a cap, and that size from the moment it opens: it
     never grows as days come. The cap is the same both ways, so a portrait tablet is
     filled as a landscape one is. vh first, for a browser without dvh. */
  dialog {
    width: min(1280px, calc(100vw - 32px));
    height: min(1280px, calc(100vh - 32px));
    height: min(1280px, calc(100dvh - 32px));
    max-width: none;
    max-height: none;
    padding: 0;
    border: none;
    border-radius: 16px;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
    font: 14px / 1.4 var(--ha-font-family-body, Roboto, sans-serif);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
  /* Portrait, or narrow: the preview above the list. */
  .body {
    display: grid;
    grid-template: "head" auto "preview" auto "list" minmax(0, 1fr) / minmax(0, 1fr);
    gap: 12px;
    box-sizing: border-box;
    height: 100%;
    padding: 16px;
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
  /* One cell, the box's own size: the picture fitted in it and Play centred over it (a
     cell sized by the picture put Play below the box's edge on a portrait tablet). */
  .stage {
    display: grid;
    grid-template: minmax(0, 1fr) / minmax(0, 1fr);
    place-items: center;
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 360px;
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
  /* Landscape, wide enough: the list on the left, the preview filling the right. */
  @media (orientation: landscape) and (min-width: 700px) {
    .body {
      grid-template: "head head" auto "list preview" minmax(0, 1fr) / 412px minmax(0, 1fr);
    }
    .stage {
      flex: 1;
      min-height: 0;
      aspect-ratio: auto;
      max-height: none;
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
  .tiles {
    display: grid;
    grid-template-columns: repeat(auto-fill, 120px);
    gap: 12px;
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
    width: 120px;
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
    width: 120px;
    height: 120px;
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
