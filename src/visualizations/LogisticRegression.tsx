import { useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn, sigmoid } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { useTicker } from "../components/useTicker";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): LabeledPoint[] {
  const pts: LabeledPoint[] = [];
  for (let i = 0; i < 10; i++) {
    pts.push({ x: clamp(3 + randn() * 1.3, 0.2, 9.8), y: clamp(6.5 + randn() * 1.3, 0.2, 9.8), label: 0 });
    pts.push({ x: clamp(7 + randn() * 1.3, 0.2, 9.8), y: clamp(3.5 + randn() * 1.3, 0.2, 9.8), label: 1 });
  }
  return pts;
}

interface Params {
  w1: number;
  w2: number;
  b: number;
}

const INIT: Params = { w1: 0.1, w2: 0.1, b: -1 };

function bceLoss(points: LabeledPoint[], p: Params): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const pt of points) {
    const prob = clamp(sigmoid(p.w1 * pt.x + p.w2 * pt.y + p.b), 1e-7, 1 - 1e-7);
    sum += pt.label === 1 ? -Math.log(prob) : -Math.log(1 - prob);
  }
  return sum / points.length;
}

export function LogisticRegression() {
  const [points, setPoints] = useState<LabeledPoint[]>(samplePoints);
  const [activeClass, setActiveClass] = useState(0);
  const [params, setParams] = useState<Params>(INIT);
  const [lr, setLr] = useState(0.05);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y, label: activeClass }));

  const loss = useMemo(() => bceLoss(points, params), [points, params]);

  const accuracy = useMemo(() => {
    if (points.length === 0) return 0;
    let ok = 0;
    for (const pt of points) {
      const prob = sigmoid(params.w1 * pt.x + params.w2 * pt.y + params.b);
      if ((prob >= 0.5 ? 1 : 0) === pt.label) ok++;
    }
    return ok / points.length;
  }, [points, params]);

  function gdStep(): boolean {
    if (points.length === 0) return false;
    const n = points.length;
    let d1 = 0;
    let d2 = 0;
    let db = 0;
    for (const pt of points) {
      // ∂BCE/∂z = σ(z) − y : the same "error × input" pattern as linear regression
      const err = sigmoid(params.w1 * pt.x + params.w2 * pt.y + params.b) - pt.label;
      d1 += (err * pt.x) / n;
      d2 += (err * pt.y) / n;
      db += err / n;
    }
    const next = { w1: params.w1 - lr * d1, w2: params.w2 - lr * d2, b: params.b - lr * db };
    setParams(next);
    setLossHistory((h) => [...h.slice(-499), bceLoss(points, next)]);
    return Math.hypot(d1, d2, db) > 1e-4;
  }

  const ticker = useTicker(gdStep);

  function reset() {
    ticker.setRunning(false);
    setParams(INIT);
    setLossHistory([]);
  }

  // Decision boundary: w1·x + w2·y + b = 0  →  y = −(w1·x + b)/w2
  const boundary = useMemo(() => {
    const { w1, w2, b } = params;
    if (Math.abs(w2) < 1e-9 && Math.abs(w1) < 1e-9) return null;
    if (Math.abs(w2) >= Math.abs(w1)) {
      const y0 = -(w1 * scale.xDomain[0] + b) / w2;
      const y1 = -(w1 * scale.xDomain[1] + b) / w2;
      return { x1: scale.xDomain[0], y1: y0, x2: scale.xDomain[1], y2: y1 };
    }
    const x0 = -(w2 * scale.yDomain[0] + b) / w1;
    const x1 = -(w2 * scale.yDomain[1] + b) / w1;
    return { x1: x0, y1: scale.yDomain[0], x2: x1, y2: scale.yDomain[1] };
  }, [params]);

  // Coarse probability shading grid
  const cells = useMemo(() => {
    const nx = 28;
    const ny = 21;
    const out: { px: number; py: number; w: number; h: number; color: string; opacity: number }[] = [];
    const cw = (scale.innerRight - scale.innerLeft) / nx;
    const ch = (scale.innerBottom - scale.innerTop) / ny;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const px = scale.innerLeft + i * cw;
        const py = scale.innerTop + j * ch;
        const x = scale.dx(px + cw / 2);
        const y = scale.dy(py + ch / 2);
        const prob = sigmoid(params.w1 * x + params.w2 * y + params.b);
        out.push({
          px,
          py,
          w: cw,
          h: ch,
          color: prob >= 0.5 ? CLASS_COLORS[1] : CLASS_COLORS[0],
          opacity: Math.abs(prob - 0.5) * 0.5,
        });
      }
    }
    return out;
  }, [params]);

  // Sigmoid side panel: each point placed at its z value
  const sig = useMemo(() => {
    const w = 260;
    const h = 150;
    const pad = 24;
    const zMin = -8;
    const zMax = 8;
    const px = (z: number) => pad + ((clamp(z, zMin, zMax) - zMin) / (zMax - zMin)) * (w - 2 * pad);
    const py = (p: number) => h - pad - p * (h - 2 * pad);
    let curve = "";
    for (let i = 0; i <= 100; i++) {
      const z = zMin + (i / 100) * (zMax - zMin);
      curve += `${i === 0 ? "M" : "L"}${px(z).toFixed(1)},${py(sigmoid(z)).toFixed(1)}`;
    }
    const dots = points.map((pt) => {
      const z = params.w1 * pt.x + params.w2 * pt.y + params.b;
      return { cx: px(z), cy: py(sigmoid(z)), label: pt.label };
    });
    return { w, h, pad, curve, dots, py, px };
  }, [points, params]);

  return (
    <div>
      <Hint>
        Pick a class, click to add its points (drag to move, Alt-click to delete), then train. The
        background shading is the model's probability field.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          {cells.map((c, i) => (
            <rect key={i} x={c.px} y={c.py} width={c.w} height={c.h} fill={c.color} opacity={c.opacity} />
          ))}
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {boundary && (
            <line
              x1={scale.sx(boundary.x1)}
              y1={scale.sy(boundary.y1)}
              x2={scale.sx(boundary.x2)}
              y2={scale.sy(boundary.y2)}
              stroke="var(--ink)"
              strokeWidth={2}
              strokeDasharray="7 4"
            />
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={scale.sx(p.x)}
              cy={scale.sy(p.y)}
              r={6}
              fill={CLASS_COLORS[p.label]}
              stroke="#fff"
              strokeWidth={1.5}
            />
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
            <Stat label="cross-entropy" value={formatNum(loss, 4)} />
            <Stat label="accuracy" value={`${formatNum(accuracy * 100, 0)}%`} />
            <Stat label={<Formula tex="w_1" />} value={formatNum(params.w1, 3)} />
            <Stat label={<Formula tex="w_2" />} value={formatNum(params.w2, 3)} />
            <Stat label={<Formula tex="b" />} value={formatNum(params.b, 3)} />
            <Stat label="points" value={points.length} />
          </div>

          <Slider label="learning rate α" value={lr} min={0.005} max={0.5} step={0.005} onChange={setLr} format={(v) => v.toFixed(3)} />

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Run gradient descent"}
            </button>
            <button className="btn" onClick={gdStep}>Step once</button>
            <button className="btn" onClick={reset}>Reset weights</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setPoints(samplePoints()); reset(); }}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => { setPoints([]); reset(); }}>Clear points</button>
          </div>

          <div className="loss-chart">
            <div className="loss-chart-title">The sigmoid — every point lives on it</div>
            <svg viewBox={`0 0 ${sig.w} ${sig.h}`} className="loss-chart-svg">
              <line x1={sig.pad} y1={sig.py(0.5)} x2={sig.w - sig.pad} y2={sig.py(0.5)} stroke="var(--grid)" strokeDasharray="3 3" />
              <line x1={sig.px(0)} y1={sig.pad} x2={sig.px(0)} y2={sig.h - sig.pad} stroke="var(--grid)" strokeDasharray="3 3" />
              <path d={sig.curve} fill="none" stroke="var(--ink)" strokeWidth={2} />
              {sig.dots.map((d, i) => (
                <circle key={i} cx={d.cx} cy={d.cy} r={4} fill={CLASS_COLORS[d.label]} opacity={0.85} />
              ))}
              <text x={sig.w - sig.pad} y={sig.h - 8} textAnchor="end" className="tick-label">z = w·x + b</text>
              <text x={sig.pad - 14} y={sig.pad + 4} className="tick-label">1</text>
              <text x={sig.pad - 14} y={sig.h - sig.pad + 4} className="tick-label">0</text>
            </svg>
          </div>

          <LossChart history={lossHistory} label="Cross-entropy" />
        </div>
      </div>

      <Explain title="1 · From a score to a probability">
        <p>
          The model first computes a plain linear score{" "}
          <Formula tex="z = w_1 x_1 + w_2 x_2 + b" /> — exactly the linear regression recipe. The
          sigmoid then squashes that score into a probability:
        </p>
        <Formula block tex="\sigma(z) = \frac{1}{1 + e^{-z}} \in (0, 1), \qquad P(\text{class}=1 \mid \mathbf{x}) = \sigma(z)" />
        <p>
          In the small sigmoid panel, every training point is plotted at its current{" "}
          <Formula tex="z" />. Training pushes orange points rightward (toward probability 1) and
          blue points leftward (toward 0). The dashed line in the main plot is where{" "}
          <Formula tex="z = 0" />, i.e. probability exactly ½ — the <em>decision boundary</em>.
        </p>
      </Explain>

      <Explain title="2 · Why not MSE? Cross-entropy loss">
        <p>
          For probabilities we score the model by how much probability it assigned to the truth,
          using the negative log-likelihood (binary cross-entropy):
        </p>
        <Formula block tex="L = -\frac{1}{n}\sum_{i=1}^{n}\Big[\, y_i \log \hat{p}_i + (1 - y_i)\log(1 - \hat{p}_i) \,\Big]" />
        <p>
          Being confidently wrong (<Formula tex="\hat{p} \to 0" /> when <Formula tex="y = 1" />)
          costs <Formula tex="-\log \hat{p} \to \infty" /> — drag a point deep into the wrong region
          and watch the loss explode while accuracy barely moves. The loss sees confidence;
          accuracy only sees sides.
        </p>
      </Explain>

      <Explain title="3 · The gradient is beautifully familiar">
        <p>
          Differentiating cross-entropy through the sigmoid collapses into the same form as linear
          regression — prediction error times input:
        </p>
        <Formula block tex="\frac{\partial L}{\partial w_j} = \frac{1}{n}\sum_{i=1}^{n} \big(\sigma(z_i) - y_i\big)\, x_{ij}" />
        <p>
          So gradient descent works unchanged. Try making the classes overlap heavily: the boundary
          settles where the loss balances both sides. Then make them perfectly separable and keep
          training — the weights grow forever as the model chases probability 1 (this is why real
          implementations add regularization).
        </p>
      </Explain>
    </div>
  );
}
