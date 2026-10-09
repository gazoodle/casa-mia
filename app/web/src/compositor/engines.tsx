import { AreaHead, Empty } from "../page";
import guest from "../guest.module.css";
import pipe from "../pipeline.module.css";
import ui from "../ui.module.css";
import { Act, DRAW_STEPS, Engine, PaceSlider, PauseButton, Table, paceText, seconds } from "./common";

export function GeneratorArea({
  which,
  name,
  blurb,
  e,
  busy,
  act,
  onShow,
}: {
  which: string;
  name: string;
  blurb: string;
  e: Engine;
  busy: boolean;
  act: Act;
  onShow: (id: string) => void;
}) {
  return (
    <section className={guest.area}>
      <AreaHead
        title={`${name} generator`}
        blurb={`${blurb} Draws each commander watched from the cache, ${paceText(e.pace ?? 2)}${e.generator_paused ? "; paused: the last pictures are served on" : ""}.`}
        action={<PauseButton paused={!!e.generator_paused} path={`${which}/generator`} name={`${name} generator`} busy={busy} act={act} />}
      />
      <PaceSlider which={which} value={e.pace ?? 2} steps={DRAW_STEPS} act={act} />
      {e.error && <p className={guest.empty}>{e.error}</p>}
      {e.needs && <Empty>It needs {e.needs}.</Empty>}
      {e.pictures?.length ? (
        <Table head={["Commander", "Size", "Drawn", "Draw", "Picture", ""]}>
          {e.pictures.map((p) => (
            <tr key={`${p.commander} ${p.width}x${p.height} ${p.scale}`}>
              <td>{p.commander}</td>
              <td>
                {p.width} × {p.height}
                {p.asked ? ` at ${p.scale}×` : ""} <span className={guest.badge}>{p.asked ? "a card's size" : "its own size"}</span>
              </td>
              <td>{seconds(p.age_s)} ago</td>
              <td>{p.draw_ms} ms</td>
              <td>{p.kb} kB</td>
              <td>
                <button className={ui.iconButton} onClick={() => onShow(`p ${which} ${p.key}`)} title="A live view of this picture" aria-label={`Live view of ${p.commander}`}>
                  ↗
                </button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>None drawn since nobody last looked.</Empty>
      )}
    </section>
  );
}

export function ServerArea({ which, name, e, busy, act }: { which: string; name: string; e: Engine; busy: boolean; act: Act }) {
  return (
    <section className={guest.area}>
      <AreaHead
        title={`${name} server`}
        blurb={`Port ${e.port}. Sends each viewer the newest picture as it is drawn${e.server_paused ? "; paused: streams hold, single pictures are refused" : ""}. Card: the version of the Camera Commander card that asked, and its name for the stream, which it ends by when it is done with it (none: an older card, or not a card).`}
        action={<PauseButton paused={!!e.server_paused} path={`${which}/server`} name={`${name} server`} busy={busy} act={act} />}
      />
      {e.size_test && (
        <p>
          <a href={e.size_test} target="_blank" rel="noopener">
            Size test ↗
          </a>{" "}
          <span className={pipe.use}>a commander at exactly a browser window's size, with what was asked for and what came back (on this network only)</span>
        </p>
      )}
      {e.sending?.length ? (
        <Table head={["Viewer", "Picture", "Card", "Stream", "Open", "Frames", ["Pictures/s", "Sent of drawn"], "Frame", "Rate", "Waiting to send"]}>
          {e.sending.map((s) => (
            <tr key={`${s.viewer} ${s.picture} ${s.open_s}`}>
              <td>
                {s.name ? (
                  <>
                    {s.name} <span className={pipe.use}>{s.viewer}</span>
                  </>
                ) : (
                  s.viewer
                )}
              </td>
              <td>{s.picture}</td>
              <td>{s.card || "none"}</td>
              <td>{s.sid || "none"}</td>
              <td>{seconds(s.open_s)}</td>
              <td>{s.frames}</td>
              <td style={s.fps < s.drawn_fps * 0.9 ? { color: "var(--warn)" } : undefined}>
                {s.fps} of {s.drawn_fps}
              </td>
              <td>{s.kb_frame} kB</td>
              <td>{s.kbit_s} kbit/s</td>
              <td style={s.waiting_pct > 50 ? { color: "var(--warn)" } : undefined}>{s.waiting_pct}%</td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No streams open.</Empty>
      )}
    </section>
  );
}
