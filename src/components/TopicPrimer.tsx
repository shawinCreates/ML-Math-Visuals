import { Fragment } from "react";
import { TOPIC_EXTRAS } from "../content";

const KEYWORDS =
  /\b(import|from|def|return|for|while|in|if|else|not|and|or|print|class|lambda|range|True|False|None)\b/;

/** Minimal Python tinting: comments muted, strings teal, keywords violet. */
function highlight(line: string, key: number) {
  const hashAt = line.indexOf("#");
  const code = hashAt >= 0 ? line.slice(0, hashAt) : line;
  const comment = hashAt >= 0 ? line.slice(hashAt) : "";
  const parts = code.split(/("[^"]*"|'[^']*')/g);
  return (
    <Fragment key={key}>
      {parts.map((part, i) => {
        if (/^["']/.test(part)) {
          return (
            <span key={i} className="code-str">
              {part}
            </span>
          );
        }
        const words = part.split(KEYWORDS);
        return words.map((w, j) =>
          KEYWORDS.test(w) && words.length > 1 && j % 2 === 1 ? (
            <span key={`${i}-${j}`} className="code-kw">
              {w}
            </span>
          ) : (
            <Fragment key={`${i}-${j}`}>{w}</Fragment>
          )
        );
      })}
      {comment && <span className="code-comment">{comment}</span>}
      {"\n"}
    </Fragment>
  );
}

/** Beginner primer: why the model is used, what its data looks like, core code. */
export function TopicPrimer({ topicId }: { topicId: string }) {
  const extra = TOPIC_EXTRAS[topicId];
  if (!extra) return null;

  return (
    <section className="primer" aria-label="Topic primer">
      <p className="topic-intro">{extra.intro}</p>
      <div className="primer-grid">
        <figure className="primer-card">
          <figcaption>
            <span className="primer-tag">the data</span>
            {extra.dataset.caption}
          </figcaption>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {extra.dataset.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {extra.dataset.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
        <figure className="primer-card">
          <figcaption>
            <span className="primer-tag">the code</span>
            {extra.codeCaption ?? "The whole idea in a few lines"}
          </figcaption>
          <pre className="code-block">
            <code>{extra.code.split("\n").map((line, i) => highlight(line, i))}</code>
          </pre>
        </figure>
      </div>
    </section>
  );
}
