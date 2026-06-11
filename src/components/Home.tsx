import { ReactNode, useEffect, useRef, useState } from "react";
import { ALL_TOPICS, CATEGORIES, Topic, findTopic } from "../topics";
import { countExperimentsDone } from "./TryThis";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ----------------------------------------------------------------
   live hero demo: a real neural network (2-4-4-1, tanh) training
   on XOR with backpropagation, rendered as it learns
   ---------------------------------------------------------------- */

const LAYERS = [2, 4, 4, 1];
const NET_W = 420;
const NET_H = 280;
const LR = 0.04;
// XOR with ±1 encoding: [x1, x2, target]
const XOR: [number, number, number][] = [
  [-1, -1, -1],
  [-1, 1, 1],
  [1, -1, 1],
  [1, 1, -1],
];

function nodePos(layer: number, i: number): [number, number] {
  const x = 50 + (layer * (NET_W - 100)) / (LAYERS.length - 1);
  const n = LAYERS[layer];
  const gap = Math.min(56, (NET_H - 90) / Math.max(n - 1, 1));
  const y = NET_H / 2 - 8 + (i - (n - 1) / 2) * gap;
  return [x, y];
}

interface Net {
  W: number[][][]; // W[l][j][i]: layer l node i -> layer l+1 node j
  B: number[][];
}

function makeNet(): Net {
  return {
    W: LAYERS.slice(0, -1).map((nIn, l) =>
      Array.from({ length: LAYERS[l + 1] }, () =>
        Array.from({ length: nIn }, () => (Math.random() * 2 - 1) * 0.9)
      )
    ),
    B: LAYERS.slice(1).map((n) => Array.from({ length: n }, () => (Math.random() * 2 - 1) * 0.3)),
  };
}

function forward(net: Net, input: number[]): number[][] {
  const acts = [input];
  for (let l = 0; l < net.W.length; l++) {
    acts.push(
      net.W[l].map((row, j) =>
        Math.tanh(row.reduce((s, w, i) => s + w * acts[l][i], net.B[l][j]))
      )
    );
  }
  return acts;
}

/** One full-batch backprop pass over XOR; returns mean squared error. */
function trainStep(net: Net): number {
  let loss = 0;
  for (const [x1, x2, target] of XOR) {
    const acts = forward(net, [x1, x2]);
    const out = acts[acts.length - 1][0];
    loss += (out - target) ** 2;
    let delta = [(out - target) * (1 - out * out)];
    for (let l = net.W.length - 1; l >= 0; l--) {
      const prevDelta = acts[l].map((a, i) => {
        let s = 0;
        for (let j = 0; j < delta.length; j++) s += net.W[l][j][i] * delta[j];
        return s * (1 - a * a);
      });
      for (let j = 0; j < delta.length; j++) {
        net.B[l][j] -= LR * delta[j];
        for (let i = 0; i < acts[l].length; i++) {
          net.W[l][j][i] -= LR * delta[j] * acts[l][i];
        }
      }
      delta = prevDelta;
    }
  }
  return loss / XOR.length;
}

interface EdgeRef {
  l: number;
  i: number;
  j: number;
  line: SVGLineElement | null;
  dot: SVGCircleElement | null;
}

function HeroDemo() {
  const [animated] = useState(() => !reducedMotion());
  const netRef = useRef<Net>();
  if (!netRef.current) netRef.current = makeNet();

  const edges: EdgeRef[] = [];
  for (let l = 0; l < LAYERS.length - 1; l++) {
    for (let j = 0; j < LAYERS[l + 1]; j++) {
      for (let i = 0; i < LAYERS[l]; i++) {
        edges.push({ l, i, j, line: null, dot: null });
      }
    }
  }
  const edgeRefs = useRef(edges);
  const glowRefs = useRef<(SVGCircleElement | null)[][]>(LAYERS.map((n) => Array(n).fill(null)));
  const lossRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (!animated) return;
    const net = netRef.current!;
    let raf = 0;
    let frame = 0;
    let loss = 1;
    let pulseStart = performance.now();
    let acts = forward(net, [XOR[0][0], XOR[0][1]]);
    const SEG_MS = 700; // pulse travel time per layer
    const REST_MS = 500;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frame++;

      loss = trainStep(net);
      if (loss < 0.004) {
        // solved XOR: start over so the descent is always on display
        netRef.current = makeNet();
        Object.assign(net, netRef.current);
      }

      // weights change every frame; repaint them at ~12fps
      if (frame % 5 === 0) {
        for (const e of edgeRefs.current) {
          if (!e.line) continue;
          const w = net.W[e.l][e.j][e.i];
          e.line.setAttribute("stroke", w >= 0 ? "var(--accent)" : "#9aa6b8");
          e.line.setAttribute("stroke-width", (0.5 + Math.min(Math.abs(w), 2.4) * 0.9).toFixed(2));
          e.line.setAttribute("stroke-opacity", (0.16 + Math.min(Math.abs(w), 2) * 0.3).toFixed(2));
        }
        lossRef.current?.replaceChildren(
          document.createTextNode(`training on XOR · loss ${loss.toFixed(3)}`)
        );
      }

      // forward-pass pulse: one sample flows through, layer by layer
      const t = now - pulseStart;
      const totalMs = (LAYERS.length - 1) * SEG_MS + REST_MS;
      if (t > totalMs) {
        pulseStart = now;
        const sample = XOR[Math.floor(Math.random() * XOR.length)];
        acts = forward(net, [sample[0], sample[1]]);
      }
      const p = Math.min(t / SEG_MS, LAYERS.length - 1);
      const seg = Math.min(Math.floor(p), LAYERS.length - 2);
      const frac = p - seg;

      for (const e of edgeRefs.current) {
        if (!e.dot) continue;
        if (e.l !== seg || t > (LAYERS.length - 1) * SEG_MS) {
          e.dot.setAttribute("opacity", "0");
          continue;
        }
        const [x1, y1] = nodePos(e.l, e.i);
        const [x2, y2] = nodePos(e.l + 1, e.j);
        e.dot.setAttribute("cx", (x1 + (x2 - x1) * frac).toFixed(1));
        e.dot.setAttribute("cy", (y1 + (y2 - y1) * frac).toFixed(1));
        const strength = Math.abs(acts[e.l][e.i]);
        e.dot.setAttribute("opacity", (0.25 + 0.6 * strength * Math.sin(Math.PI * frac)).toFixed(2));
      }

      // node glow tracks activations as the pulse arrives
      glowRefs.current.forEach((layer, l) => {
        layer.forEach((glow, i) => {
          if (!glow) return;
          const arrived = l === 0 ? 1 : p >= l ? 1 : p > l - 1 ? frac : 0;
          glow.setAttribute("opacity", (Math.abs(acts[l][i]) * 0.85 * arrived).toFixed(2));
        });
      });
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated]);

  const net = netRef.current!;

  return (
    <svg
      className="hero-demo-svg"
      viewBox={`0 0 ${NET_W} ${NET_H}`}
      role="img"
      aria-label="A small neural network training on XOR, with signals flowing through its layers"
    >
      {edgeRefs.current.map((e, k) => {
        const [x1, y1] = nodePos(e.l, e.i);
        const [x2, y2] = nodePos(e.l + 1, e.j);
        const w = net.W[e.l][e.j][e.i];
        return (
          <line
            key={"e" + k}
            ref={(el) => (edgeRefs.current[k].line = el)}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={w >= 0 ? "var(--accent)" : "#9aa6b8"}
            strokeWidth={0.5 + Math.min(Math.abs(w), 2.4) * 0.9}
            strokeOpacity={0.16 + Math.min(Math.abs(w), 2) * 0.3}
          />
        );
      })}
      {animated &&
        edgeRefs.current.map((_, k) => (
          <circle
            key={"d" + k}
            ref={(el) => (edgeRefs.current[k].dot = el)}
            r="2.4"
            fill="var(--accent)"
            opacity="0"
          />
        ))}
      {LAYERS.map((n, l) =>
        Array.from({ length: n }, (_, i) => {
          const [x, y] = nodePos(l, i);
          return (
            <g key={`n${l}-${i}`}>
              <circle cx={x} cy={y} r="10" fill="var(--panel)" stroke="var(--border-strong)" strokeWidth="1.5" />
              <circle
                ref={(el) => (glowRefs.current[l][i] = el)}
                cx={x}
                cy={y}
                r="6"
                fill="var(--accent)"
                opacity={animated ? 0 : 0.45}
              />
            </g>
          );
        })
      )}
      <text x={nodePos(0, 0)[0]} y={NET_H - 14} textAnchor="middle" className="hero-demo-label">
        input
      </text>
      <text x={nodePos(3, 0)[0]} y={NET_H - 14} textAnchor="middle" className="hero-demo-label">
        output
      </text>
      <text ref={lossRef} x="16" y="22" className="hero-demo-label">
        {animated ? "training on XOR" : "a 2-4-4-1 network"}
      </text>
    </svg>
  );
}

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
              onClick={() => catalogRef.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" })}
            >
              Browse topics
            </button>
          </div>
        </div>
        <div className="hero-demo">
          <HeroDemo />
          <p className="hero-demo-caption">a real network learning XOR, live</p>
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
      </div>
    </div>
  );
}
