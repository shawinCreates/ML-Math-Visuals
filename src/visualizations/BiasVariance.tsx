import { useMemo, useState } from "react";
import { clamp, evalPoly, formatNum, polyFit, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 400, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

const trueFn = (x: number) => 5 + 2.3 * Math.sin(x * 0.75);
const NOISE = 0.7;
const N_WORLDS = 30;
const N_POINTS = 15;
const toU = (x: number) => (x - 5) / 5;
const XS = Array.from({ length: 81 }, (_, i) => 0.5 + (i / 80) * 9);
const MAX_DEGREE = 9;

interface World {
  curvesByDegree: number[][][]; // [degree-1][world][xIndex]
}

function simulate(): World {
  const datasets = Array.from({ length: N_WORLDS }, () =>
    Array.from({ length: N_POINTS }, () => {
      const x = 0.4 + Math.random() * 9.2;
      return { x: toU(x), y: trueFn(x) + randn() * NOISE };
    }),
  );
  const curvesByDegree: number[][][] = [];
  for (let d = 1; d <= MAX_DEGREE; d++) {
    curvesByDegree.push(
      datasets.map((data) => {
        const coeffs = polyFit(data, d);
        return XS.map((x) => evalPoly(coeffs, toU(x)));
      }),
    );
  }
  return { curvesByDegree };
}

export function BiasVariance() {
  const [degree, setDegree] = useState(3);
  const [seedTick, setSeedTick] = useState(0);
  const [showMean, setShowMean] = useState(true);

  const world = useMemo(() => {
    void seedTick;
    return simulate();
  }, [seedTick]);

  const decomposition = useMemo(() => {
    return world.curvesByDegree.map((curves) => {
      let bias2 = 0;
      let variance = 0;
      XS.forEach((x, i) => {
        const preds = curves.map((c) => c[i]);
        const meanPred = preds.reduce((a, b) => a + b, 0) / preds.length;
        bias2 += (meanPred - trueFn(x)) ** 2;
        variance += preds.reduce((s, p) => s + (p - meanPred) ** 2, 0) / preds.length;
      });
      return { bias2: bias2 / XS.length, variance: variance / XS.length };
    });
  }, [world]);

  const curves = world.curvesByDegree[degree - 1];
  const meanCurve = useMemo(
    () => XS.map((_, i) => curves.reduce((s, c) => s + c[i], 0) / curves.length),
    [curves],
  );

  const pathOf = (ys: number[]) =>
    XS.map((x, i) => `${i === 0 ? "M" : "L"}${scale.sx(x).toFixed(1)},${scale.sy(clamp(ys[i], -3, 13)).toFixed(1)}`).join("");

  const cur = decomposition[degree - 1];

  // decomposition chart
  const chart = useMemo(() => {
    const w = 300;
    const h = 170;
    const pad = 30;
    const maxV = Math.max(...decomposition.map((d) => d.bias2 + d.variance + NOISE * NOISE)) * 1.05;
    const px = (d: number) => pad + ((d - 1) / (MAX_DEGREE - 1)) * (w - 2 * pad);
    const py = (v: number) => h - pad - (v / maxV) * (h - 2 * pad);
    const line = (get: (d: { bias2: number; variance: number }) => number) =>
      decomposition.map((d, i) => `${i === 0 ? "M" : "L"}${px(i + 1).toFixed(1)},${py(get(d)).toFixed(1)}`).join("");
    return {
      w, h, px, py,
      bias: line((d) => d.bias2),
      varr: line((d) => d.variance),
      total: line((d) => d.bias2 + d.variance + NOISE * NOISE),
    };
  }, [decomposition]);

  return (
    <div>
      <Hint>
        Imagine 30 parallel worlds, each collecting its own 15 noisy points from the same truth and
        fitting the same model. The spread of the gray curves is variance; the gap between their
        average and the green truth is bias.
      </Hint>

      <div className="viz-row">
        <svg viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" style={{ cursor: "default" }}>
          <Axes scale={scale} xLabel="x" yLabel="y" />
          <defs>
            <clipPath id="bv-clip">
              <rect
                x={scale.innerLeft}
                y={scale.innerTop}
                width={scale.innerRight - scale.innerLeft}
                height={scale.innerBottom - scale.innerTop}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#bv-clip)">
            {curves.map((c, i) => (
              <path key={i} d={pathOf(c)} fill="none" stroke="var(--muted)" strokeWidth={1} opacity={0.28} />
            ))}
            <path d={pathOf(XS.map(trueFn))} fill="none" stroke="var(--success)" strokeWidth={2.5} />
            {showMean && <path d={pathOf(meanCurve)} fill="none" stroke="var(--danger)" strokeWidth={2.5} strokeDasharray="7 4" />}
          </g>
          <text x={scale.innerLeft + 8} y={scale.innerTop + 16} className="axis-label" fill="var(--success)">truth</text>
          <text x={scale.innerLeft + 8} y={scale.innerTop + 32} className="axis-label" fill="var(--danger)">average model (dashed)</text>
          <text x={scale.innerLeft + 8} y={scale.innerTop + 48} className="axis-label" fill="var(--muted)">30 retrained models</text>
        </svg>

        <div className="viz-side">
          <Slider label="model degree" value={degree} min={1} max={MAX_DEGREE} step={1} onChange={setDegree} />

          <div className="stat-grid">
            <Stat label="bias²" value={formatNum(cur.bias2, 3)} />
            <Stat label="variance" value={formatNum(cur.variance, 3)} />
            <Stat label="noise σ²" value={formatNum(NOISE * NOISE, 3)} />
            <Stat label="expected error" value={formatNum(cur.bias2 + cur.variance + NOISE * NOISE, 3)} />
          </div>

          <div className="loss-chart">
            <div className="loss-chart-title">The decomposition across degrees</div>
            <svg viewBox={`0 0 ${chart.w} ${chart.h}`} className="loss-chart-svg">
              <path d={chart.bias} fill="none" stroke={CLASS_COLORS[0]} strokeWidth={2} />
              <path d={chart.varr} fill="none" stroke={CLASS_COLORS[1]} strokeWidth={2} />
              <path d={chart.total} fill="none" stroke="var(--ink)" strokeWidth={2.5} />
              <line x1={chart.px(degree)} y1={12} x2={chart.px(degree)} y2={chart.h - 28} stroke="var(--danger)" strokeDasharray="3 3" />
              <text x={chart.px(1)} y={chart.h - 8} className="tick-label">degree 1</text>
              <text x={chart.px(MAX_DEGREE)} y={chart.h - 8} className="tick-label" textAnchor="end">degree {MAX_DEGREE}</text>
              <text x={chart.w - 8} y={16} className="tick-label" textAnchor="end" fill={CLASS_COLORS[0]}>bias²</text>
              <text x={chart.w - 8} y={30} className="tick-label" textAnchor="end" fill={CLASS_COLORS[1]}>variance</text>
              <text x={chart.w - 8} y={44} className="tick-label" textAnchor="end">total</text>
            </svg>
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setSeedTick((t) => t + 1)}>Resample all 30 worlds</button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showMean} onChange={(e) => setShowMean(e.target.checked)} />
            Show average of the 30 models
          </label>
        </div>
      </div>

      <Explain title="1 · The decomposition">
        <p>
          Pick a test point <Formula tex="x" /> and ask: averaged over all the datasets we{" "}
          <em>could have</em> collected, how wrong will our model be? The expected squared error
          splits cleanly into three parts:
        </p>
        <Formula block tex="\mathbb{E}\big[(y - \hat{f}(x))^2\big] = \underbrace{\big(\mathbb{E}[\hat{f}(x)] - f(x)\big)^2}_{\text{bias}^2} + \underbrace{\mathbb{E}\big[(\hat{f}(x) - \mathbb{E}[\hat{f}(x)])^2\big]}_{\text{variance}} + \underbrace{\sigma^2}_{\text{noise}}" />
        <p>
          The simulation computes each term directly: bias² is the gap between the dashed red
          average and the green truth; variance is the spread of gray curves around their average;
          noise (σ² = {formatNum(NOISE * NOISE, 2)}) is the floor nothing can beat.
        </p>
      </Explain>

      <Explain title="2 · Walk the slider">
        <p>
          Degree 1: every world fits nearly the same straight line (tiny variance), but all of them
          miss the curve in the same way (large bias) — errors that no amount of data-luck fixes.
          Degree 9: the average tracks the truth well (small bias), but individual worlds disagree
          wildly (huge variance) — your one real dataset is one gray curve, and it's probably far
          from the average. The U-shaped total in the side chart bottoms out around degree 3–4: not
          the most truthful model on average, but the best one to be stuck with.
        </p>
      </Explain>

      <Explain title="3 · This trade-off runs the whole site">
        <p>
          You've already seen it everywhere: KNN's k slider (small k = variance, big k = bias),
          decision tree depth, polynomial degree, SVM's λ, the GBM learning rate. Ensembles are the
          one trick that cheats: averaging many models simulates the dashed red curve with real
          data, slashing variance without touching bias. And the modern wrinkle — very large neural
          networks can re-descend past the classic U (“double descent”) — only makes sense once you
          understand the U it violates.
        </p>
      </Explain>
    </div>
  );
}
