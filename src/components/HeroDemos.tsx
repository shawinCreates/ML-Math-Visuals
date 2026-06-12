import { useEffect, useRef, useState } from "react";

export const DEMO_W = 420;
export const DEMO_H = 280;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ----------------------------------------------------------------
   1. A real neural network (2-4-4-1, tanh) training on XOR
   ---------------------------------------------------------------- */

const LAYERS = [2, 4, 4, 1];
const LR = 0.04;
const XOR: [number, number, number][] = [
  [-1, -1, -1],
  [-1, 1, 1],
  [1, -1, 1],
  [1, 1, -1],
];

function nodePos(layer: number, i: number): [number, number] {
  const x = 50 + (layer * (DEMO_W - 100)) / (LAYERS.length - 1);
  const n = LAYERS[layer];
  const gap = Math.min(56, (DEMO_H - 90) / Math.max(n - 1, 1));
  return [x, DEMO_H / 2 - 8 + (i - (n - 1) / 2) * gap];
}

interface Net {
  W: number[][][];
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
      net.W[l].map((row, j) => Math.tanh(row.reduce((s, w, i) => s + w * acts[l][i], net.B[l][j])))
    );
  }
  return acts;
}

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
        for (let i = 0; i < acts[l].length; i++) net.W[l][j][i] -= LR * delta[j] * acts[l][i];
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

export function NetworkDemo() {
  const [animated] = useState(() => !reducedMotion());
  const netRef = useRef<Net>();
  if (!netRef.current) netRef.current = makeNet();

  const edges: EdgeRef[] = [];
  for (let l = 0; l < LAYERS.length - 1; l++) {
    for (let j = 0; j < LAYERS[l + 1]; j++) {
      for (let i = 0; i < LAYERS[l]; i++) edges.push({ l, i, j, line: null, dot: null });
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
    let pulseStart = performance.now();
    let acts = forward(net, [XOR[0][0], XOR[0][1]]);
    const SEG_MS = 700;
    const REST_MS = 500;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frame++;
      const loss = trainStep(net);
      if (loss < 0.004) {
        netRef.current = makeNet();
        Object.assign(net, netRef.current);
      }
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
      const t = now - pulseStart;
      if (t > (LAYERS.length - 1) * SEG_MS + REST_MS) {
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
      viewBox={`0 0 ${DEMO_W} ${DEMO_H}`}
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
          <circle key={"d" + k} ref={(el) => (edgeRefs.current[k].dot = el)} r="2.4" fill="var(--accent)" opacity="0" />
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
      <text x={nodePos(0, 0)[0]} y={DEMO_H - 14} textAnchor="middle" className="hero-demo-label">
        input
      </text>
      <text x={nodePos(3, 0)[0]} y={DEMO_H - 14} textAnchor="middle" className="hero-demo-label">
        output
      </text>
      <text ref={lossRef} x="16" y="22" className="hero-demo-label">
        {animated ? "training on XOR" : "a 2-4-4-1 network"}
      </text>
    </svg>
  );
}

/* ----------------------------------------------------------------
   2. Gradient descent rolling down a loss curve
   ---------------------------------------------------------------- */

const CURVE_A = 0.36;
const TRAIL = 9;
const gx = (x: number) => DEMO_W / 2 + x * 44;
const gy = (y: number) => DEMO_H - 38 - y * 32;

function curvePath(): string {
  const pts: string[] = [];
  for (let x = -4.4; x <= 4.4; x += 0.2) {
    pts.push(`${gx(x).toFixed(1)},${gy(CURVE_A * x * x).toFixed(1)}`);
  }
  return "M" + pts.join(" L");
}

export function DescentDemo() {
  const ballRef = useRef<SVGCircleElement>(null);
  const trailRefs = useRef<(SVGCircleElement | null)[]>([]);
  const stepRef = useRef<SVGTextElement>(null);
  const [animated] = useState(() => !reducedMotion());

  useEffect(() => {
    if (!animated) return;
    let x = -3.7;
    let steps = 0;
    const trail = Array.from({ length: TRAIL }, () => x);
    let pauseUntil = 0;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 16.7, 3);
      last = now;
      if (now >= pauseUntil) {
        const grad = 2 * CURVE_A * x;
        x -= 0.055 * grad * dt;
        steps++;
        if (steps % 4 === 0) {
          stepRef.current?.replaceChildren(
            document.createTextNode(`θ ← θ - α·∇L   gradient ${(2 * CURVE_A * x).toFixed(2)}`)
          );
        }
        if (Math.abs(grad) < 0.045) {
          pauseUntil = now + 1300;
          x = (x >= 0 ? -1 : 1) * (2.9 + Math.random() * 1.3);
          trail.fill(x);
        }
      }
      trail[0] += (x - trail[0]) * 0.32 * dt;
      for (let i = 1; i < TRAIL; i++) trail[i] += (trail[i - 1] - trail[i]) * 0.32 * dt;
      ballRef.current?.setAttribute("cx", String(gx(x)));
      ballRef.current?.setAttribute("cy", String(gy(CURVE_A * x * x) - 8));
      trailRefs.current.forEach((dot, i) => {
        if (!dot) return;
        dot.setAttribute("cx", String(gx(trail[i])));
        dot.setAttribute("cy", String(gy(CURVE_A * trail[i] * trail[i]) - 8));
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated]);

  const restX = animated ? -3.7 : 0;
  return (
    <svg
      className="hero-demo-svg"
      viewBox={`0 0 ${DEMO_W} ${DEMO_H}`}
      role="img"
      aria-label="Gradient descent: a point rolling down a loss curve to its minimum"
    >
      {[1, 2, 3, 4].map((i) => (
        <line key={i} x1={16} x2={DEMO_W - 16} y1={gy(i * 1.55)} y2={gy(i * 1.55)} stroke="var(--grid)" />
      ))}
      <line x1={16} x2={DEMO_W - 16} y1={gy(0)} y2={gy(0)} stroke="var(--border-strong)" />
      <path d={curvePath()} fill="none" stroke="var(--ink)" strokeWidth="2" />
      <text x={gx(-4.1)} y={gy(CURVE_A * 16) + 2} className="hero-demo-label">
        L(θ)
      </text>
      <text x={DEMO_W - 24} y={gy(0) + 16} className="hero-demo-label">
        θ
      </text>
      <text ref={stepRef} x="16" y="22" className="hero-demo-label">
        θ ← θ - α·∇L
      </text>
      {animated &&
        Array.from({ length: TRAIL }, (_, i) => (
          <circle
            key={i}
            ref={(el) => (trailRefs.current[i] = el)}
            r={Math.max(1.2, 3.6 - i * 0.3)}
            opacity={0.42 - i * 0.04}
            fill="var(--accent)"
          />
        ))}
      <circle
        ref={ballRef}
        cx={gx(restX)}
        cy={gy(CURVE_A * restX * restX) - 8}
        r="7"
        fill="var(--accent)"
        stroke="#fff"
        strokeWidth="2"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------
   3. Attention: real softmax over dot products of drifting vectors
   ---------------------------------------------------------------- */

const TOKENS = ["the", "cat", "sat", "on", "the", "mat"];
// 2D embeddings; each drifts at its own angular speed so attention shifts live
const EMB_BASE = [0.4, 2.1, 2.5, 4.4, 0.5, 1.7];
const EMB_SPEED = [0.05, 0.11, 0.08, 0.13, 0.05, 0.1];

function attentionWeights(query: number, t: number): number[] {
  const vecs = TOKENS.map((_, i) => {
    const a = EMB_BASE[i] + EMB_SPEED[i] * t;
    return [Math.cos(a), Math.sin(a)];
  });
  const q = vecs[query];
  const scores = vecs.map((k) => (q[0] * k[0] + q[1] * k[1]) * 2.2);
  const exps = scores.map((s, i) => (i === query ? 0 : Math.exp(s)));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map((e) => e / sum);
}

export function AttentionDemo() {
  const [animated] = useState(() => !reducedMotion());
  const arcRefs = useRef<(SVGPathElement | null)[]>([]);
  const barRefs = useRef<(SVGRectElement | null)[]>([]);
  const tokRefs = useRef<(SVGCircleElement | null)[]>([]);

  const tx = (i: number) => 52 + (i * (DEMO_W - 104)) / (TOKENS.length - 1);
  const TY = 170;

  useEffect(() => {
    if (!animated) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const query = Math.floor(t / 2.4) % TOKENS.length;
      const w = attentionWeights(query, t);
      TOKENS.forEach((_, i) => {
        const arc = arcRefs.current[i];
        const bar = barRefs.current[i];
        const tok = tokRefs.current[i];
        if (tok) {
          tok.setAttribute("fill", i === query ? "var(--accent)" : "var(--panel)");
          tok.setAttribute("stroke", i === query ? "var(--accent)" : "var(--border-strong)");
        }
        if (bar) {
          const hgt = 4 + w[i] * 56;
          bar.setAttribute("height", hgt.toFixed(1));
          bar.setAttribute("y", (TY + 34 + 60 - hgt).toFixed(1));
          bar.setAttribute("opacity", i === query ? "0.15" : "1");
        }
        if (!arc) return;
        if (i === query) {
          arc.setAttribute("opacity", "0");
          return;
        }
        const x1 = tx(query);
        const x2 = tx(i);
        const lift = Math.min(Math.abs(x2 - x1) * 0.55, 120);
        arc.setAttribute("d", `M ${x1} ${TY - 14} Q ${(x1 + x2) / 2} ${TY - 14 - lift} ${x2} ${TY - 14}`);
        arc.setAttribute("stroke-width", (0.8 + w[i] * 7).toFixed(2));
        arc.setAttribute("opacity", (0.25 + w[i] * 0.75).toFixed(2));
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated]);

  const staticW = attentionWeights(2, 0);
  return (
    <svg
      className="hero-demo-svg"
      viewBox={`0 0 ${DEMO_W} ${DEMO_H}`}
      role="img"
      aria-label="Attention weights between words, recomputed live as their vectors drift"
    >
      <text x="16" y="22" className="hero-demo-label">
        softmax(q·k / √d) · live
      </text>
      {TOKENS.map((_, i) => (
        <path
          key={"a" + i}
          ref={(el) => (arcRefs.current[i] = el)}
          d=""
          fill="none"
          stroke="var(--accent)"
          strokeLinecap="round"
          opacity={animated ? 0 : i === 2 ? 0 : 0.25 + staticW[i] * 0.75}
        />
      ))}
      {TOKENS.map((tok, i) => (
        <g key={"t" + i}>
          <circle
            ref={(el) => (tokRefs.current[i] = el)}
            cx={tx(i)}
            cy={TY}
            r="11"
            fill={i === 2 ? "var(--accent)" : "var(--panel)"}
            stroke={i === 2 ? "var(--accent)" : "var(--border-strong)"}
            strokeWidth="1.5"
          />
          <text x={tx(i)} y={TY + 26} textAnchor="middle" className="hero-demo-label">
            {tok}
          </text>
          <rect
            ref={(el) => (barRefs.current[i] = el)}
            x={tx(i) - 7}
            y={TY + 34 + 60 - (4 + staticW[i] * 56)}
            width="14"
            height={4 + staticW[i] * 56}
            rx="3"
            fill="var(--accent)"
            opacity={i === 2 ? 0.15 : 1}
          />
        </g>
      ))}
    </svg>
  );
}
