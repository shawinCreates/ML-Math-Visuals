import { Topic } from "../topics";
import { Formula } from "./Formula";

export function ComingSoon({ topic }: { topic: Topic }) {
  return (
    <div className="coming-soon">
      <p className="coming-soon-summary">{topic.summary}</p>
      {topic.equations && topic.equations.length > 0 && (
        <div className="equation-cards">
          {topic.equations.map((eq, i) => (
            <div className="equation-card" key={i}>
              <Formula block tex={eq.tex} />
              <div className="equation-caption">{eq.caption}</div>
            </div>
          ))}
        </div>
      )}
      <div className="callout">
        The interactive sandbox for this topic is on its way. Every other topic in the sidebar is
        fully playable in the meantime.
      </div>
    </div>
  );
}
