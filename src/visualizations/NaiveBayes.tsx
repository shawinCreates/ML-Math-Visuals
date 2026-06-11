import { useEffect, useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, CLASS_COLORS_SOFT, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): LabeledPoint[] {
  const pts: LabeledPoint[] = [];
  for (let i = 0; i < 12; i++) {
    pts.push({ x: clamp(3.2 + randn() * 1.0, 0.2, 9.8), y: clamp(6.8 + randn() * 1.6, 0.2, 9.8), label: 0 });
  }
  for (let i = 0; i < 8; i++) {
    pts.push({ x: clamp(7 + randn() * 1.4, 0.2, 9.8), y: clamp(3.4 + randn() * 0.8, 0.2, 9.8), label: 1 });
  }
  return pts;
}

interface ClassModel {
  prior: number;
  mx: number;
  my: number;
  vx: number;
  vy: number;
  n: number;
}

function fitClass(pts: LabeledPoint[], label: number, total: number): ClassModel | null {
  const mine = pts.filter((p) => p.label === label);
  if (mine.length < 2) return null;
  const mx = mine.reduce((s, p) => s + p.x, 0) / mine.length;
  const my = mine.reduce((s, p) => s + p.y, 0) / mine.length;
  // variance floor keeps the density finite when points coincide
  const vx = Math.max(0.05, mine.reduce((s, p) => s + (p.x - mx) ** 2, 0) / mine.length);
  const vy = Math.max(0.05, mine.reduce((s, p) => s + (p.y - my) ** 2, 0) / mine.length);
  return { prior: mine.length / total, mx, my, vx, vy, n: mine.length };
}

const gauss = (x: number, m: number, v: number) => Math.exp(-((x - m) ** 2) / (2 * v)) / Math.sqrt(2 * Math.PI * v);

export function NaiveBayes() {
  const [points, setPoints] = useState<LabeledPoint[]>(samplePoints);
  const [activeClass, setActiveClass] = useState(0);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { dragging, handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y, label: activeClass }));

  const models = useMemo(() => {
    const m0 = fitClass(points, 0, points.length);
    const m1 = fitClass(points, 1, points.length);
    return m0 && m1 ? ([m0, m1] as const) : null;
  }, [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, scale.width, scale.height);
    if (!models) return;
    const cell = 5;
    for (let px = scale.innerLeft; px < scale.innerRight; px += cell) {
      for (let py = scale.innerTop; py < scale.innerBottom; py += cell) {
        const x = scale.dx(px + cell / 2);
        const y = scale.dy(py + cell / 2);
        const s0 = models[0].prior * gauss(x, models[0].mx, models[0].vx) * gauss(y, models[0].my, models[0].vy);
        const s1 = models[1].prior * gauss(x, models[1].mx, models[1].vx) * gauss(y, models[1].my, models[1].vy);
        ctx.fillStyle = s1 > s0 ? CLASS_COLORS_SOFT[1] : CLASS_COLORS_SOFT[0];
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }, [models]);

  const queryInfo = useMemo(() => {
    if (!query || !models) return null;
    const like = models.map((m) => ({
      px: gauss(query.x, m.mx, m.vx),
      py: gauss(query.y, m.my, m.vy),
    }));
    const scores = models.map((m, c) => m.prior * like[c].px * like[c].py);
    const total = scores[0] + scores[1];
    return {
      like,
      scores,
      post: total > 0 ? scores.map((s) => s / total) : [0.5, 0.5],
      label: scores[1] > scores[0] ? 1 : 0,
    };
  }, [query, models]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    handlers.onPointerMove(e);
    if (dragging) {
      setQuery(null);
      return;
    }
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * scale.width;
    const py = ((e.clientY - rect.top) / rect.height) * scale.height;
    if (px < scale.innerLeft || px > scale.innerRight || py < scale.innerTop || py > scale.innerBottom) {
      setQuery(null);
    } else {
      setQuery({ x: scale.dx(px), y: scale.dy(py) });
    }
  };

  return (
    <div>
      <Hint>
        Hover anywhere to watch Bayes' rule run live on that location. Click to add points of the
        selected class (drag / Alt-click to edit) — each class needs at least 2 points.
      </Hint>

      <div className="viz-row">
        <div className="viz-stack">
          <canvas ref={canvasRef} width={scale.width} height={scale.height} className="viz-canvas" />
          <svg
            ref={svgRef}
            viewBox={`0 0 ${scale.width} ${scale.height}`}
            className="viz-svg viz-svg-overlay"
            {...handlers}
            onPointerMove={onMove}
            onPointerLeave={() => { handlers.onPointerLeave(); setQuery(null); }}
          >
            <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
            {models &&
              models.map((m, c) =>
                [1, 2].map((k) => (
                  <ellipse
                    key={c + "-" + k}
                    cx={scale.sx(m.mx)}
                    cy={scale.sy(m.my)}
                    rx={(k * Math.sqrt(m.vx) * (scale.innerRight - scale.innerLeft)) / 10}
                    ry={(k * Math.sqrt(m.vy) * (scale.innerBottom - scale.innerTop)) / 10}
                    fill="none"
                    stroke={CLASS_COLORS[c]}
                    strokeWidth={k === 1 ? 2 : 1}
                    strokeDasharray={k === 1 ? undefined : "4 4"}
                    opacity={0.8}
                  />
                )),
              )}
            {models &&
              models.map((m, c) => (
                <g key={"m" + c} transform={`translate(${scale.sx(m.mx)} ${scale.sy(m.my)})`}>
                  <path d="M-6 0 H6 M0 -6 V6" stroke={CLASS_COLORS[c]} strokeWidth={2.5} />
                </g>
              ))}
            {points.map((p, i) => (
              <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} fill={CLASS_COLORS[p.label]} stroke="#fff" strokeWidth={1.5} />
            ))}
            {query && queryInfo && (
              <circle cx={scale.sx(query.x)} cy={scale.sy(query.y)} r={8} fill={CLASS_COLORS[queryInfo.label]} opacity={0.5} stroke="var(--ink)" strokeWidth={1.5} />
            )}
          </svg>
        </div>

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

          {models && (
            <div className="stat-grid">
              <Stat label="P(class 0)" value={formatNum(models[0].prior, 2)} />
              <Stat label="P(class 1)" value={formatNum(models[1].prior, 2)} />
              <Stat label="class 0 (μ, σ²)" value={`x₁: ${formatNum(models[0].mx, 1)}, ${formatNum(models[0].vx, 1)}`} />
              <Stat label="class 1 (μ, σ²)" value={`x₁: ${formatNum(models[1].mx, 1)}, ${formatNum(models[1].vx, 1)}`} />
            </div>
          )}

          {queryInfo && query ? (
            <div className="loss-chart">
              <div className="loss-chart-title">
                Bayes' rule at ({formatNum(query.x, 1)}, {formatNum(query.y, 1)})
              </div>
              {[0, 1].map((c) => (
                <div key={c} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, marginBottom: 2 }}>
                    <strong style={{ color: CLASS_COLORS[c] }}>class {c}</strong>: {formatNum(models![c].prior, 2)} ×{" "}
                    {formatNum(queryInfo.like[c].px, 3)} × {formatNum(queryInfo.like[c].py, 3)} ={" "}
                    {queryInfo.scores[c].toExponential(2)}
                  </div>
                  <div className="var-bar" style={{ height: 18 }}>
                    <div
                      className="var-bar-fill"
                      style={{ width: `${queryInfo.post[c] * 100}%`, background: CLASS_COLORS_SOFT[c], borderRight: `2px solid ${CLASS_COLORS[c]}` }}
                    />
                    <span className="var-bar-label" style={{ fontSize: 11 }}>
                      posterior {formatNum(queryInfo.post[c] * 100, 1)}%
                    </span>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: "var(--muted)" }}>prior × P(x₁|c) × P(x₂|c), then normalized</div>
            </div>
          ) : (
            <div className="callout">Hover over the plot to see the posterior computed term by term.</div>
          )}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>
        </div>
      </div>

      <Explain title="1 · Model each class, then invert with Bayes">
        <p>
          Instead of learning the boundary directly, Naive Bayes learns what each class's data{" "}
          <em>looks like</em> — here, a Gaussian per feature per class (the crosses are the means{" "}
          <Formula tex="\mu" />, the ellipses the 1σ and 2σ contours). Prediction inverts the
          question with Bayes' rule:
        </p>
        <Formula block tex="P(c \mid \mathbf{x}) = \frac{P(c)\, P(\mathbf{x} \mid c)}{P(\mathbf{x})} \;\propto\; P(c)\, P(x_1 \mid c)\, P(x_2 \mid c)" />
        <p>
          The hover panel computes exactly this product: prior × two Gaussian likelihoods, then
          normalizes the two scores so they sum to 1. The background shows which class wins at every
          location.
        </p>
      </Explain>

      <Explain title="2 · The “naive” assumption is the factorization">
        <p>
          Writing <Formula tex="P(\mathbf{x} \mid c) = P(x_1 \mid c)\, P(x_2 \mid c)" /> assumes the
          features are independent <em>within</em> each class — which is why the ellipses are always
          axis-aligned, never tilted. Arrange one class's points along a diagonal: the model can't
          represent that tilt, and you'll see the fitted ellipse stay upright while the decision
          regions suffer. That mismatch is the price of naivety; the payoff is that each
          1-dimensional <Formula tex="P(x_j \mid c)" /> needs just a mean and a variance — fitted in
          one pass, with almost no data.
        </p>
        <Formula block tex="P(x_j \mid c) = \frac{1}{\sqrt{2\pi\sigma_{jc}^2}}\, e^{-\frac{(x_j - \mu_{jc})^2}{2\sigma_{jc}^2}}" />
      </Explain>

      <Explain title="3 · Priors matter — try unbalancing the data">
        <p>
          The sample data is deliberately unbalanced (12 vs 8 points), so the priors differ. Add
          many points to one class and watch the boundary shift toward the rare class — with little
          evidence, the model defaults toward whichever class is more common. Notice also how the
          boundary curves wherever the two classes have different variances: a tight class beats a
          spread-out one near its center but loses far away, because its Gaussian decays faster.
        </p>
      </Explain>
    </div>
  );
}
