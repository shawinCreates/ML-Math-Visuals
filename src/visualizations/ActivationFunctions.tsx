import { useMemo, useState } from "react";
import { formatNum, sigmoid } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 360, margin: 40, xDomain: [-5, 5], yDomain: [-1.6, 1.6] });
const buildScale = makeScale({ width: 560, height: 320, margin: 40, xDomain: [-5, 5], yDomain: [-2, 3] });

type ActName = "relu" | "leaky" | "sigmoid" | "tanh";

const ACTS: Record<ActName, { label: string; tex: string; f: (z: number) => number; df: (z: number) => number }> = {
  relu: { label: "ReLU", tex: "\\max(0, z)", f: (z) => Math.max(0, z), df: (z) => (z > 0 ? 1 : 0) },
  leaky: { label: "Leaky ReLU", tex: "\\max(0.1 z, z)", f: (z) => (z > 0 ? z : 0.1 * z), df: (z) => (z > 0 ? 1 : 0.1) },
  sigmoid: { label: "Sigmoid", tex: "\\tfrac{1}{1 + e^{-z}}", f: sigmoid, df: (z) => sigmoid(z) * (1 - sigmoid(z)) },
  tanh: { label: "Tanh", tex: "\\tanh(z)", f: Math.tanh, df: (z) => 1 - Math.tanh(z) ** 2 },
};

function pathOf(f: (z: number) => number, sc: typeof scale): string {
  const steps = 200;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = sc.xDomain[0] + (i / steps) * (sc.xDomain[1] - sc.xDomain[0]);
    const y = Math.max(sc.yDomain[0], Math.min(sc.yDomain[1], f(x)));
    d += `${i === 0 ? "M" : "L"}${sc.sx(x).toFixed(1)},${sc.sy(y).toFixed(1)}`;
  }
  return d;
}

// target bump for the ReLU-builder game
const target = (x: number) => (x < -1 ? 0 : x < 1 ? x + 1 : x < 3 ? 2 - 0.5 * (x - 1) : 1);

export function ActivationFunctions() {
  const [act, setAct] = useState<ActName>("relu");
  const [probe, setProbe] = useState(1.2);
  const [units, setUnits] = useState([
    { v: 1, b: -1 },
    { v: -0.5, b: 1 },
    { v: 0, b: 3 },
  ]);

  const a = ACTS[act];

  const built = useMemo(
    () => (x: number) => units.reduce((s, u) => s + u.v * Math.max(0, x - u.b), 0),
    [units],
  );

  const fit = useMemo(() => {
    let sse = 0;
    for (let i = 0; i <= 50; i++) {
      const x = -5 + (i / 50) * 10;
      sse += (built(x) - target(x)) ** 2;
    }
    return sse / 51;
  }, [built]);

  function setUnit(i: number, key: "v" | "b", val: number) {
    setUnits(units.map((u, j) => (j === i ? { ...u, [key]: val } : u)));
  }

  return (
    <div>
      <Hint>
        Top: a function and its derivative — the derivative is what backprop multiplies by, so flat
        spots kill learning. Bottom: build a curve with three ReLU neurons by hand.
      </Hint>

      <div className="viz-row">
        <svg viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" style={{ cursor: "default" }}>
          <Axes scale={scale} xLabel="z" yLabel="value" />
          <line x1={scale.sx(0)} y1={scale.innerTop} x2={scale.sx(0)} y2={scale.innerBottom} stroke="var(--border-strong)" />
          <line x1={scale.innerLeft} y1={scale.sy(0)} x2={scale.innerRight} y2={scale.sy(0)} stroke="var(--border-strong)" />
          <path d={pathOf(a.df, scale)} fill="none" stroke="var(--danger)" strokeWidth={2} strokeDasharray="5 4" />
          <path d={pathOf(a.f, scale)} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          <line x1={scale.sx(probe)} y1={scale.innerTop} x2={scale.sx(probe)} y2={scale.innerBottom} stroke="var(--muted)" strokeDasharray="3 3" />
          <circle cx={scale.sx(probe)} cy={scale.sy(Math.max(-1.6, Math.min(1.6, a.f(probe))))} r={5} fill="var(--accent)" />
          <circle cx={scale.sx(probe)} cy={scale.sy(Math.max(-1.6, Math.min(1.6, a.df(probe))))} r={5} fill="var(--danger)" />
          <text x={scale.innerLeft + 8} y={scale.innerTop + 16} className="axis-label" fill="var(--accent)">φ(z)</text>
          <text x={scale.innerLeft + 8} y={scale.innerTop + 32} className="axis-label" fill="var(--danger)">φ′(z) (dashed)</text>
        </svg>

        <div className="viz-side">
          <div className="btn-row">
            {(Object.keys(ACTS) as ActName[]).map((k) => (
              <button key={k} className={"btn" + (act === k ? " btn-primary" : "")} onClick={() => setAct(k)}>
                {ACTS[k].label}
              </button>
            ))}
          </div>

          <div className="loss-chart">
            <div className="loss-chart-title">Selected activation</div>
            <Formula block tex={`\\varphi(z) = ${a.tex}`} />
          </div>

          <Slider label="probe z" value={probe} min={-5} max={5} step={0.05} onChange={setProbe} format={(v) => formatNum(v, 1)} />

          <div className="stat-grid">
            <Stat label="φ(z)" value={formatNum(a.f(probe), 3)} />
            <Stat label="gradient φ′(z)" value={formatNum(a.df(probe), 3)} />
          </div>

          <div className="callout">
            Slide the probe to z = 4 with <strong>sigmoid</strong>: the gradient is ≈ 0.018. Ten
            saturated sigmoid layers multiply to 0.018¹⁰ ≈ 10⁻¹⁸ — the vanishing gradient problem,
            visible on one slider.
          </div>
        </div>
      </div>

      <div className="viz-row" style={{ marginTop: 18 }}>
        <svg viewBox={`0 0 ${buildScale.width} ${buildScale.height}`} className="viz-svg" style={{ cursor: "default" }}>
          <Axes scale={buildScale} xLabel="x" yLabel="f(x)" />
          <path d={pathOf(target, buildScale)} fill="none" stroke="var(--success)" strokeWidth={2} strokeDasharray="6 4" />
          {units.map((u, i) => (
            <path
              key={i}
              d={pathOf((x) => u.v * Math.max(0, x - u.b), buildScale)}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={1.2}
              opacity={0.6}
            />
          ))}
          <path d={pathOf(built, buildScale)} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          <text x={buildScale.innerLeft + 8} y={buildScale.innerTop + 16} className="axis-label" fill="var(--success)">target (dashed)</text>
          <text x={buildScale.innerLeft + 8} y={buildScale.innerTop + 32} className="axis-label" fill="var(--accent)">your sum of ReLUs</text>
        </svg>

        <div className="viz-side">
          <div className="loss-chart">
            <div className="loss-chart-title">
              f(x) = Σ vᵢ · ReLU(x − bᵢ) — match the dashed target
            </div>
            {units.map((u, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <Slider label={`v${i + 1} (height)`} value={u.v} min={-2} max={2} step={0.05} onChange={(val) => setUnit(i, "v", val)} format={(v) => formatNum(v)} />
                <Slider label={`b${i + 1} (kink at)`} value={u.b} min={-5} max={5} step={0.1} onChange={(val) => setUnit(i, "b", val)} format={(v) => formatNum(v, 1)} />
              </div>
            ))}
          </div>
          <div className="stat-grid">
            <Stat label="fit error (MSE)" value={formatNum(fit, 3)} />
            <Stat label="kinks available" value={units.length} />
          </div>
          <div className="callout">
            Each neuron contributes one <em>kink</em>. Gradient descent does exactly what you're
            doing now — nudging every vᵢ and bᵢ to bend the sum toward the data.
          </div>
        </div>
      </div>

      <Explain title="1 · Why networks need nonlinearity at all">
        <p>
          Stack two purely linear layers and the algebra collapses:{" "}
          <Formula tex="W_2(W_1\mathbf{x} + \mathbf{b}_1) + \mathbf{b}_2 = (W_2 W_1)\mathbf{x} + (W_2\mathbf{b}_1 + \mathbf{b}_2)" />{" "}
          — just another linear map. A 100-layer linear network is exactly one linear regression. The
          activation between layers is what makes depth <em>mean</em> something; without it the
          neural network playground could never have drawn its curved boundaries.
        </p>
      </Explain>

      <Explain title="2 · The derivative is the activation's real personality">
        <p>
          During backprop, each layer multiplies the incoming gradient by{" "}
          <Formula tex="\varphi'(z)" />. Sigmoid's derivative peaks at just 0.25 and dies in both
          tails, so deep sigmoid stacks starve early layers of gradient. Tanh is zero-centered with
          a peak of 1 — better, same tail problem. ReLU's derivative is exactly 1 wherever the
          neuron is active: gradients pass through undiminished, which is most of why deep learning
          became trainable. Its price is the dead zone — a neuron stuck at <Formula tex="z < 0" />{" "}
          gets zero gradient forever (Leaky ReLU's 0.1 slope is the patch).
        </p>
      </Explain>

      <Explain title="3 · Sums of kinks approximate anything">
        <p>
          The builder shows the universal approximation idea at toy scale: every ReLU neuron is a
          hinge, and a weighted sum of hinges is a piecewise-linear function whose shape you control
          kink by kink. Three kinks already fit the bump decently; thousands fit almost anything.
          Width buys kinks; depth lets kinks <em>compose</em>, reusing earlier bends to build
          exponentially intricate shapes from the same budget.
        </p>
      </Explain>
    </div>
  );
}
