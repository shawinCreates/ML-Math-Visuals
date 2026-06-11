import { useEffect, useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, CLASS_COLORS_SOFT, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): LabeledPoint[] {
  const centers = [
    { x: 2.8, y: 7, label: 0 },
    { x: 7.2, y: 6.8, label: 1 },
    { x: 5, y: 2.8, label: 2 },
  ];
  const pts: LabeledPoint[] = [];
  for (const c of centers) {
    for (let i = 0; i < 8; i++) {
      pts.push({
        x: clamp(c.x + randn() * 1.1, 0.2, 9.8),
        y: clamp(c.y + randn() * 1.1, 0.2, 9.8),
        label: c.label,
      });
    }
  }
  return pts;
}

function kNearest(points: LabeledPoint[], x: number, y: number, k: number) {
  return points
    .map((p, i) => ({ i, p, d: Math.hypot(p.x - x, p.y - y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
}

function vote(neigh: { p: LabeledPoint }[]): number {
  const counts = new Map<number, number>();
  for (const n of neigh) counts.set(n.p.label, (counts.get(n.p.label) ?? 0) + 1);
  let best = -1;
  let bestCount = -1;
  counts.forEach((cnt, label) => {
    if (cnt > bestCount) {
      bestCount = cnt;
      best = label;
    }
  });
  return best;
}

export function KNN() {
  const [points, setPoints] = useState<LabeledPoint[]>(samplePoints);
  const [activeClass, setActiveClass] = useState(0);
  const [k, setK] = useState(3);
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { dragging, handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({
    x,
    y,
    label: activeClass,
  }));

  // Paint decision regions on the backing canvas (one pass per change).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, scale.width, scale.height);
    if (points.length === 0) return;
    const cell = 5;
    for (let px = scale.innerLeft; px < scale.innerRight; px += cell) {
      for (let py = scale.innerTop; py < scale.innerBottom; py += cell) {
        const x = scale.dx(px + cell / 2);
        const y = scale.dy(py + cell / 2);
        const label = vote(kNearest(points, x, y, Math.min(k, points.length)));
        ctx.fillStyle = CLASS_COLORS_SOFT[label];
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }, [points, k]);

  const queryInfo = useMemo(() => {
    if (!query || points.length === 0) return null;
    const neigh = kNearest(points, query.x, query.y, Math.min(k, points.length));
    return { neigh, label: vote(neigh) };
  }, [query, points, k]);

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
        Hover anywhere to classify that spot — lines show its k nearest neighbors. Click to add
        points of the selected class, drag to move, Alt-click to delete.
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
            {queryInfo && query && (
              <g>
                {queryInfo.neigh.map((n, i) => (
                  <line
                    key={i}
                    x1={scale.sx(query.x)}
                    y1={scale.sy(query.y)}
                    x2={scale.sx(n.p.x)}
                    y2={scale.sy(n.p.y)}
                    stroke={CLASS_COLORS[n.p.label]}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                ))}
                <circle
                  cx={scale.sx(query.x)}
                  cy={scale.sy(query.y)}
                  r={8}
                  fill={CLASS_COLORS[queryInfo.label]}
                  opacity={0.55}
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                />
              </g>
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
        </div>

        <div className="viz-side">
          <div className="btn-row">
            {[0, 1, 2].map((c) => (
              <button
                key={c}
                className={"btn btn-class" + (activeClass === c ? " btn-class-active" : "")}
                style={{ ["--class-color" as string]: CLASS_COLORS[c] }}
                onClick={() => setActiveClass(c)}
              >
                Class {c}
              </button>
            ))}
          </div>

          <Slider label="neighbors k" value={k} min={1} max={15} step={1} onChange={setK} />

          <div className="stat-grid">
            <Stat label="k" value={k} />
            <Stat label="points" value={points.length} />
            {queryInfo && query && (
              <>
                <Stat label="hover prediction" value={`class ${queryInfo.label}`} />
                <Stat label="farthest of the k" value={formatNum(queryInfo.neigh[queryInfo.neigh.length - 1].d, 2)} />
              </>
            )}
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>

          {queryInfo && (
            <div className="callout">
              Votes:{" "}
              {[0, 1, 2]
                .map((c) => ({ c, n: queryInfo.neigh.filter((nn) => nn.p.label === c).length }))
                .filter((v) => v.n > 0)
                .map((v) => `class ${v.c} × ${v.n}`)
                .join(", ")}{" "}
              → majority is class {queryInfo.label}.
            </div>
          )}
        </div>
      </div>

      <Explain title="1 · No training, just a distance and a vote">
        <p>
          KNN has no parameters to learn — the “model” <em>is</em> the data. To classify a new point{" "}
          <Formula tex="\mathbf{q}" />, measure its Euclidean distance to every stored point,
        </p>
        <Formula block tex="d(\mathbf{q}, \mathbf{x}_i) = \sqrt{(q_1 - x_{i1})^2 + (q_2 - x_{i2})^2}" />
        <p>
          keep the <Formula tex="k" /> closest, and let them vote. The dashed lines you see while
          hovering are literally these distances; the vote tally appears on the right.
        </p>
      </Explain>

      <Explain title="2 · k controls the smoothness of the boundary">
        <p>
          The colored background shows the prediction at every location — the <em>decision
          regions</em>. With <Formula tex="k = 1" /> every training point owns its own little
          territory, so a single mislabeled point creates an island of wrong predictions
          (overfitting — try adding one stray point inside another class). Raising{" "}
          <Formula tex="k" /> averages over more neighbors: islands dissolve and boundaries smooth
          out, but a very large <Formula tex="k" /> lets distant points outvote the local
          neighborhood and small classes get swallowed (underfitting). Slide <Formula tex="k" />{" "}
          from 1 to 15 and watch the map redraw — that's the bias–variance trade-off as geography.
        </p>
      </Explain>

      <Explain title="3 · The fine print that matters in practice">
        <p>
          Because everything rests on distances, feature scales matter enormously: if{" "}
          <Formula tex="x_1" /> ranged 0–1000 and <Formula tex="x_2" /> 0–1, the vote would be
          decided by <Formula tex="x_1" /> alone — which is why features are standardized first.
          Even ties matter: with two classes an even <Formula tex="k" /> can deadlock, so odd values
          are preferred. And since classifying one point means scanning the whole dataset, KNN
          trades cheap training for expensive predictions.
        </p>
      </Explain>
    </div>
  );
}
