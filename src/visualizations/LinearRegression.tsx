import { useMemo, useRef, useState } from "react";
import { Point, formatNum, mse, olsFit, randn, clamp } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { useTicker } from "../components/useTicker";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";
import { LinearRegression3D } from "./LinearRegression3D";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): Point[] {
  const m = 0.5 + Math.random() * 0.5;
  const c = 1 + Math.random() * 2;
  return Array.from({ length: 12 }, () => {
    const x = 0.5 + Math.random() * 9;
    return { x, y: clamp(m * x + c + randn() * 0.9, 0.2, 9.8) };
  });
}

export function LinearRegression() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [m, setM] = useState(0);
  const [c, setC] = useState(5);
  const [lr, setLr] = useState(0.01);
  const [showResiduals, setShowResiduals] = useState(true);
  const [showSquares, setShowSquares] = useState(false);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y }));

  const loss = useMemo(() => mse(points, (x) => m * x + c), [points, m, c]);

  const grads = useMemo(() => {
    const n = points.length;
    if (n === 0) return { dm: 0, dc: 0 };
    let dm = 0;
    let dc = 0;
    for (const p of points) {
      const err = m * p.x + c - p.y;
      dm += (2 / n) * err * p.x;
      dc += (2 / n) * err;
    }
    return { dm, dc };
  }, [points, m, c]);

  function gdStep(): boolean {
    if (points.length === 0) return false;
    let curM = m;
    let curC = c;
    const n = points.length;
    let dm = 0;
    let dc = 0;
    for (const p of points) {
      const err = curM * p.x + curC - p.y;
      dm += (2 / n) * err * p.x;
      dc += (2 / n) * err;
    }
    curM -= lr * dm;
    curC -= lr * dc;
    setM(curM);
    setC(curC);
    setLossHistory((h) => [...h.slice(-499), mse(points, (x) => curM * x + curC)]);
    // stop automatically once the gradient is tiny
    return Math.hypot(dm, dc) > 1e-4;
  }

  const ticker = useTicker(gdStep);

  function bestFit() {
    ticker.setRunning(false);
    const fit = olsFit(points);
    setM(fit.m);
    setC(fit.c);
  }

  function resetLine() {
    ticker.setRunning(false);
    setM(0);
    setC(5);
    setLossHistory([]);
  }

  const lineY0 = m * scale.xDomain[0] + c;
  const lineY1 = m * scale.xDomain[1] + c;

  return (
    <div>
      <Hint>
        Click the plot to add points, drag points to move them, Alt-click to delete. Then watch how
        the line — and the math driving it — reacts.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x" yLabel="y" />
          <defs>
            <clipPath id="lin-clip">
              <rect
                x={scale.innerLeft}
                y={scale.innerTop}
                width={scale.innerRight - scale.innerLeft}
                height={scale.innerBottom - scale.innerTop}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#lin-clip)">
            {showSquares &&
              points.map((p, i) => {
                const yHat = m * p.x + c;
                const side = Math.abs(scale.sy(p.y) - scale.sy(yHat));
                const top = Math.min(scale.sy(p.y), scale.sy(yHat));
                return (
                  <rect
                    key={"sq" + i}
                    x={scale.sx(p.x) - side}
                    y={top}
                    width={side}
                    height={side}
                    fill="var(--accent)"
                    opacity={0.13}
                    stroke="var(--accent)"
                    strokeOpacity={0.4}
                  />
                );
              })}
            {showResiduals &&
              points.map((p, i) => (
                <line
                  key={"r" + i}
                  x1={scale.sx(p.x)}
                  y1={scale.sy(p.y)}
                  x2={scale.sx(p.x)}
                  y2={scale.sy(m * p.x + c)}
                  stroke="var(--danger)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              ))}
            <line
              x1={scale.sx(scale.xDomain[0])}
              y1={scale.sy(lineY0)}
              x2={scale.sx(scale.xDomain[1])}
              y2={scale.sy(lineY1)}
              stroke="var(--accent)"
              strokeWidth={2.5}
            />
          </g>
          {points.map((p, i) => (
            <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} className="data-point" />
          ))}
        </svg>

        <div className="viz-side">
          <div className="stat-grid">
            <Stat label="MSE loss" value={formatNum(loss, 3)} />
            <Stat label={<Formula tex="m" />} value={formatNum(m, 3)} />
            <Stat label={<Formula tex="c" />} value={formatNum(c, 3)} />
            <Stat label={<Formula tex="\partial L/\partial m" />} value={formatNum(grads.dm, 3)} />
            <Stat label={<Formula tex="\partial L/\partial c" />} value={formatNum(grads.dc, 3)} />
            <Stat label="points" value={points.length} />
          </div>

          <Slider label="slope m" value={m} min={-3} max={3} step={0.01} onChange={(v) => { ticker.setRunning(false); setM(v); }} format={(v) => formatNum(v)} />
          <Slider label="intercept c" value={c} min={-5} max={10} step={0.01} onChange={(v) => { ticker.setRunning(false); setC(v); }} format={(v) => formatNum(v)} />
          <Slider label="learning rate α" value={lr} min={0.001} max={0.03} step={0.001} onChange={setLr} format={(v) => v.toFixed(3)} />

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Run gradient descent"}
            </button>
            <button className="btn" onClick={gdStep}>Step once</button>
            <button className="btn" onClick={bestFit}>Jump to best fit (OLS)</button>
            <button className="btn" onClick={resetLine}>Reset line</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setPoints(samplePoints()); setLossHistory([]); }}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => { setPoints([]); setLossHistory([]); }}>Clear points</button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showResiduals} onChange={(e) => setShowResiduals(e.target.checked)} />
            Show residuals (errors)
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={showSquares} onChange={(e) => setShowSquares(e.target.checked)} />
            Show squared errors (the “squares” in least squares)
          </label>

          <LossChart history={lossHistory} label="MSE" />
        </div>
      </div>

      <Explain title="1 · The model is a guess machine">
        <p>
          The line <Formula tex="\hat{y} = m x + c" /> is a tiny machine with two knobs:{" "}
          <Formula tex="m" /> (slope) and <Formula tex="c" /> (intercept). For any input{" "}
          <Formula tex="x" /> it produces a prediction <Formula tex="\hat{y}" />. Move the sliders
          above — you are doing manually what “learning” automates: searching for knob settings that
          make predictions close to the data.
        </p>
      </Explain>

      <Explain title="2 · The loss measures how wrong the line is">
        <p>
          Each red dashed segment is a <em>residual</em>: the gap{" "}
          <Formula tex="y_i - \hat{y}_i" /> between a real point and the line's prediction at the
          same <Formula tex="x" />. Squaring each gap (turn on the squares toggle!) punishes big
          misses much more than small ones, and averaging gives one number for the whole line:
        </p>
        <Formula block tex={`L(m, c) = \\frac{1}{n}\\sum_{i=1}^{n} \\big(y_i - (m x_i + c)\\big)^2 = ${formatNum(loss, 3)}`} />
        <p>
          Drag a point far from the line and watch the MSE jump — that one squared term dominates
          the sum. This is why least squares is sensitive to outliers.
        </p>
      </Explain>

      <Explain title="3 · Gradient descent rolls downhill">
        <p>
          The loss <Formula tex="L(m, c)" /> is a bowl-shaped surface over the two knobs. The
          gradient says which way is uphill, so we step the opposite way:
        </p>
        <Formula
          block
          tex={`\\frac{\\partial L}{\\partial m} = \\frac{2}{n}\\sum (\\hat{y}_i - y_i)\\, x_i, \\qquad \\frac{\\partial L}{\\partial c} = \\frac{2}{n}\\sum (\\hat{y}_i - y_i)`}
        />
        <Formula block tex={`m \\leftarrow m - \\alpha \\frac{\\partial L}{\\partial m}, \\qquad c \\leftarrow c - \\alpha \\frac{\\partial L}{\\partial c}`} />
        <p>
          Press <strong>Step once</strong> and check the gradient readouts: the line moves a little
          in exactly that direction. <strong>Run</strong> repeats this until the gradient is ~0 —
          the bottom of the bowl. Try a large learning rate <Formula tex="\alpha" /> and watch the
          loss curve oscillate or even diverge: each step overshoots the valley.
        </p>
      </Explain>

      <Explain title="4 · The shortcut: a closed-form answer">
        <p>
          For plain linear regression the bowl has a single minimum we can solve for directly by
          setting both derivatives to zero (the <em>normal equations</em>):
        </p>
        <Formula
          block
          tex={`m = \\frac{\\sum (x_i - \\bar{x})(y_i - \\bar{y})}{\\sum (x_i - \\bar{x})^2}, \\qquad c = \\bar{y} - m\\bar{x}`}
        />
        <p>
          That's what <strong>Jump to best fit</strong> computes. Gradient descent finds the same
          answer step by step — and unlike the formula, it still works for models (like neural
          networks) where no closed form exists.
        </p>
      </Explain>
      <LinearRegression3D />
    </div>
  );
}
