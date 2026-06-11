import { useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { useTicker } from "../components/useTicker";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";
import { SVM3D } from "./SVM3D";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): LabeledPoint[] {
  const pts: LabeledPoint[] = [];
  for (let i = 0; i < 9; i++) {
    pts.push({ x: clamp(3 + randn() * 1.1, 0.2, 9.8), y: clamp(7 + randn() * 1.1, 0.2, 9.8), label: 0 });
    pts.push({ x: clamp(7 + randn() * 1.1, 0.2, 9.8), y: clamp(3 + randn() * 1.1, 0.2, 9.8), label: 1 });
  }
  return pts;
}

interface Params {
  w1: number;
  w2: number;
  b: number;
}

const INIT: Params = { w1: 0.3, w2: 0.3, b: -3 };
const ySign = (label: number) => (label === 1 ? 1 : -1);

function svmLoss(points: LabeledPoint[], p: Params, lambda: number): number {
  const reg = (lambda / 2) * (p.w1 * p.w1 + p.w2 * p.w2);
  if (points.length === 0) return reg;
  let hinge = 0;
  for (const pt of points) {
    hinge += Math.max(0, 1 - ySign(pt.label) * (p.w1 * pt.x + p.w2 * pt.y + p.b));
  }
  return reg + hinge / points.length;
}

export function SVM() {
  const [points, setPoints] = useState<LabeledPoint[]>(samplePoints);
  const [activeClass, setActiveClass] = useState(0);
  const [params, setParams] = useState<Params>(INIT);
  const [lambda, setLambda] = useState(0.05);
  const [lr, setLr] = useState(0.05);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y, label: activeClass }));

  const loss = useMemo(() => svmLoss(points, params, lambda), [points, params, lambda]);

  const supportIdx = useMemo(() => {
    const set = new Set<number>();
    points.forEach((pt, i) => {
      const f = params.w1 * pt.x + params.w2 * pt.y + params.b;
      if (ySign(pt.label) * f <= 1 + 1e-6) set.add(i);
    });
    return set;
  }, [points, params]);

  const marginWidth = useMemo(() => {
    const norm = Math.hypot(params.w1, params.w2);
    return norm > 1e-9 ? 2 / norm : Infinity;
  }, [params]);

  function gdStep(): boolean {
    if (points.length === 0) return false;
    const n = points.length;
    let d1 = lambda * params.w1;
    let d2 = lambda * params.w2;
    let db = 0;
    for (const pt of points) {
      const ys = ySign(pt.label);
      const f = params.w1 * pt.x + params.w2 * pt.y + params.b;
      if (ys * f < 1) {
        // subgradient of the hinge: only violating / margin points push
        d1 -= (ys * pt.x) / n;
        d2 -= (ys * pt.y) / n;
        db -= ys / n;
      }
    }
    const next = { w1: params.w1 - lr * d1, w2: params.w2 - lr * d2, b: params.b - lr * db };
    setParams(next);
    setLossHistory((h) => [...h.slice(-499), svmLoss(points, next, lambda)]);
    return true;
  }

  const ticker = useTicker(gdStep);

  function reset() {
    ticker.setRunning(false);
    setParams(INIT);
    setLossHistory([]);
  }

  /** Line w1·x + w2·y + b = level, clipped to the plot. */
  function levelLine(level: number) {
    const { w1, w2, b } = params;
    if (Math.abs(w1) < 1e-9 && Math.abs(w2) < 1e-9) return null;
    if (Math.abs(w2) >= Math.abs(w1)) {
      return {
        x1: scale.xDomain[0],
        y1: (level - b - w1 * scale.xDomain[0]) / w2,
        x2: scale.xDomain[1],
        y2: (level - b - w1 * scale.xDomain[1]) / w2,
      };
    }
    return {
      x1: (level - b - w2 * scale.yDomain[0]) / w1,
      y1: scale.yDomain[0],
      x2: (level - b - w2 * scale.yDomain[1]) / w1,
      y2: scale.yDomain[1],
    };
  }

  const mid = levelLine(0);
  const up = levelLine(1);
  const dn = levelLine(-1);

  return (
    <div>
      <Hint>
        Train, then look at which points are circled: only those <em>support vectors</em> hold the
        boundary up. Drag any other point around — nothing moves until it reaches the margin.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          <defs>
            <clipPath id="svm-clip">
              <rect
                x={scale.innerLeft}
                y={scale.innerTop}
                width={scale.innerRight - scale.innerLeft}
                height={scale.innerBottom - scale.innerTop}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#svm-clip)">
            {up && dn && (
              <polygon
                points={`${scale.sx(up.x1)},${scale.sy(up.y1)} ${scale.sx(up.x2)},${scale.sy(up.y2)} ${scale.sx(dn.x2)},${scale.sy(dn.y2)} ${scale.sx(dn.x1)},${scale.sy(dn.y1)}`}
                fill="var(--accent)"
                opacity={0.07}
              />
            )}
            {up && (
              <line x1={scale.sx(up.x1)} y1={scale.sy(up.y1)} x2={scale.sx(up.x2)} y2={scale.sy(up.y2)} stroke={CLASS_COLORS[1]} strokeWidth={1.5} strokeDasharray="5 4" />
            )}
            {dn && (
              <line x1={scale.sx(dn.x1)} y1={scale.sy(dn.y1)} x2={scale.sx(dn.x2)} y2={scale.sy(dn.y2)} stroke={CLASS_COLORS[0]} strokeWidth={1.5} strokeDasharray="5 4" />
            )}
            {mid && (
              <line x1={scale.sx(mid.x1)} y1={scale.sy(mid.y1)} x2={scale.sx(mid.x2)} y2={scale.sy(mid.y2)} stroke="var(--ink)" strokeWidth={2.5} />
            )}
          </g>
          {points.map((p, i) => (
            <g key={i}>
              {supportIdx.has(i) && (
                <circle cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={11} fill="none" stroke="var(--danger)" strokeWidth={2} />
              )}
              <circle cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} fill={CLASS_COLORS[p.label]} stroke="#fff" strokeWidth={1.5} />
            </g>
          ))}
        </svg>

        <div className="viz-side">
          <div className="btn-row">
            {[0, 1].map((c) => (
              <button
                key={c}
                className={"btn btn-class" + (activeClass === c ? " btn-class-active" : "")}
                style={{ ["--class-color" as string]: CLASS_COLORS[c] }}
                onClick={() => setActiveClass(c)}
              >
                Add class {c}
              </button>
            ))}
          </div>

          <div className="stat-grid">
            <Stat label="objective" value={formatNum(loss, 4)} />
            <Stat label={<>margin <Formula tex="2/\lVert\mathbf{w}\rVert" /></>} value={Number.isFinite(marginWidth) ? formatNum(marginWidth, 2) : "∞"} />
            <Stat label="support vectors" value={supportIdx.size} />
            <Stat label={<Formula tex="\lVert\mathbf{w}\rVert" />} value={formatNum(Math.hypot(params.w1, params.w2), 3)} />
          </div>

          <Slider label="regularization λ" value={lambda} min={0.001} max={0.5} step={0.001} onChange={setLambda} format={(v) => v.toFixed(3)} />
          <Slider label="learning rate α" value={lr} min={0.005} max={0.2} step={0.005} onChange={setLr} format={(v) => v.toFixed(3)} />

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Train (subgradient descent)"}
            </button>
            <button className="btn" onClick={gdStep}>Step once</button>
            <button className="btn" onClick={reset}>Reset</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setPoints(samplePoints()); reset(); }}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => { setPoints([]); reset(); }}>Clear points</button>
          </div>

          <LossChart history={lossHistory} label="Hinge + L2 objective" />
        </div>
      </div>

      <Explain title="1 · Many lines separate — SVM wants the widest street">
        <p>
          Any boundary that classifies correctly satisfies <Formula tex="y_i(\mathbf{w}^\top\mathbf{x}_i + b) > 0" />{" "}
          (labels coded <Formula tex="y_i \in \{-1, +1\}" />). The SVM demands more: a buffer zone.
          The dashed lines are <Formula tex="\mathbf{w}^\top\mathbf{x} + b = \pm 1" />, and the
          street between them has width <Formula tex="2/\lVert\mathbf{w}\rVert" />. Maximizing the
          margin is therefore <em>minimizing</em> <Formula tex="\lVert\mathbf{w}\rVert" />:
        </p>
        <Formula block tex="\min_{\mathbf{w}, b}\; \tfrac{1}{2}\lVert\mathbf{w}\rVert^2 \quad \text{s.t.} \quad y_i(\mathbf{w}^\top\mathbf{x}_i + b) \ge 1" />
      </Explain>

      <Explain title="2 · The hinge loss makes it trainable">
        <p>
          Real data overlaps, so the constraint becomes a penalty — the <em>hinge loss</em> — plus
          the margin term:
        </p>
        <Formula block tex="L = \frac{\lambda}{2}\lVert\mathbf{w}\rVert^2 + \frac{1}{n}\sum_{i=1}^{n} \max\!\big(0,\; 1 - y_i(\mathbf{w}^\top\mathbf{x}_i + b)\big)" />
        <p>
          The hinge is exactly zero for points safely beyond the margin — which is the whole story
          of support vectors. In the gradient step, only points with{" "}
          <Formula tex="y_i f(\mathbf{x}_i) < 1" /> contribute anything; the rest are invisible to
          training. The circled points are the ones currently “holding” the boundary. Compare with
          logistic regression, where <em>every</em> point always pulls a little.
        </p>
      </Explain>

      <Explain title="3 · λ trades margin width against violations">
        <p>
          Large <Formula tex="\lambda" /> punishes <Formula tex="\lVert\mathbf{w}\rVert" /> hard:
          the street widens, swallowing more points as (violating) support vectors — higher bias,
          smoother decisions. Tiny <Formula tex="\lambda" /> lets the street shrink to satisfy every
          point — closer to the hard margin, sensitive to outliers. Slide λ while training runs and
          watch the dashed lines breathe. For boundaries that curve, the kernel trick swaps every
          dot product for a similarity like{" "}
          <Formula tex="K(\mathbf{x}, \mathbf{x}') = e^{-\gamma\lVert\mathbf{x}-\mathbf{x}'\rVert^2}" />{" "}
          — same math, richer geometry.
        </p>
      </Explain>
      <SVM3D />
    </div>
  );
}
