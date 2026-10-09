import { AreaHead, Empty } from "../page";
import guest from "../guest.module.css";
import pipe from "../pipeline.module.css";
import ui from "../ui.module.css";
import { Act, Channel, GATHER_STEPS, Gatherer, PaceSlider, PauseButton, SURVEY_STEPS, StateBadge, Table, ms, owner, paceText, plural, seconds } from "./common";

export const TIERS = ["high", "medium", "low"];

/** By camera name, then its channels from high to low. */
export const byCamera = (a: Channel, b: Channel) =>
  a.title.localeCompare(b.title) || TIERS.indexOf(a.channel) - TIERS.indexOf(b.channel);

export function GathererArea({
  g,
  busy,
  act,
  onLive,
  onSurveys,
}: {
  g: Gatherer;
  busy: boolean;
  act: Act;
  onLive: (c: Channel) => void;
  onSurveys: (camera: string) => void;
}) {
  return (
    <section className={guest.area}>
      <AreaHead
        title="Gatherer"
        blurb={`Each camera channel wanted is fetched on its own, ${paceText(g.pace)}: its stream's frames where Home Assistant's go2rtc carries it (${g.go2rtc ? "reachable" : "not reachable"}), else snapshots. Restart reads every stream again and forgets every failure, the pictures kept. ${g.paused ? "Paused: nothing is fetched." : ""}`}
        action={
          <span className={pipe.actions}>
            <button
              className={ui.button}
              disabled={busy}
              title="Every stream read again and every mark forgotten, the pictures kept"
              onClick={() => act("gatherer/restart", "Gatherer restarted")}
            >
              Restart
            </button>
            <PauseButton paused={g.paused} path="gatherer" name="Gatherer" busy={busy} act={act} />
          </span>
        }
      />
      <PaceSlider which="gatherer" value={g.pace} steps={GATHER_STEPS} act={act} />
      <p className={pipe.use}>
        A picture fresher than its stream's last keyframe needs every frame since it decoded (most of the CPU a stream
        takes); up to this old, keyframes only will do, however often it is drawn.
      </p>
      <PaceSlider
        which="freshness"
        label="Picture age allowed"
        value={g.freshness}
        steps={[0, 1, 2, 3, 4, 5, 6, 8, 10]}
        text={(n) => (n === 0 ? "as fresh as its pace" : `up to ${n} s old`)}
        act={act}
      />
      <p className={pipe.use}>
        Survey: every channel of every camera, from its stream's first frame (a snapshot where there is no stream), for
        each one's picture and size.{" "}
        {g.paused
          ? "Paused with the gatherer."
          : g.survey.running
            ? `Passing now: ${g.survey.done} of ${g.survey.of}.`
            : g.survey.took_s != null
              ? `Last pass: ${plural(g.survey.of, "channel")} in ${seconds(g.survey.took_s)}, ${seconds(g.survey.cpu_s ?? 0)} of CPU; the next in ${seconds(g.survey.next_in ?? 0)}.`
              : ""}
      </p>
      <PaceSlider which="survey" label="Survey pause" value={g.survey.pace} steps={SURVEY_STEPS} act={act} />
      <PaceSlider
        which="survey_at_once"
        label="Survey at once"
        value={g.survey.at_once}
        steps={[1, 2, 3, 4, 5, 6, 7, 8]}
        text={(n) => `${plural(n, "stream")}`}
        act={act}
      />
      {g.channels.length ? (
        <Table head={["Camera", "Channel", "State", "Size", "Rate", "CPU", "Wanted by", "Missed", "Survey", ""]}>
          {[...g.channels].sort(byCamera).map((c) => (
            <tr key={c.camera}>
              <td>{c.title}</td>
              <td title={c.camera}>{c.channel}</td>
              <td>
                <StateBadge state={c.state} />
                {c.no_stream && <div className={pipe.cellNote}>not its stream: {c.no_stream}</div>}
              </td>
              <td>
                {c.width ? `${c.width} × ${c.height} ` : "? "}
                {c.size_from && (
                  <span
                    className={guest.badge}
                    title={
                      c.size_from === "stream"
                        ? "Its size as its stream gives it (read from its video)"
                        : "Its size as its snapshot gives it: not yet read from its stream, which may differ"
                    }
                  >
                    {c.size_from}
                  </span>
                )}
              </td>
              <td>{c.fps != null ? `${c.fps} fps` : c.fetch_ms != null ? `${ms(c.fetch_ms)} a still` : ""}</td>
              <td>
                {c.cpu_pct != null ? `${c.cpu_pct}% · ${c.decoding}` : ""}
                {(c.pace_s != null || c.gop_s) && (
                  <div className={pipe.cellNote}>
                    {[c.pace_s != null ? `used ${paceText(c.pace_s)}` : "", c.gop_s ? `keyframe every ${c.gop_s} s` : ""]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
              </td>
              <td>{c.wanted_by.map(owner).join(", ")}</td>
              <td style={c.back_in_s != null ? { color: "var(--bad)" } : undefined}>
                {c.back_in_s != null ? `back in ${seconds(c.back_in_s)}` : c.missed ? `${c.missed} in a row` : ""}
              </td>
              <td>
                {c.surveys.length ? (
                  <button
                    className={pipe.link}
                    onClick={() => onSurveys(c.camera)}
                    style={c.surveys[0].outcome === "stream" || c.surveys[0].outcome === "read" ? undefined : { color: "var(--warn)" }}
                    title="Its last surveys: what came of each, and why"
                  >
                    {c.surveys[0].outcome}
                  </button>
                ) : (
                  ""
                )}
              </td>
              <td>
                <button className={ui.iconButton} onClick={() => onLive(c)} title="A live view of this channel's stream" aria-label={`Live view of ${c.title}, ${c.channel}`}>
                  ↗
                </button>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>No cameras yet.</Empty>
      )}
    </section>
  );
}
