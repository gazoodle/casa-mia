// The Camera Commander card over the whole screen, the browser's own bars gone (its Full
// screen button, Config.screen_button): the browser's Fullscreen API, asked of the card
// itself. Safari on an iPad has it, under webkit names before iPadOS 16.4. Safari on an
// iPhone has none, nor has a page in a frame that was not allowed it, and there the
// button is not offered (canFill).
type Asked = { requestFullscreen?: () => Promise<void>; webkitRequestFullscreen?: () => void };
type Page = {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: unknown;
  webkitFullscreenElement?: unknown;
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => void;
};

/** Fired at the card when it takes or leaves the screen: by its button, and by the
 * browser's own ways out (Esc, Safari's close button, a swipe down). */
export const SCREEN_EVENTS = ["fullscreenchange", "webkitfullscreenchange"];

/** Whether this page may take the whole screen. */
export const canFill = (page: Page = document): boolean => Boolean(page.fullscreenEnabled ?? page.webkitFullscreenEnabled);

/** Whether something has the whole screen now. Asked from the card's own SCREEN_EVENTS,
 * which only pass through it for itself, so it is the card that has it. */
export const filling = (page: Page = document): boolean => Boolean(page.fullscreenElement ?? page.webkitFullscreenElement);

/** Take the whole screen for `el`, or give it back. Only from a tap: a browser refuses
 * it otherwise. A refusal is said in the console, and the button stays as it was. */
export function fill(el: Asked, on: boolean, page: Page = document): void {
  // The webkit calls return nothing, and say nothing of a refusal.
  const asked = on
    ? el.requestFullscreen
      ? el.requestFullscreen()
      : el.webkitRequestFullscreen?.()
    : page.exitFullscreen
      ? page.exitFullscreen()
      : page.webkitExitFullscreen?.();

  Promise.resolve(asked).catch((err) => console.warn(`casa-mia: full screen ${on ? "refused" : "not left"}: ${err?.message ?? err}`));
}
