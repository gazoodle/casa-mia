// Camera Commander card: one commander, chosen by its Main camera select, drawn from what
// the select's `card` attribute says (the app's commander.Live._card): the compositor's
// picture, and over it the tap zones laid out by the same engine the compositor draws with.
// A tap on a panel camera makes it the main one; a tap on the main camera opens its
// more-info (or its live page on the camera dashboard). The highlight on the main camera's
// tile is an <img> pulsing by CSS (its style and pace from the commander's highlight
// settings).
// The Security look (security_look, with its tint, strength and darkness: monochrome,
// tinted, a CSS filter) is the card's own option: one layer holds what it covers, the
// picture, the live main camera and its caption, and carries the filter, so anything new in
// it is tinted from its first frame. Over it, the tap zones and the highlight, in their own
// colours.
// Being edited (the dashboard in edit mode, the card editor), it shows one still picture at
// the commander's own size, hatched, and no stream or live video: edit mode resizes it at
// every step, and each size would be a new stream from the compositor.
// The picture is drawn exactly the size the card is shown: the card asks the compositor for
// its own size (device pixels, ?w=&h=&dpr=), and lays its taps out for the same canvas, so
// nothing is scaled, cropped or bordered on the screen. Its size follows the cards' one rule
// (ha.ts: fitOf, heightFor): always all of its width; alone in a Panel view, all of the
// screen below its top edge; filling a Tablet Layout's panel, the panel; elsewhere as HA's
// Picture glance card: with its rows set (the Layout tab), its cell, else as tall as shows
// its main camera at that camera's own shape, the panels round it (layout.ts:
// heightForMain), so it grows or shrinks as the main camera changes. Half the width by
// default, as HA's cards.
// With live main (the card's option, on by default, while the compositor's Live main camera
// switch is on), the main camera plays as live video over the picture, through Home
// Assistant's WebRTC as its own camera cards play it: the tablet decodes it (the box draws
// the picture without it, ?main=video), at full frame rate. The channel is the smallest at
// least the main area's size in device pixels (fewer away from home, as the picture). The
// card draws its caption. A video that does not start within LIVE_WAIT_MS, or fails, gives
// way to the drawn picture, until the main camera changes. The Security look covers it with
// the picture.
// The picture comes straight from the compositor at home (its LAN address), else through
// Home Assistant (the integration's pictures.py): away from home that address is out of
// reach, and on an HTTPS page an http:// picture is blocked. Home is told by how this page
// reached Home Assistant (atHome), which the companion app already chooses by the Wi-Fi it
// is on (its internal or external URL); `route` overrides it. Through Home Assistant the
// picture is asked for at no more than `away_sharpness`'s pixel ratio (Balanced: 1.5), as
// a 2x or 3x screen's own is up to four times the bytes over a slower link.
// The parts: common.ts (types, constants, helpers), card.ts (the card), editor.ts (its editor).
import { define, register } from "../ha.ts";
import { CommanderCard } from "./card.ts";
import { CommanderEditor } from "./editor.ts";

export { VERSION } from "./common.ts";

define("casa-mia-commander", CommanderCard);
define("casa-mia-commander-editor", CommanderEditor);
register("casa-mia-commander", "Casa Mia Camera Commander", "One of the Camera Commander page's commanders: tap a camera to make it the main one.");
