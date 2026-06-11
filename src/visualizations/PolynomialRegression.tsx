import { useMemo, useRef, useState } from "react";
import { Point, clamp, evalPoly, formatNum, mse, polyFit, randn } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

// Hidden "true" curve the sample data is drawn from.
const trueFn = (x: number) => 5 + 2.5 * Math.sin(x * 0.7);

function samplePoints(): Point[] {
  return Array.from({ length: 14 }, () => {
    const x = 0.4 + Math.random() * 9.2;
    return { x, y: clamp(trueFn(x) + randn() * 0.7, 0.2, 9.8) };
  });
}

// Fit on u = (x - 5) / 5 so high powers stay well-conditioned.
const toU = (x: number) => (x - 5) / 5;

export function PolynomialRegression() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [degree, setDegree] = useState(3);
  const [showTrue, setShowTrue] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y }));

  const coeffs = useMemo(() => {
    if (points.length === 0) return null;
    return polyFit(points.map((p) => ({ x: toU(p.x), y: p.y })), degree);
  }, [points, degree]);

  const predict = useMemo(() => {
    if (!coeffs) return null;
    return (x: number) => evalPoly(coeffs, toU(x));
  }, [coeffs]);

  const loss = useMemo(() => (predict ? mse(points, predict) : 0), [points, predict]);

  const curvePath = useMemo(() => {
    if (!predict) return "";
    const steps = 240;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = scale.xDomain[0] + (i / steps) * (scale.xDomain[1] - scale.xDomain[0]);
      const y = predict(x);
      d += `${i === 0 ? "M" : "L"}${scale.sx(x).toFixed(1)},${scale.sy(y).toFixed(1)}`;
    }
    return d;
  }, [predict]);

  const truePath = useMemo(() => {
    const steps = 240;
    let d = "";
    for (let i = 0; i <= steps; i++) {
      const x = scale.xDomain[0] + (i / steps) * (scale.xDomain[1] - scale.xDomain[0]);
      d += `${i === 0 ? "M" : "L"}${scale.sx(x).toFixed(1)},${scale.sy(trueFn(x)).toFixed(1)}`;
    }
    return d;
  }, []);

  const nParams = degree + 1;
  const interpolating = points.length > 0 && nParams >= points.length;

  return (
    <div>
      <Hint>
        Click to add points, drag to move, Alt-click to delete. Then raise the degree and watch the
        curve gain freedom — and eventually start memorizing noise.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x" yLabel="y" />
          <defs>
            <clipPath id="poly-clip">
              <rect
                x={scale.innerLeft}
                y={scale.innerTop}
                width={scale.innerRight - scale.innerLeft}
                height={scale.innerBottom - scale.innerTop}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#poly-clip)">
            {showTrue && <path d={truePath} fill="none" stroke="var(--success)" strokeWidth={2} strokeDasharray="6 4" />}
            <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          </g>
          {points.map((p, i) => (
            <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} className="data-point" />
          ))}
        </svg>

        <div className="viz-side">
          <div className="stat-grid">
            <Stat label="degree d" value={degree} />
            <Stat label="parameters" value={nParams} />
            <Stat label="training MSE" value={formatNum(loss, 4)} />
            <Stat label="points" value={points.length} />
          </div>

          <Slider label="polynomial degree" value={degree} min={1} max={9} step={1} onChange={setDegree} />

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showTrue} onChange={(e) => setShowTrue(e.target.checked)} />
            Reveal the true function the data came from
          </label>

          {interpolating && points.length > 1 && (
            <div className="callout callout-warn">
              The model now has at least as many parameters ({nParams}) as data points ({points.length})
              — it can thread through every point exactly. Training error ≈ 0, but is the curve
              believable between points?
            </div>
          )}
        </div>
      </div>

      <Explain title="1 · Still linear regression, just with more features">
        <p>
          A degree-<Formula tex="d" /> polynomial looks nonlinear in <Formula tex="x" />, but it is
          linear in its coefficients. We simply hand the linear model extra columns —{" "}
          <Formula tex="x^2, x^3, \dots" /> — as if they were new input features:
        </p>
        <Formula block tex="\hat{y} = \beta_0 + \beta_1 x + \beta_2 x^2 + \cdots + \beta_d x^d" />
        <p>
          The same least-squares machinery from linear regression then finds the{" "}
          <Formula tex="\beta" />s by solving the normal equations{" "}
          <Formula tex="(X^\top X)\,\beta = X^\top y" />, where each row of <Formula tex="X" /> is{" "}
          <Formula tex="[1,\; x_i,\; x_i^2, \dots, x_i^d]" />.
        </p>
      </Explain>

      <Explain title="2 · Degree = flexibility = danger">
        <p>
          Each extra degree adds one knob, letting the curve bend one more time. Set the degree to 1
          and you recover plain linear regression — usually <em>underfitting</em> curved data (high
          bias). Crank it to 8–9 with few points and the curve whips wildly between them —{" "}
          <em>overfitting</em> (high variance). Watch the training MSE: it only ever goes down as
          degree grows, which is exactly why training error alone cannot tell you the right degree.
        </p>
        <p>
          Turn on “reveal the true function”: the best model is the one closest to the green curve,
          not the one closest to the dots. Try Alt-deleting a few points at high degree and watch
          how violently the fit changes — that instability is variance made visible.
        </p>
      </Explain>

      <Explain title="3 · Try this">
        <p>
          1) Add one outlier point and sweep the degree — high-degree fits contort to reach it.
          2) Put all points on a straight line and raise the degree: the extra coefficients stay near
          zero, because the loss gains nothing from using them. 3) With ~6 points, set degree 5 and
          notice the perfect interpolation warning. This tension is formalized in the{" "}
          <em>bias–variance trade-off</em> module.
        </p>
      </Explain>
    </div>
  );
}
