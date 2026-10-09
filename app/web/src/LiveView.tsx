/** A camera's live view, each of its channels to choose from, shared by the Cameras
 * page (a camera's live view, with its motion sensor) and the Camera compositor page (a
 * gatherer channel's ↗). */

import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Dialog, Segmented, Switch } from "./ui";
import { canWebRTC, haConnection, playWebRTC } from "./webrtc";
import css from "./cameras.module.css";
import ui from "./ui.module.css";

const { get, post } = api("cameras");

type Channel = { channel: "camera" | "low" | "medium" | "high"; entity: string; url: string };

const CHANNELS: Record<Channel["channel"], [label: string, about: string]> = {
  camera: ["The camera", "the camera itself (it has no separate channels)"],
  low: ["Low", "the low channel, the one the commander is made from"],
  medium: ["Medium", "the medium channel, the one the wall tablets and phones play"],
  high: ["High", "the high channel, the one everyone else plays; the slowest to come through here"],
};

/** One camera's live picture, each of its channels to choose from: through Home Assistant's
 * WebRTC (the stream itself, at its own size) where HA offers it, else HA's MJPEG stream (made
 * from snapshots), played from HA directly as its camera cards do. The size shown is what
 * arrives. */
export function LiveView({
  entity,
  title,
  initial,
  onClose,
}: {
  entity: string;
  title: string;
  /** The channel (its entity) shown first; else the camera's first. */
  initial?: string;
  onClose: () => void;
}) {
  const img = useRef<HTMLImageElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [channels, setChannels] = useState<Channel[]>();
  const [chosen, setChosen] = useState<Channel["channel"]>();
  const [state, setState] = useState<"connecting" | "live" | "failed">("connecting");
  const [error, setError] = useState<string>();
  const [size, setSize] = useState<string>(); // the pictures' own size, as they come
  const [how, setHow] = useState<"webrtc" | "mjpeg">(); // how the chosen channel plays
  const [motion, setMotion] = useState<Motion>(); // the camera's motion sensor, followed live
  useEffect(() => {
    get<{ channels: Channel[]; motion?: string | null; motion_switch?: string | null }>(`live/${encodeURIComponent(entity)}`).then(
      (r) => {
        setMotion(r.motion ? { sensor: r.motion, switch: r.motion_switch ?? undefined } : undefined);
        setChannels(r.channels);
        setChosen((r.channels.find((c) => c.entity === initial) ?? r.channels[0])?.channel);
      },
      (err) => setError((err as Error).message),
    );
  }, [entity, initial]);
  const shown = channels?.find((c) => c.channel === chosen);
  // Each channel: WebRTC if HA plays it so, else MJPEG. Torn down on a change of channel and
  // on close (a browser can keep an <img> stream open after the image is gone).
  useEffect(() => {
    if (!shown) return;
    let stop: (() => void) | undefined;
    let gone = false;
    setSize(undefined);
    setHow(undefined);
    const conn = haConnection();
    (conn ? canWebRTC(conn, shown.entity) : Promise.resolve(false)).then(async (rtc) => {
      if (gone) return;
      setHow(rtc ? "webrtc" : "mjpeg");
      if (!rtc || !conn) return;
      await new Promise(requestAnimationFrame); // the <video> rendered
      if (gone || !video.current) return;
      try {
        const close = await playWebRTC(conn, shown.entity, video.current, (why) => {
          setState("failed");
          setError(why);
        });
        if (gone) close();
        else stop = close;
      } catch (err) {
        setState("failed");
        setError((err as Error).message);
      }
    });
    // The resolution, read each second: a channel can change it mid-stream.
    const look = setInterval(() => {
      const v = video.current;
      const i = img.current;
      if (v?.videoWidth) setSize(`${v.videoWidth} × ${v.videoHeight}`);
      else if (i?.naturalWidth) setSize(`${i.naturalWidth} × ${i.naturalHeight}`);
    }, 1000);
    const el = img.current;
    return () => {
      gone = true;
      clearInterval(look);
      stop?.();
      if (el) el.src = "";
    };
  }, [shown?.url]);
  // The motion sensor's state, and the camera's motion detection switch's, as Home Assistant
  // changes them (its own connection: nothing asked of the app). Compressed states: `a` the
  // first, `c` each change ("+": what changed); lc (last changed) is left out when it equals
  // lu (last updated).
  useEffect(() => {
    const sensor = motion?.sensor;
    const toggle = motion?.switch;
    const conn = haConnection();
    if (!sensor || !conn) return;
    let unsub: (() => Promise<void>) | undefined;
    let gone = false;
    conn
      .subscribeMessage(
        (msg: { a?: Record<string, Compressed>; c?: Record<string, { "+"?: Compressed }> }) => {
          const flip = toggle ? (msg.a?.[toggle] ?? msg.c?.[toggle]?.["+"]) : undefined;
          if (flip?.s !== undefined) setMotion((m) => m && { ...m, detecting: flip.s === "on" });
          const one = msg.a?.[sensor] ?? msg.c?.[sensor]?.["+"];
          if (!one) return;
          const at = one.lc ?? one.lu;
          setMotion((m) => ({
            ...m,
            sensor,
            on: one.s !== undefined ? one.s === "on" : m?.on,
            at: at !== undefined ? at * 1000 : m?.at,
          }));
        },
        { type: "subscribe_entities", entity_ids: toggle ? [sensor, toggle] : [sensor] },
      )
      .then(
        (u) => {
          if (gone) void u();
          else unsub = u;
        },
        () => undefined,
      );
    return () => {
      gone = true;
      unsub?.();
    };
  }, [motion?.sensor, motion?.switch]);
  const note = error ?? (channels && !shown ? "Home Assistant has no stream of this camera." : undefined);
  return (
    <Dialog
      title={title}
      wide
      onClose={onClose}
      footer={
        <button className={ui.primary} onClick={onClose}>
          Close
        </button>
      }
    >
      {channels && channels.length > 1 && (
        <Segmented
          value={chosen ?? channels[0].channel}
          options={channels.map((c) => [c.channel, CHANNELS[c.channel][0]])}
          onChange={(c) => {
            setState("connecting");
            setError(undefined);
            setChosen(c);
          }}
        />
      )}
      <div className={css.live}>
        {shown && how === "webrtc" && (
          <video
            key={shown.url}
            ref={video}
            autoPlay
            muted
            playsInline
            onLoadedData={(e) => {
              setState("live");
              setSize(`${e.currentTarget.videoWidth} × ${e.currentTarget.videoHeight}`);
            }}
          />
        )}
        {shown && how === "mjpeg" && (
          <img
            key={shown.url}
            ref={img}
            src={shown.url}
            alt={`${title}, live`}
            onLoad={(e) => {
              setState("live");
              setSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`);
            }}
            onError={() => setState("failed")}
          />
        )}
        {(note || state !== "live") && (
          <span className={css.liveNote}>
            {note ?? (state === "failed" ? "No live picture from this channel." : "Connecting…")}
          </span>
        )}
      </div>
      {shown && (
        <p className={css.muted}>
          <code>{shown.entity}</code>
          {size && (
            <>
              , <strong>{size}</strong>
            </>
          )}
          : {CHANNELS[shown.channel][1]}.{" "}
          {how === "webrtc"
            ? "Home Assistant's WebRTC: the camera's stream itself, at its own size."
            : "Home Assistant's MJPEG stream, made from the camera's snapshots: a few pictures a second, not video, and not always the stream's size."}
        </p>
      )}
      {motion && (
        <MotionLine
          motion={motion}
          onDetect={(on) =>
            post("motion-detection", { camera: entity, on }).then(
              () => setMotion((m) => m && { ...m, detecting: on }), // HA's own change follows
              (err) => setError((err as Error).message),
            )
          }
        />
      )}
    </Dialog>
  );
}


type Compressed = { s?: string; lc?: number; lu?: number };

/** A camera's motion sensor, and its state once Home Assistant has said; and its own motion
 * detection switch, if it has one, and whether it is on. */
type Motion = { sensor: string; on?: boolean; at?: number; switch?: string; detecting?: boolean };

const clock = (t: number) => new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** The motion sensor's state under the picture: a dot that pulses while it sees motion. */
function MotionLine({
  motion: { sensor, on, at, switch: toggle, detecting },
  onDetect,
}: {
  motion: Motion;
  /** Switch the camera's own motion detection on or off. */
  onDetect: (on: boolean) => void;
}) {
  const words =
    on === undefined
      ? haConnection()
        ? "Motion: asking Home Assistant…"
        : "Motion: shown inside Home Assistant only"
      : on
        ? `Motion now${at ? `, since ${clock(at)}` : ""}`
        : `No motion${at ? ` since ${clock(at)}` : ""}`;
  return (
    <>
      <p className={`${css.muted} ${css.motionLine}`}>
        <span className={`${css.motionDot} ${on ? css.motionOn : ""}`} aria-hidden="true" />
        <span>
          {words} · <code>{sensor}</code>
        </span>
      </p>
      {toggle && (
        <p className={`${css.muted} ${css.motionLine}`}>
          <Switch on={!!detecting} busy={detecting === undefined} label="Motion detection" onChange={onDetect} />
          {detecting === false ? (
            <span className={css.motionWarn}>
              Motion detection is off in the camera (<code>{toggle}</code>): its sensor never turns on, so it takes no
              part in Track motion or the motion dot.
            </span>
          ) : (
            <span>
              Motion detection{detecting ? " on" : ""}: <code>{toggle}</code>
            </span>
          )}
        </p>
      )}
    </>
  );
}
