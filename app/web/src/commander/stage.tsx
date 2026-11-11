/** The stage: a commander laid out in the browser, at any size, from the page's own camera
 * thumbnails (docs/design/commander-responsive-layout.md). The cards' layout engine places
 * everything, as it does on a dashboard, so dragging the stage shows what the commander
 * does in a space of another shape without waiting for the app to draw it. It is the
 * engine's layout with thumbnails in it, not the compositor's picture: the labels, the
 * Stale marks and the Security look are only in "As the app draws it". */

import { useContext, useEffect, useRef, useState } from "react";
import type { Rect } from "../../../../integration/cards/src/layout.ts";
import { measure, type Shown } from "../../../../integration/cards/src/measure.ts";
import { camerasOf, placed, type Commander as Laid, type Placed } from "../../../../integration/cards/src/placed.ts";
import { Camera, ThumbRound, plural } from "../cameras";
import { get, type Engine, type Status } from "../compositor/common";
import ui from "../ui.module.css";
import css from "./stage.module.css";
import { Commander, HIGHLIGHT, PANELS } from "./common";

/** Spaces a commander is often given, in CSS pixels. The phone's are its screen less Home
 * Assistant's header. */
const SIZES: [name: string, w: number, h: number][] = [
  ["Wide", 1100, 560],
  ["Tablet", 960, 600],
  ["Squarer", 700, 600],
  ["Banner", 1100, 360],
  ["Tall", 520, 700],
  ["Phone upright", 393, 700],
  ["Phone on its side", 852, 340],
];
const WIDTHS = [240, 2600];
const HEIGHTS = [160, 1600];
const within = (n: number, [lo, hi]: number[]) => Math.round(Math.min(hi, Math.max(lo, n)));
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** A size the app is drawing a commander at for a card showing it now: the card's space
 * in CSS pixels, as the stage's sizes are, and who is watching. */
type Drawn = { w: number; h: number; about: string };

/** The sizes the live compositor is drawing the commander `name` at for cards (its
 * status's pictures), one of each: a card on a screen of 2 device pixels to a CSS pixel
 * asks for twice its space, laid out with everything doubled, so its space is the size
 * to lay out here. */
function drawnAt(live: Engine, name: string): Drawn[] {
  const found = new Map<string, Drawn & { who: Set<string> }>();
  for (const p of live.pictures ?? []) {
    if (!p.asked || p.commander !== name || !p.scale) continue;
    const [w, h] = [Math.round(p.width / p.scale), Math.round(p.height / p.scale)];
    const one = found.get(`${w}x${h}`) ?? { w, h, about: "", who: new Set<string>() };
    for (const s of live.sending ?? []) if (s.picture === p.key) one.who.add(s.name || s.viewer);
    one.about = `${p.width} × ${p.height} px at ${p.scale}×`;
    found.set(`${w}x${h}`, one);
  }
  return [...found.values()].map(({ w, h, about, who }) => ({
    w,
    h,
    about: `Drawn now (${about}) for ${who.size ? [...who].sort().join(", ") : "a card that has just closed"}`,
  }));
}

/** What gave way to find a layout that fits (the solver's `gave`), in words. */
const GAVE: Record<string, string> = {
  edges: "edges not in the list were used",
  main_least: "the main camera went below its least",
  tile_min: "the tiles went below the smallest tile",
  main_alone: "only the main camera is shown",
};

export function Stage({
  value,
  cameras,
  onHidden,
}: {
  value: Commander;
  cameras: Record<string, Camera>;
  /** Told the cameras there is no room for at the stage's size, as it changes. */
  onHidden?: (cameras: string[]) => void;
}) {
  const round = useContext(ThumbRound);
  // It starts at the commander's own shape.
  const [[W, H], setSize] = useState<[number, number]>(() => [960, within((960 * value.height) / value.width, HEIGHTS)]);
  const [picked, setPicked] = useState("");

  // The sizes it is being drawn at now, read once when it is opened (by its saved name).
  const [drawn, setDrawn] = useState<Drawn[] | string | null>(null);
  useEffect(() => {
    get<Status>("status").then(
      (status) => setDrawn(drawnAt(status.live, value.name)),
      (err: Error) => setDrawn(err.message),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Shown smaller when the space is wider than the page has room for.
  const frame = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);
  useEffect(() => {
    const seen = new ResizeObserver(([entry]) => setRoom(entry.contentRect.width));
    seen.observe(frame.current!);
    return () => seen.disconnect();
  }, []);
  const k = room ? Math.min(1, room / W) : 1;

  // The corner handle (a pointer's, so a finger drags it too; the browser's own resize
  // handle doesn't answer to touch). The scale is held for the drag, so the size follows
  // the pointer.
  const drag = useRef<{ x: number; y: number; w: number; h: number; k: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, w: W, h: H, k };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d) setSize([within(d.w + (e.clientX - d.x) / d.k, WIDTHS), within(d.h + (e.clientY - d.y) / d.k, HEIGHTS)]);
  };

  // Laid out as the card lays it out (placed.ts), in either mode: at this size, a hidden
  // panel holding nothing.
  const panels = Object.fromEntries(PANELS.map((p) => [p, value[p].hidden ? { ...value[p], cameras: [] } : value[p]]));
  const s = { ...value, ...panels, width: W, height: H, scale: 1 } as unknown as Laid;
  const main = camerasOf(s).includes(picked) ? picked : value.main;
  const shape = (e: string) => Number((s.aspects ?? {})[e]) || 16 / 9;
  let laid: Placed | null = null;
  let wrong = "";
  try {
    laid = placed(s, main || null);
  } catch (err) {
    wrong = (err as Error).message;
  }

  const hidden = laid?.more ? camerasOf(s).slice(laid.tiles.length) : [];
  const hiddenKey = hidden.join("\n");
  useEffect(() => onHidden?.(hiddenKey ? hiddenKey.split("\n") : []), [hiddenKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!laid) return <div className={css.note}>This commander can't be laid out: {wrong}.</div>;
  const mainRect = laid.main;

  const mainShown: Shown | null = main && mainRect[2] > 0 && mainRect[3] > 0 ? { rect: mainRect, shape: shape(main), how: laid.mainHow } : null;
  const tilesShown = laid.tiles.filter((t) => t.rect[2] > 0 && t.rect[3] > 0).map((t) => ({ e: t.camera, rect: t.rect, shape: shape(t.camera), how: t.how }));
  const m = measure([W, H], mainShown, tilesShown);

  const at = ([x, y, w, h]: Rect) => ({ left: x * k, top: y * k, width: w * k, height: h * k });
  const picture = (e: string, how: Shown["how"]) => (
    <img src={`api/cameras/thumb/${encodeURIComponent(e)}?r=${round}`} alt="" draggable={false} style={{ objectFit: how }} />
  );
  const title = (e: string) => cameras[e]?.title ?? e;
  const lit = { ...HIGHLIGHT, ...value.highlight };

  return (
    <div className={css.stage}>
      <div className={css.sizes}>
        {SIZES.map(([name, w, h]) => (
          <button
            key={name}
            className={`${ui.button} ${ui.small}`}
            aria-pressed={w === W && h === H}
            title={`${w} × ${h} px`}
            onClick={() => setSize([w, h])}
          >
            {name}
          </button>
        ))}
        <span>
          {W} × {H} px{k < 1 ? `, shown at ${pct(k)}` : ""}
        </span>
      </div>
      <div className={css.sizes}>
        <em>On screens now:</em>
        {typeof drawn === "string" ? (
          <em>couldn't be read ({drawn})</em>
        ) : !drawn ? (
          <em>…</em>
        ) : drawn.length ? (
          drawn.map(({ w, h, about }) => (
            <button
              key={`${w}x${h}`}
              className={`${ui.button} ${ui.small}`}
              aria-pressed={within(w, WIDTHS) === W && within(h, HEIGHTS) === H}
              title={about}
              onClick={() => setSize([within(w, WIDTHS), within(h, HEIGHTS)])}
            >
              {w} × {h}
            </button>
          ))
        ) : (
          <em>no card is showing it</em>
        )}
      </div>
      <div ref={frame}>
        {/* data-tall: the dock holding it stops following the page (cameras.module.css) */}
        <div className={css.box} style={{ width: W * k, height: H * k }} data-tall={H * k > window.innerHeight / 2 ? "" : undefined}>
          {mainShown && (
            <div className={`${css.tile} ${css.main}`} style={at(mainShown.rect)}>
              {picture(main, mainShown.how)}
              <span>{title(main)}</span>
            </div>
          )}
          {tilesShown.map((t) => (
            <button
              key={t.e}
              className={css.tile}
              style={{ ...at(t.rect), ...(t.e === main ? { outline: `${lit.width}px solid ${lit.colour}`, outlineOffset: -lit.width } : {}) }}
              title={`${title(t.e)}: make it the main camera here`}
              onClick={() => setPicked(t.e)}
            >
              {picture(t.e, t.how)}
              <span>{title(t.e)}</span>
            </button>
          ))}
          {laid.more && (
            <div className={`${css.tile} ${css.more}`} style={at(laid.more.rect)}>
              +{laid.more.count} more
            </div>
          )}
          <span
            className={css.handle}
            role="separator"
            aria-label="Drag to change the size"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
        </div>
      </div>
      <p className={css.facts}>
        {mainShown ? `The main camera is ${pct(m.main)} of the space. ` : "There is no room for a main camera. "}
        {pct(m.unused)} of the space shows no camera.
        {m.lost > 0.005 && ` A camera loses up to ${pct(m.lost)} of its picture.`}
        {m.squeezed > 0.02 && ` A camera is stretched ${pct(m.squeezed)} out of its shape.`}
        {m.tall > 0 && ` ${plural(m.tall, "tile")} ${m.tall === 1 ? "is" : "are"} taller than wide.`}
        {laid.more && ` ${plural(laid.more.count, "camera")} ${laid.more.count === 1 ? "doesn't" : "don't"} fit, and ${laid.more.count === 1 ? "is" : "are"} in +${laid.more.count} more.`}
        {laid.gave.length > 0 && <strong> Its limits don't all fit this space: {laid.gave.map((g) => GAVE[g] ?? g).join("; ")}.</strong>}
      </p>
    </div>
  );
}
