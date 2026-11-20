/** Topology's picture, drawn by Mermaid with its ELK layout (docs/design/topology.md, "The
 * editor": ELK nests the boxes cleanly and puts each line's directions in its middle).
 * Mermaid 12 carries ELK itself (the separate @mermaid-js/layout-elk would be a second
 * copy). It is large, so it is loaded only when this is first drawn. */

import { useEffect, useState } from "react";
import { AreaHead } from "../page";
import { CopyButton } from "../ui";
import guest from "../guest.module.css";
import ui from "../ui.module.css";
import css from "./topology.module.css";

type Mermaid = typeof import("mermaid").default;

let loading: Promise<Mermaid> | undefined;
function mermaid(): Promise<Mermaid> {
  loading ??= import("mermaid").then(
    ({ default: m }) => m,
    (err) => {
      loading = undefined; // not kept: opening the page again tries again
      throw err;
    },
  );
  return loading;
}

let drawn = 0;

export function Picture({ text }: { text: string }) {
  const [svg, setSvg] = useState<string>();
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    let current = true;
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    mermaid()
      .then((m) => {
        // Its own size, scrolled in its box (topology.module.css): fitted to a phone, the
        // names are too small to read.
        m.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "strict", flowchart: { useMaxWidth: false } });
        return m.render(`topology-${++drawn}`, `---\nconfig:\n  layout: elk\n---\n${text}`);
      })
      .then(
        ({ svg }) => current && (setSvg(svg), setProblem(undefined)),
        (err) => current && setProblem(`The picture couldn't be drawn: ${(err as Error)?.message ?? err}`),
      );
    return () => {
      current = false;
    };
  }, [text]);

  return (
    <section className={guest.area}>
      <AreaHead
        title="Picture"
        blurb="Drawn from the list above, to check it by: a room standing on its own has no way in. Mermaid places everything itself, so a way marked north isn't drawn upwards."
        action={<CopyButton className={ui.button} text={text} />}
      />
      {problem && <div className={guest.warning}>{problem}</div>}
      {!svg && !problem && <p className={guest.notice}>Drawing…</p>}
      {svg && <div className={css.picture} dangerouslySetInnerHTML={{ __html: svg }} />}
      <details className={ui.details}>
        <summary>Its Mermaid text, for House Manual or a document</summary>
        <pre className={css.text}>{text}</pre>
      </details>
    </section>
  );
}
