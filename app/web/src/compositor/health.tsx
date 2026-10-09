import { Graphlet } from "../Graphlet";
import pipe from "../pipeline.module.css";
import { Monitor, Sample, Verdict, bits, gb, mb, plural } from "./common";

/** The whole compositor system over the last minutes: CPU (gathering and composing),
 * memory (the cache and the rest of the app, against the box), bytes sent, and the
 * bottleneck (what viewers wait for: the network or the drawing). */
export function Graphs({ m }: { m: Monitor }) {
  const h = m.history;
  const now = h[h.length - 1];
  if (!now) return null;
  const total = now.total ?? Math.max(...h.map((x) => x.rss ?? 0)) * 1.25;
  const busiest = Math.max(...h.map((x) => x.out_bps), 100_000);
  const scale = niceCeil(busiest);
  return (
    <div className={pipe.graphs}>
      <Graphlet
        title="CPU"
        value={`${now.app}% of the box (${m.cpus} cores)`}
        tone={now.app > 80 ? "bad" : now.app > 50 ? "warn" : "good"}
        series={[
          { name: "gathering", color: "var(--accent)", values: h.map((x) => x.gather) },
          { name: "composing", color: "var(--warn)", values: h.map((x) => x.compose) },
        ]}
        max={100}
        top="100%"
        bottom="0%"
      />
      <Graphlet
        title="Memory"
        value={`app ${mb(now.rss ?? 0)}${now.free != null ? ` · box ${gb(now.free)} free` : ""}`}
        tone={now.free != null && now.total && now.free / now.total < 0.1 ? "warn" : "good"}
        series={[
          { name: "cache", color: "var(--accent)", values: h.map((x) => x.cache) },
          { name: "rest of the app", color: "var(--warn)", values: h.map((x) => Math.max((x.rss ?? 0) - x.cache, 0)) },
        ]}
        max={total}
        top={gb(total)}
        bottom="0"
      />
      <Graphlet
        title="Network out"
        value={bits(now.out_bps)}
        series={[{ name: "sent", color: "var(--accent)", values: h.map((x) => x.out_bps) }]}
        max={scale}
        top={bits(scale)}
        bottom="0"
      />
      <Graphlet
        title="Bottleneck"
        value={bottleneck(now)}
        tone={Math.max(now.waiting, now.drawing) > 80 ? "bad" : Math.max(now.waiting, now.drawing) > 50 ? "warn" : "good"}
        series={[
          { name: "waiting for the network", color: "var(--accent)", values: h.map((x) => x.waiting) },
          { name: "drawing", color: "var(--warn)", values: h.map((x) => x.drawing) },
        ]}
        max={100}
        top="100%"
        bottom="0%"
      />
    </div>
  );
}

/** How the panels are doing, in a sentence, and what to do about it: the app's verdict
 * (the integration's Compositor health sensor has the same). */
export function Health({ v }: { v: Verdict }) {
  return (
    <div className={`${pipe.health} ${v.tone === "good" ? "" : pipe[v.tone]}`}>
      <strong>{v.headline}</strong>
      <span>{v.advice}</span>
    </div>
  );
}

/** What viewers wait for, in words: what is sent against what there was to send
 * (pictures and bits a second, the bits scaled up for the pictures skipped), and the
 * busier of the network (the share of the streams' time their writes waited) and the
 * drawing. */
export function bottleneck(now: Sample): string {
  const drawn = now.sent_fps + now.skipped_fps;
  const shortfall = now.skipped_fps > 0 ? ` of ${drawn.toFixed(1)}` : "";
  const wanted = now.skipped_fps > 0 && now.sent_fps > 0 ? ` of ${bits((now.out_bps * drawn) / now.sent_fps)}` : "";
  const sending = `${plural(now.streams, "stream")} · ${now.sent_fps.toFixed(1)}${shortfall} pictures/s · ${bits(now.out_bps)}${wanted}${now.kb_picture != null ? ` · ${now.kb_picture} kB a picture` : ""}`;
  const slowest =
    Math.max(now.waiting, now.drawing) < 25
      ? "keeping up"
      : now.waiting >= now.drawing
        ? `the network: ${Math.round(now.waiting)}% of the time waiting to send`
        : `drawing: busy ${Math.round(now.drawing)}% of the time`;
  return `${sending} · ${slowest}`;
}

/** A round number at or above n (1, 2 or 5 times a power of ten). */
export function niceCeil(n: number): number {
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((k) => k * p).find((v) => v >= n) ?? 10 * p;
}

export function Stage({ name, on, note, children }: { name: string; on: boolean; note: string; children: React.ReactNode }) {
  return (
    <div className={pipe.stage}>
      <strong>
        <span className={`${pipe.dot} ${on ? pipe.on : ""}`} aria-hidden="true" />
        {name}
      </strong>
      <span className={pipe.use}>{note}</span>
      {children}
    </div>
  );
}
