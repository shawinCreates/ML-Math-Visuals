import { useState } from "react";

const KEY = "mlmv:experiments";

export function loadExperiments(): Record<string, number[]> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) || "{}");
    return raw && typeof raw === "object" ? (raw as Record<string, number[]>) : {};
  } catch {
    return {};
  }
}

export function countExperimentsDone(): number {
  return Object.values(loadExperiments()).reduce(
    (sum, ids) => sum + (Array.isArray(ids) ? ids.length : 0),
    0
  );
}

/** Guided-experiment checklist for a topic, persisted per topic in localStorage. */
export function TryThis({ topicId, prompts }: { topicId: string; prompts: string[] }) {
  const [done, setDone] = useState<number[]>(
    () => loadExperiments()[topicId]?.filter((i) => i >= 0 && i < prompts.length) ?? []
  );

  function toggle(i: number) {
    setDone((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      const all = loadExperiments();
      all[topicId] = next;
      try {
        localStorage.setItem(KEY, JSON.stringify(all));
      } catch {
        /* private mode: checklist just won't persist */
      }
      return next;
    });
  }

  const allDone = done.length === prompts.length;

  return (
    <details className="try-this" open={!allDone && done.length > 0}>
      <summary>
        <svg className="try-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <polyline points="4,2.5 8.5,6 4,9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="try-this-title">Try this</span>
        <span className="try-this-sub">
          {prompts.length} guided experiment{prompts.length > 1 ? "s" : ""}
        </span>
        <span className={"try-this-count" + (allDone ? " try-this-count-done" : "")}>
          {done.length}/{prompts.length}
        </span>
      </summary>
      <ul className="try-list">
        {prompts.map((p, i) => {
          const checked = done.includes(i);
          return (
            <li key={i}>
              <label className={"try-item" + (checked ? " try-item-done" : "")}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(i)}
                  aria-label={`Experiment ${i + 1}: ${p}`}
                />
                <span className="try-check" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <polyline
                      points="1.8,5.8 4.3,8.3 9.2,2.8"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="try-text">{p}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
