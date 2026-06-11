import { useMemo, useRef, useState } from "react";
import { Point, clamp, formatNum, mean, randn } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });
const resScale = makeScale({ width: 560, height: 240, margin: 40, xDomain: [0, 10], yDomain: [-4, 4] });

function samplePoints(): Point[] {
  return Array.from({ length: 20 }, () => {
    const x = 0.4 + Math.random() * 9.2;
    const y = x < 3.5 ? 3 + 0.3 * x : x < 7 ? 7 - 0.2 * (x - 3.5) : 4.5 + 0.5 * (x - 7);
    return { x, y: clamp(y + randn() * 0.5, 0.2, 9.8) };
  });
}

interface Stump {
  threshold: number;
  left: number; // mean residual on each side (unscaled)
  right: number;
}

function fitStump(points: Point[], residuals: number[]): Stump | null {
  const order = [...points.keys()].sort((a, b) => points[a].x - points[b].x);
  const n = order.length;
  if (n < 2) return null;
  let best: Stump | null = null;
  let bestSse = Infinity;
  for (let i = 0; i < n - 1; i++) {
    const a = points[order[i]].x;
    const b = points[order[i + 1]].x;
    if (b - a < 1e-9) continue;
    const thr = (a + b) / 2;
    const leftIdx = order.slice(0, i + 1);
    const rightIdx = order.slice(i + 1);
    const lv = mean(leftIdx.map((j) => residuals[j]));
    const rv = mean(rightIdx.map((j) => residuals[j]));
    let sse = 0;
    for (const j of leftIdx) sse += (residuals[j] - lv) ** 2;
    for (const j of rightIdx) sse += (residuals[j] - rv) ** 2;
    if (sse < bestSse) {
      bestSse = sse;
      best = { threshold: thr, left: lv, right: rv };
    }
  }
  return best;
}

export function GradientBoosting() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [stumps, setStumps] = useState<Stump[]>([]);
  const [lr, setLr] = useState(0.5);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, (pts) => {
    setPoints(pts);
    setStumps([]);
    setLossHistory([]);
  }, (x, y) => ({ x, y }));

  const f0 = useMemo(() => mean(points.map((p) => p.y)), [points]);

  const predict = useMemo(() => {
    return (x: number) => {
      let v = f0;
      for (const s of stumps) v += lr * (x <= s.threshold ? s.left : s.right);
      return v;
    };
  }, [f0, stumps, lr]);

  const residuals = useMemo(() => points.map((p) => p.y - predict(p.x)), [points, predict]);

  const trainMse = useMemo(
    () => (points.length > 0 ? mean(residuals.map((r) => r * r)) : 0),
    [residuals, points.length],
  );

  const nextStump = useMemo(() => fitStump(points, residuals), [points, residuals]);

  function addTrees(count: number) {
    let cur = [...stumps];
    const hist = [...lossHistory];
    for (let t = 0; t < count; t++) {
      const res = points.map((p) => {
        let v = f0;
        for (const s of cur) v += lr * (p.x <= s.threshold ? s.left : s.right);
        return p.y - v;
      });
      const s = fitStump(points, res);
      if (!s) break;
      cur = [...cur, s];
      const newMse = mean(
        points.map((p) => {
          let v = f0;
          for (const st of cur) v += lr * (p.x <= st.threshold ? st.left : st.right);
          return (p.y - v) ** 2;
        }),
      );
      hist.push(newMse);
    }
    setStumps(cur);
    setLossHistory(hist);
  }

  function reset() {
    setStumps([]);
    setLossHistory([]);
  }

  const curvePath = (f: (x: number) => number, sc: typeof scale) => {
    const steps = 300; // dense sampling keeps the step edges crisp
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 10;
      d += `${i === 0 ? "M" : "L"}${sc.sx(x).toFixed(1)},${sc.sy(clamp(f(x), sc.yDomain[0], sc.yDomain[1])).toFixed(1)}`;
    }
    return d;
  };

  return (
    <div>
      <Hint>
        Press <strong>+1 tree</strong> repeatedly and watch the lower panel: each new stump is
        fitted to what's <em>left over</em>, and the residuals shrink toward zero. Click / drag /
        Alt-click to edit data (resets the ensemble).
      </Hint>

      <div className="viz-row">
        <div>
          <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
            <Axes scale={scale} xLabel="x" yLabel="y" />
            {stumps.length === 0 && points.length > 0 && (
              <line x1={scale.innerLeft} y1={scale.sy(f0)} x2={scale.innerRight} y2={scale.sy(f0)} stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 4" />
            )}
            {stumps.length > 0 && <path d={curvePath(predict, scale)} fill="none" stroke="var(--accent)" strokeWidth={2.5} />}
            {points.map((p, i) => (
              <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={5.5} className="data-point" />
            ))}
          </svg>

          <div style={{ marginTop: 12 }}>
            <div className="loss-chart-title" style={{ marginBottom: 4 }}>
              Residuals y − F(x) — the next tree's training data
            </div>
            <svg viewBox={`0 0 ${resScale.width} ${resScale.height}`} className="viz-svg" style={{ cursor: "default" }}>
              <Axes scale={resScale} xLabel="x" yLabel="residual" />
              <line x1={resScale.innerLeft} y1={resScale.sy(0)} x2={resScale.innerRight} y2={resScale.sy(0)} stroke="var(--border-strong)" />
              {nextStump && (
                <path
                  d={curvePath((x) => (x <= nextStump.threshold ? nextStump.left : nextStump.right), resScale)}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              )}
              {points.map((p, i) => (
                <circle key={i} cx={resScale.sx(p.x)} cy={resScale.sy(clamp(residuals[i], -4, 4))} r={4.5} fill="var(--danger)" opacity={0.75} />
              ))}
            </svg>
          </div>
        </div>

        <div className="viz-side">
          <div className="stat-grid">
            <Stat label="trees" value={stumps.length} />
            <Stat label="training MSE" value={formatNum(trainMse, 4)} />
            <Stat label={<>start <Formula tex="F_0" /> (mean)</>} value={formatNum(f0, 2)} />
            <Stat label="learning rate η" value={lr} />
          </div>

          <Slider
            label="learning rate η"
            value={lr}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(v) => { setLr(v); reset(); }}
            format={(v) => formatNum(v, 1)}
          />

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => addTrees(1)}>+1 tree</button>
            <button className="btn" onClick={() => addTrees(10)}>+10 trees</button>
            <button className="btn" onClick={reset}>Reset ensemble</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setPoints(samplePoints()); reset(); }}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => { setPoints([]); reset(); }}>Clear points</button>
          </div>

          <LossChart history={lossHistory} label="Training MSE" />

          <div className="callout">
            The dashed red step in the lower panel is the stump that <strong>+1 tree</strong> will
            add next — it's chasing whatever error remains.
          </div>
        </div>
      </div>

      <Explain title="1 · Boost = fix what's left">
        <p>
          Boosting builds the model as a running sum. Start embarrassingly simple —{" "}
          <Formula tex="F_0(x) = \bar{y}" />, just the mean (the dashed line before you add trees).
          Then repeat: compute the residuals <Formula tex="r_i = y_i - F_t(x_i)" />, fit a tiny tree{" "}
          <Formula tex="h_{t+1}" /> to those residuals, and add it with a damping factor:
        </p>
        <Formula block tex="F_{t+1}(x) = F_t(x) + \eta\, h_{t+1}(x)" />
        <p>
          Unlike a random forest — independent trees, trained in parallel, on the same target —
          boosted trees are <em>sequential specialists</em>: each one only learns the part of the
          pattern its predecessors missed.
        </p>
      </Explain>

      <Explain title="2 · Why “gradient” boosting">
        <p>
          For squared loss <Formula tex="L = \tfrac{1}{2}(y - F(x))^2" />, the derivative with
          respect to the prediction is <Formula tex="\partial L / \partial F = F(x) - y" /> — the
          negative gradient is exactly the residual. So fitting trees to residuals is performing
          gradient descent <em>in function space</em>: each tree is one descent step of size{" "}
          <Formula tex="\eta" />, taken not on parameters but on the shape of <Formula tex="F" />{" "}
          itself. Swap in a different loss and the same recipe works — fit each tree to whatever the
          negative gradient says.
        </p>
      </Explain>

      <Explain title="3 · The learning rate trade">
        <p>
          With <Formula tex="\eta = 1" /> each stump fully corrects its side of the data — fast, but
          watch the curve develop jagged spikes chasing individual noisy points. With{" "}
          <Formula tex="\eta = 0.1" /> each tree contributes a whisper, so you need many more, but
          the curve grows smooth and cautious. This is the classic GBM tuning rule: lower the
          learning rate, raise the tree count. Keep clicking +10 with small η and watch the MSE
          curve glide down — then ask yourself when you should have stopped (that's what a
          validation set is for).
        </p>
      </Explain>
    </div>
  );
}
