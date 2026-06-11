import { useMemo, useRef, useState } from "react";
import { clamp, formatNum, mean } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { Explain, Hint, Stat } from "../components/Explain";

const regScale = makeScale({ width: 560, height: 320, margin: 40, xDomain: [-4, 4], yDomain: [0, 8] });
const clsScale = makeScale({ width: 560, height: 320, margin: 40, xDomain: [0, 1], yDomain: [0, 5] });

function pathOf(f: (x: number) => number, sc: typeof regScale): string {
  const steps = 240;
  let d = "";
  let started = false;
  for (let i = 0; i <= steps; i++) {
    const x = sc.xDomain[0] + (i / steps) * (sc.xDomain[1] - sc.xDomain[0]);
    const y = f(x);
    if (!Number.isFinite(y) || y > sc.yDomain[1] * 1.5) {
      started = false;
      continue;
    }
    const yc = Math.min(sc.yDomain[1], Math.max(sc.yDomain[0], y));
    d += `${started ? "L" : "M"}${sc.sx(x).toFixed(1)},${sc.sy(yc).toFixed(1)}`;
    started = true;
  }
  return d;
}

export function LossFunctions() {
  const [tab, setTab] = useState<"regression" | "classification">("regression");
  const [delta, setDelta] = useState(1);
  const [probe, setProbe] = useState(1.5);
  const [pProbe, setPProbe] = useState(0.7);
  const [yTrue, setYTrue] = useState(1);
  const [values, setValues] = useState<number[]>([2.2, 2.8, 3.1, 3.6, 4.1, 8.8]);
  const lineRef = useRef<SVGSVGElement>(null);

  const huber = useMemo(
    () => (e: number) => (Math.abs(e) <= delta ? 0.5 * e * e : delta * (Math.abs(e) - 0.5 * delta)),
    [delta],
  );

  const bce = (p: number, y: number) => (y === 1 ? -Math.log(p) : -Math.log(1 - p));

  const meanV = mean(values);
  const median = useMemo(() => {
    const s = [...values].sort((a, b) => a - b);
    const m = s.length;
    return m === 0 ? 0 : m % 2 === 1 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
  }, [values]);

  const onLine = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return;
    const rect = lineRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 560;
    const x = clamp(((px - 40) / 480) * 10, 0, 10);
    // drag nearest value
    let best = 0;
    let bestD = Infinity;
    values.forEach((v, i) => {
      const d = Math.abs(v - x);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setValues(values.map((v, i) => (i === best ? x : v)));
  };

  return (
    <div>
      <Hint>
        A loss function is a definition of “wrong”. Compare how each one punishes errors — and what
        that choice does to the model it trains.
      </Hint>

      <div className="btn-row" style={{ marginBottom: 14 }}>
        <button className={"btn" + (tab === "regression" ? " btn-primary" : "")} onClick={() => setTab("regression")}>
          Regression losses
        </button>
        <button className={"btn" + (tab === "classification" ? " btn-primary" : "")} onClick={() => setTab("classification")}>
          Classification loss
        </button>
      </div>

      {tab === "regression" ? (
        <div className="viz-row">
          <svg viewBox={`0 0 ${regScale.width} ${regScale.height}`} className="viz-svg" style={{ cursor: "default" }}>
            <Axes scale={regScale} xLabel="error e = y − ŷ" yLabel="loss" />
            <path d={pathOf((e) => e * e, regScale)} fill="none" stroke={CLASS_COLORS[0]} strokeWidth={2.5} />
            <path d={pathOf((e) => Math.abs(e), regScale)} fill="none" stroke={CLASS_COLORS[1]} strokeWidth={2.5} />
            <path d={pathOf(huber, regScale)} fill="none" stroke={CLASS_COLORS[2]} strokeWidth={2.5} strokeDasharray="6 4" />
            <line x1={regScale.sx(probe)} y1={regScale.innerTop} x2={regScale.sx(probe)} y2={regScale.innerBottom} stroke="var(--muted)" strokeDasharray="3 3" />
            <text x={regScale.innerLeft + 8} y={regScale.innerTop + 16} className="axis-label" fill={CLASS_COLORS[0]}>MSE: e²</text>
            <text x={regScale.innerLeft + 8} y={regScale.innerTop + 32} className="axis-label" fill={CLASS_COLORS[1]}>MAE: |e|</text>
            <text x={regScale.innerLeft + 8} y={regScale.innerTop + 48} className="axis-label" fill={CLASS_COLORS[2]}>Huber (dashed)</text>
          </svg>

          <div className="viz-side">
            <Slider label="probe error e" value={probe} min={-4} max={4} step={0.05} onChange={setProbe} format={(v) => formatNum(v, 1)} />
            <Slider label="Huber δ" value={delta} min={0.3} max={3} step={0.1} onChange={setDelta} format={(v) => formatNum(v, 1)} />

            <div className="stat-grid">
              <Stat label="MSE loss / gradient" value={`${formatNum(probe * probe, 2)} / ${formatNum(2 * probe, 2)}`} />
              <Stat label="MAE loss / gradient" value={`${formatNum(Math.abs(probe), 2)} / ${probe === 0 ? "—" : formatNum(Math.sign(probe), 0)}`} />
              <Stat label="Huber loss" value={formatNum(huber(probe), 2)} />
              <Stat label="MSE/MAE grad ratio" value={probe === 0 ? "—" : formatNum(Math.abs(2 * probe), 1) + "×"} />
            </div>

            <div className="loss-chart">
              <div className="loss-chart-title">Mean vs median — drag the dots</div>
              <svg ref={lineRef} viewBox="0 0 560 90" className="loss-chart-svg" style={{ touchAction: "none", cursor: "grab" }} onPointerDown={onLine} onPointerMove={onLine}>
                <line x1={40} y1={45} x2={520} y2={45} stroke="var(--border-strong)" strokeWidth={1.5} />
                {values.map((v, i) => (
                  <circle key={i} cx={40 + (v / 10) * 480} cy={45} r={7} fill="var(--ink)" opacity={0.75} />
                ))}
                <g transform={`translate(${40 + (meanV / 10) * 480} 45)`}>
                  <line y1={-22} y2={22} stroke={CLASS_COLORS[0]} strokeWidth={2.5} />
                  <text y={-26} textAnchor="middle" className="tick-label" fill={CLASS_COLORS[0]}>mean (MSE)</text>
                </g>
                <g transform={`translate(${40 + (median / 10) * 480} 45)`}>
                  <line y1={-22} y2={22} stroke={CLASS_COLORS[1]} strokeWidth={2.5} />
                  <text y={38} textAnchor="middle" className="tick-label" fill={CLASS_COLORS[1]}>median (MAE)</text>
                </g>
              </svg>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                The constant minimizing MSE is the mean; for MAE it's the median. Drag the rightmost
                point far out — watch which marker chases it.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="viz-row">
          <svg viewBox={`0 0 ${clsScale.width} ${clsScale.height}`} className="viz-svg" style={{ cursor: "default" }}>
            <Axes scale={clsScale} xLabel="predicted probability p̂" yLabel="loss" />
            <path d={pathOf((p) => (p > 0.001 && p < 0.999 ? bce(p, yTrue) : NaN), clsScale)} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
            <line x1={clsScale.sx(pProbe)} y1={clsScale.innerTop} x2={clsScale.sx(pProbe)} y2={clsScale.innerBottom} stroke="var(--muted)" strokeDasharray="3 3" />
            <circle cx={clsScale.sx(pProbe)} cy={clsScale.sy(Math.min(5, bce(clamp(pProbe, 0.001, 0.999), yTrue)))} r={5} fill="var(--accent)" />
            <text x={clsScale.innerLeft + 8} y={clsScale.innerTop + 16} className="axis-label">
              cross-entropy when true label y = {yTrue}
            </text>
          </svg>

          <div className="viz-side">
            <div className="btn-row">
              {[1, 0].map((y) => (
                <button key={y} className={"btn" + (yTrue === y ? " btn-primary" : "")} onClick={() => setYTrue(y)}>
                  true label y = {y}
                </button>
              ))}
            </div>
            <Slider label="predicted p̂" value={pProbe} min={0.01} max={0.99} step={0.01} onChange={setPProbe} format={(v) => formatNum(v)} />
            <div className="stat-grid">
              <Stat label="loss" value={formatNum(bce(pProbe, yTrue), 3)} />
              <Stat label="loss if p̂ → wrong extreme" value="∞" />
            </div>
            <div className="callout">
              Slide p̂ toward the wrong end: at p̂ = 0.01 with y = 1 the loss is{" "}
              −log(0.01) ≈ 4.6, and it keeps climbing without bound. Confident wrongness is
              punished infinitely harder than honest uncertainty (p̂ = 0.5 costs only 0.69).
            </div>
          </div>
        </div>
      )}

      <Explain title="1 · The loss is the model's definition of failure">
        <p>
          Training never sees your intentions — only{" "}
          <Formula tex="\nabla_\theta L" />. Pick the loss and you've picked what the model will
          care about. The classic regression options:
        </p>
        <Formula block tex="L_{\mathrm{MSE}} = \tfrac{1}{n}\sum (y_i - \hat{y}_i)^2 \qquad L_{\mathrm{MAE}} = \tfrac{1}{n}\sum |y_i - \hat{y}_i| \qquad L_{\mathrm{BCE}} = -\tfrac{1}{n}\sum \big[y_i\log\hat{p}_i + (1{-}y_i)\log(1{-}\hat{p}_i)\big]" />
      </Explain>

      <Explain title="2 · Gradients tell the real story">
        <p>
          MSE's gradient <Formula tex="2e" /> grows with the error: a point 4 units away pulls 8×
          harder than a point 1 unit away — efficient on clean data, hijacked by outliers (the
          mean-vs-median demo makes this visceral). MAE's gradient is always ±1: every point gets an
          equal vote, robust but slow to converge precisely (and undefined at 0). Huber stitches the
          best halves together — quadratic near zero, linear in the tails, with δ as the seam. Slide
          δ and watch the dashed curve morph between the two.
        </p>
      </Explain>

      <Explain title="3 · Losses are probability assumptions in disguise">
        <p>
          Minimizing MSE is maximum likelihood under Gaussian noise; MAE corresponds to Laplace
          noise (heavier tails — hence the robustness); cross-entropy is maximum likelihood for a
          Bernoulli outcome. So “choosing a loss” secretly answers: <em>what do I believe the noise
          looks like?</em> When your data has wild outliers, MSE's Gaussian assumption is the wrong
          belief — and the math punishes you for lying about your noise.
        </p>
      </Explain>
    </div>
  );
}
