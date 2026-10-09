/** A camera's live view, each of its channels to choose from, shared by the Camera Dashboard
 * page (a camera's Live button) and the Camera compositor page (a gatherer channel's ↗). */

import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { Dialog, Segmented } from "./ui";
import { canWebRTC, haConnection, playWebRTC } from "./webrtc";
import css from "./cameras.module.css";
import ui from "./ui.module.css";

const { get } = api("camera-dashboard");

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
  useEffect(() => {
    get<{ channels: Channel[] }>(`live/${encodeURIComponent(entity)}`).then(
      (r) => {
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
    </Dialog>
  );
}

