import { useMemo, useRef, useState } from "react";
import { Point, clamp, evalPoly, formatNum, polyFit, randn } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

const trueFn = (x: number) => 5 + 2.4 * Math.sin(x * 0.8);
const MAX_MODELS = 50;
const toU = (x: number) => (x - 5) / 5;

function samplePoints(): Point[] {
  return Array.from({ length: 18 }, () => {
    const x = 0.4 + Math.random() * 9.2;
    return { x, y: clamp(trueFn(x) + randn() * 0.8, 0.2, 9.8) };
  });
}

const XS = Array.from({ length: 121 }, (_, i) => (i / 120) * 10);

export function Ensembles() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [m, setM] = useState(12);
  const [degree, setDegree] = useState(4);
  const [seedTick, setSeedTick] = useState(0);
  const [showTrue, setShowTrue] = useState(true);
  const [showBand, setShowBand] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y }));

  // bootstrap resamples (regenerated when data or seed changes)
  const curves = useMemo(() => {
    void seedTick;
    const n = points.length;
    if (n < degree + 2) return [];
    const out: number[][] = [];
    for (let b = 0; b < MAX_MODELS; b++) {
      const sample = Array.from({ length: n }, () => points[Math.floor(Math.random() * n)]);
      const coeffs = polyFit(sample.map((p) => ({ x: toU(p.x), y: p.y })), degree);
      out.push(XS.map((x) => evalPoly(coeffs, toU(x))));
    }
    return out;
  }, [points, degree, seedTick]);

  const active = curves.slice(0, m);

  const ensemble = useMemo(() => {
    if (active.length === 0) return null;
    return XS.map((_, i) => active.reduce((s, c) => s + c[i], 0) / active.length);
  }, [active]);

  const band = useMemo(() => {
    if (!ensemble || active.length < 2) return null;
    return XS.map((_, i) => {
      const mean = ensemble[i];
      const v = active.reduce((s, c) => s + (c[i] - mean) ** 2, 0) / active.length;
      return Math.sqrt(v);
    });
  }, [ensemble, active]);

  const mses = useMemo(() => {
    if (!ensemble || active.length === 0) return null;
    const vsTrue = (ys: number[]) => ys.reduce((s, y, i) => s + (y - trueFn(XS[i])) ** 2, 0) / XS.length;
    const single = active.reduce((s, c) => s + vsTrue(c), 0) / active.length;
    return { single, ens: vsTrue(ensemble) };
  }, [ensemble, active]);

  const pathOf = (ys: number[]) =>
    XS.map((x, i) => `${i === 0 ? "M" : "L"}${scale.sx(x).toFixed(1)},${scale.sy(ys[i]).toFixed(1)}`).join("");

  const bandPath = useMemo(() => {
    if (!ensemble || !band) return "";
    const upper = XS.map((x, i) => `${i === 0 ? "M" : "L"}${scale.sx(x).toFixed(1)},${scale.sy(ensemble[i] + band[i]).toFixed(1)}`).join("");
    const lower = [...XS.keys()]
      .reverse()
      .map((i) => `L${scale.sx(XS[i]).toFixed(1)},${scale.sy(ensemble[i] - band[i]).toFixed(1)}`)
      .join("");
    return upper + lower + "Z";
  }, [ensemble, band]);

  return (
    <div>
      <Hint>
        Each thin gray curve is the same model trained on a bootstrap resample of the same data.
        Individually they're erratic — slide the model count and watch their average steady itself.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x" yLabel="y" />
          <defs>
            <clipPath id="ens-clip">
              <rect
                x={scale.innerLeft}
                y={scale.innerTop}
                width={scale.innerRight - scale.innerLeft}
                height={scale.innerBottom - scale.innerTop}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#ens-clip)">
            {showBand && bandPath && <path d={bandPath} fill="var(--accent)" opacity={0.12} />}
            {active.map((c, i) => (
              <path key={i} d={pathOf(c)} fill="none" stroke="var(--muted)" strokeWidth={1} opacity={0.3} />
            ))}
            {showTrue && <path d={pathOf(XS.map(trueFn))} fill="none" stroke="var(--success)" strokeWidth={2} strokeDasharray="6 4" />}
            {ensemble && <path d={pathOf(ensemble)} fill="none" stroke="var(--accent)" strokeWidth={3} />}
          </g>
          {points.map((p, i) => (
            <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={5.5} className="data-point" />
          ))}
        </svg>

        <div className="viz-side">
          <Slider label="models m" value={m} min={1} max={MAX_MODELS} step={1} onChange={setM} />
          <Slider label="base model degree" value={degree} min={2} max={6} step={1} onChange={setDegree} />

          {mses && (
            <div className="stat-grid">
              <Stat label="avg single-model error²" value={formatNum(mses.single, 3)} />
              <Stat label="ensemble error²" value={formatNum(mses.ens, 3)} />
              <Stat label="error reduced by" value={`${formatNum((1 - mses.ens / Math.max(mses.single, 1e-9)) * 100, 0)}%`} />
              <Stat label="points" value={points.length} />
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setSeedTick((t) => t + 1)}>Resample bootstraps</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showTrue} onChange={(e) => setShowTrue(e.target.checked)} />
            Show true function (green)
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={showBand} onChange={(e) => setShowBand(e.target.checked)} />
            Show ±1 std-dev band across models
          </label>
        </div>
      </div>

      <Explain title="1 · Bootstrap: many datasets from one">
        <p>
          We only have one training set, but we can fake having many: draw <Formula tex="n" />{" "}
          points <em>with replacement</em> from the original <Formula tex="n" /> (a{" "}
          <em>bootstrap sample</em> — about 37% of points are left out of each draw, others appear
          twice). Train the same flexible model on each sample. The thin gray curves show how much
          the model's answer depends on which data it happened to see — that spread <em>is</em>{" "}
          variance.
        </p>
      </Explain>

      <Explain title="2 · Averaging cancels independent errors">
        <p>
          The bold blue curve is the average of the gray ones (<em>bagging</em>: bootstrap
          aggregating). If models have variance <Formula tex="\sigma^2" /> and pairwise correlation{" "}
          <Formula tex="\rho" />, their average has variance
        </p>
        <Formula block tex="\mathrm{Var}\Big(\tfrac{1}{m}\textstyle\sum_i f_i\Big) = \rho\,\sigma^2 + \frac{1-\rho}{m}\,\sigma^2" />
        <p>
          The second term dies as <Formula tex="m" /> grows — watch the error stats as you slide{" "}
          <Formula tex="m" /> from 1 to 50. But the first term never goes away: averaging only
          cancels the <em>disagreements</em>. That's why ensembles need diverse models, and why the
          improvement saturates (going 25 → 50 models barely helps).
        </p>
      </Explain>

      <Explain title="3 · Variance is the only thing it fixes">
        <p>
          Set the base degree to 6 (wild gray curves) — bagging helps enormously. Now set degree 2:
          every bootstrap model makes the <em>same</em> mistake of being too stiff, so the average
          is just as wrong — bias survives averaging. The recipe is therefore: take low-bias,
          high-variance models and bag them. Trees fit that description perfectly, which leads
          straight to the random forest.
        </p>
      </Explain>
    </div>
  );
}
