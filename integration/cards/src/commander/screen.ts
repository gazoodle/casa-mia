// The Camera Commander card over the whole screen, the browser's own bars gone (its Full
// screen button, Config.screen_button): the browser's Fullscreen API, asked of the card
// itself. Safari on an iPad has it, under webkit names before iPadOS 16.4. Safari on an
// iPhone has none for a page, only for a video, so there the button puts the main
// camera's live video in the phone's own player (playFull), as the Advanced Camera Card
// does. A page in a frame that was not allowed full screen has neither.
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

/** The room to leave at the top while the card has the screen. An iPad keeps its status
 * bar (the time, the date, the battery) over a full screen page, on top of the picture.
 * The browser's own figure is used where it gives one; an iPad that gives none gets its
 * status bar's height, 24 px. Elsewhere there is nothing up there, and no room is left. */
export function barRoom(device: { userAgent: string; maxTouchPoints: number } = navigator): string {
  // An iPad says it is a Mac; only its touch screen tells them apart.
  const iPad = /iPad|Macintosh/.test(device.userAgent) && device.maxTouchPoints > 1;
  return iPad ? "max(env(safe-area-inset-top, 0px), 24px)" : "env(safe-area-inset-top, 0px)";
}

type Player = {
  webkitSupportsFullscreen?: boolean;
  webkitEnterFullscreen?: () => void;
  play: () => Promise<void>;
  addEventListener: (name: string, heard: () => void, how: { once: boolean }) => void;
};

/** Where a page can't have the screen (Safari on an iPhone), a video still can, in the
 * phone's own player: whether this one can, which it can't before it has begun. */
export const canPlayFull = (video: Player): boolean => Boolean(video.webkitSupportsFullscreen && video.webkitEnterFullscreen);

/** How long after the phone's player closes the video is started again. */
const RESUME_MS = 500;

/** The video in the phone's own player, over the whole screen. The player has its own
 * way back, and the page is not seen meanwhile, so there is no state to keep. */
export function playFull(video: Player): void {
  // An iPhone pauses the video on the way out of its player. Left paused, the live video
  // would lapse (live.ts) and be reported lost, so it is started again.
  video.addEventListener("webkitendfullscreen", () => setTimeout(() => video.play().catch(() => undefined), RESUME_MS), { once: true });
  video.webkitEnterFullscreen?.();
}
