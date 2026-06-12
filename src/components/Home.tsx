import { ReactNode, useEffect, useRef, useState } from "react";
import { ALL_TOPICS, CATEGORIES, Topic, findTopic } from "../topics";
import { PATHS } from "../paths";
import { countExperimentsDone } from "./TryThis";
import { NetworkDemo, DescentDemo, AttentionDemo } from "./HeroDemos";
import { TopicThumb } from "./TopicThumb";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const DEMOS = [
  { id: "network", label: "Neural net", caption: "a real network learning XOR, live", C: NetworkDemo },
  { id: "descent", label: "Gradient descent", caption: "stepping down the loss curve, live", C: DescentDemo },
  { id: "attention", label: "Attention", caption: "real softmax over drifting word vectors", C: AttentionDemo },
] as const;

const ROADMAP = [
  { title: "Word Embeddings", note: "Word2Vec: words as vectors you can do arithmetic on" },
  { title: "Backprop by Hand", note: "the chain rule walked through one weight at a time" },
  { title: "Bayesian Inference", note: "beliefs as distributions that update with evidence" },
  { title: "GANs", note: "two networks training against each other" },
  { title: "Diffusion Models", note: "generating images by learning to undo noise" },
];

/* ---------- scroll reveal ---------- */

function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -60px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  return (
    <div ref={ref} className={"reveal" + (shown ? " reveal-in" : "")}>
      {children}
    </div>
  );
}

/* ---------- progress ring ---------- */

function ProgressRing({ value, max }: { value: number; max: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? value / max : 0;
  return (
    <svg className="progress-ring" width="60" height="60" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--grid)" strokeWidth="5" />
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" className="progress-ring-num">
        {value}
      </text>
    </svg>
  );
}

/* ---------- home ---------- */

interface HomeProps {
  visited: Set<string>;
  lastTopicId: string | null;
  onSelect(id: string): void;
}

export function Home({ visited, lastTopicId, onSelect }: HomeProps) {
  const catalogRef = useRef<HTMLDivElement>(null);
  const [demoId, setDemoId] = useState<(typeof DEMOS)[number]["id"]>("network");
  const demo = DEMOS.find((d) => d.id === demoId)!;
  const experiments = countExperimentsDone();
  const started = visited.size > 0;
  const resume =
    (lastTopicId && findTopic(lastTopicId)) ||
    ALL_TOPICS.find((t) => !visited.has(t.id)) ||
    ALL_TOPICS[0];
  const upNext = ALL_TOPICS.find((t) => !visited.has(t.id));

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <h1>See the math move.</h1>
          <p className="hero-sub">
            Drag the points, slide the parameters, run the training loops. 25
            interactive sandboxes where the equations react to you.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onSelect(resume.id)}>
              {started ? `Continue: ${resume.title}` : "Start learning"}
            </button>
            <button
              className="btn btn-lg"
              onClick={() =>
                catalogRef.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" })
              }
            >
              Browse topics
            </button>
          </div>
        </div>
        <div className="hero-demo">
          <div className="demo-tabs" role="tablist" aria-label="Live demos">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                role="tab"
                aria-selected={demoId === d.id}
                className={"demo-tab" + (demoId === d.id ? " demo-tab-active" : "")}
                onClick={() => setDemoId(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <demo.C key={demo.id} />
          <p className="hero-demo-caption">{demo.caption}</p>
        </div>
      </section>

      <section className="home-progress" aria-label="Your progress">
        <ProgressRing value={visited.size} max={ALL_TOPICS.length} />
        <div>
          <div className="home-progress-title">
            {started
              ? `${visited.size} of ${ALL_TOPICS.length} topics explored`
              : "A guided tour through the math of machine learning"}
          </div>
          <div className="home-progress-sub">
            {started
              ? `${experiments} guided experiment${experiments === 1 ? "" : "s"} completed${
                  upNext ? ` · up next: ${upNext.title}` : " · all topics visited"
                }`
              : "Each topic is a hands-on sandbox with guided experiments. Start anywhere."}
          </div>
        </div>
      </section>

      <section className="paths" aria-label="Learning paths">
        <div className="catalog-head">
          <h2>Learning paths</h2>
          <span className="catalog-count">pick a track, follow the steps</span>
        </div>
        <div className="path-cards">
          {PATHS.map((p) => {
            const done = p.topics.filter((id) => visited.has(id)).length;
            const nextId = p.topics.find((id) => !visited.has(id)) ?? p.topics[0];
            const next = findTopic(nextId)!;
            const complete = done === p.topics.length;
            return (
              <div key={p.id} className="path-card">
                <div className="path-name">{p.name}</div>
                <p className="path-desc">{p.description}</p>
                <div className="path-bar" aria-hidden="true">
                  <div className="path-bar-fill" style={{ width: `${(done / p.topics.length) * 100}%` }} />
                </div>
                <div className="path-meta">
                  {done} of {p.topics.length} steps done
                </div>
                <button className="btn path-btn" onClick={() => onSelect(next.id)}>
                  {complete ? `Revisit: ${next.title}` : done === 0 ? `Start: ${next.title}` : `Next: ${next.title}`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <div className="catalog" ref={catalogRef}>
        {CATEGORIES.map((cat) => (
          <Reveal key={cat.name}>
            <section className="catalog-section">
              <div className="catalog-head">
                <h2>{cat.name}</h2>
                <span className="catalog-count">
                  {cat.topics.filter((t) => visited.has(t.id)).length}/{cat.topics.length} explored
                </span>
              </div>
              <div className="topic-cards">
                {cat.topics.map((t: Topic, i) => (
                  <button
                    key={t.id}
                    className="topic-card"
                    style={{ "--i": i } as React.CSSProperties}
                    onClick={() => onSelect(t.id)}
                  >
                    <TopicThumb id={t.id} />
                    <span className="topic-card-top">
                      <span className={"level level-" + t.level.toLowerCase()}>{t.level}</span>
                      <span className="topic-min">~{t.minutes} min</span>
                      {visited.has(t.id) && (
                        <svg
                          className="topic-card-check"
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-label="Visited"
                        >
                          <circle cx="8" cy="8" r="7" fill="var(--accent-soft)" />
                          <polyline
                            points="4.6,8.4 7,10.8 11.4,5.6"
                            stroke="var(--accent-strong)"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="topic-card-title">{t.title}</span>
                    <span className="topic-card-blurb">{t.blurb}</span>
                  </button>
                ))}
              </div>
            </section>
          </Reveal>
        ))}

        <Reveal>
          <section className="catalog-section" aria-label="Planned topics">
            <div className="catalog-head">
              <h2>On the roadmap</h2>
              <span className="catalog-count">{ROADMAP.length} planned</span>
            </div>
            <div className="topic-cards">
              {ROADMAP.map((r) => (
                <div key={r.title} className="roadmap-card">
                  <span className="roadmap-tag">planned</span>
                  <span className="topic-card-title">{r.title}</span>
                  <span className="topic-card-blurb">{r.note}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      </div>
    </div>
  );
}
