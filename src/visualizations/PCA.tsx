import { useMemo, useRef, useState } from "react";
import { Point, clamp, covariance2, eigen2x2, formatNum, randn } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";
import { PCA3D } from "./PCA3D";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): Point[] {
  // Correlated cloud along a random direction
  const angle = Math.PI / 6 + (Math.random() * Math.PI) / 3;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  return Array.from({ length: 26 }, () => {
    const a = randn() * 2.2; // spread along the main direction
    const b = randn() * 0.6; // spread across it
    return {
      x: clamp(5 + a * ux - b * uy, 0.2, 9.8),
      y: clamp(5 + a * uy + b * ux, 0.2, 9.8),
    };
  });
}

export function PCA() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [showProjections, setShowProjections] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y }));

  const pca = useMemo(() => {
    if (points.length < 2) return null;
    const cov = covariance2(points);
    const eig = eigen2x2(cov.sxx, cov.sxy, cov.syy);
    return { cov, eig };
  }, [points]);

  const projections = useMemo(() => {
    if (!pca || !showProjections) return null;
    const { cov, eig } = pca;
    const [vx, vy] = eig.vectors[0];
    return points.map((p) => {
      const t = (p.x - cov.mx) * vx + (p.y - cov.my) * vy;
      return { from: p, to: { x: cov.mx + t * vx, y: cov.my + t * vy } };
    });
  }, [pca, points, showProjections]);

  const totalVar = pca ? pca.eig.values[0] + pca.eig.values[1] : 0;
  const explained = pca && totalVar > 0 ? pca.eig.values[0] / totalVar : 0;

  function axisLine(vec: [number, number], lambda: number) {
    if (!pca) return null;
    const len = 2 * Math.sqrt(Math.max(0, lambda));
    return {
      x1: pca.cov.mx - vec[0] * len,
      y1: pca.cov.my - vec[1] * len,
      x2: pca.cov.mx + vec[0] * len,
      y2: pca.cov.my + vec[1] * len,
    };
  }

  const pc1 = pca ? axisLine(pca.eig.vectors[0], pca.eig.values[0]) : null;
  const pc2 = pca ? axisLine(pca.eig.vectors[1], pca.eig.values[1]) : null;

  return (
    <div>
      <Hint>
        Click to add points, drag to move, Alt-click to delete. The arrows are computed live from
        the covariance matrix of your data — try dragging the cloud into different shapes.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {projections?.map((pr, i) => (
            <g key={"pr" + i}>
              <line
                x1={scale.sx(pr.from.x)}
                y1={scale.sy(pr.from.y)}
                x2={scale.sx(pr.to.x)}
                y2={scale.sy(pr.to.y)}
                stroke="var(--muted)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle cx={scale.sx(pr.to.x)} cy={scale.sy(pr.to.y)} r={4} fill="var(--danger)" opacity={0.8} />
            </g>
          ))}
          {points.map((p, i) => (
            <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} className="data-point" opacity={showProjections ? 0.45 : 1} />
          ))}
          {pca && pc1 && pc2 && (
            <g>
              <line x1={scale.sx(pc2.x1)} y1={scale.sy(pc2.y1)} x2={scale.sx(pc2.x2)} y2={scale.sy(pc2.y2)} stroke="var(--success)" strokeWidth={2.5} />
              <line x1={scale.sx(pc1.x1)} y1={scale.sy(pc1.y1)} x2={scale.sx(pc1.x2)} y2={scale.sy(pc1.y2)} stroke="var(--danger)" strokeWidth={3} />
              <circle cx={scale.sx(pca.cov.mx)} cy={scale.sy(pca.cov.my)} r={5} fill="var(--ink)" />
              <text x={scale.sx(pc1.x2) + 6} y={scale.sy(pc1.y2)} className="axis-label" fill="var(--danger)">PC1</text>
              <text x={scale.sx(pc2.x2) + 6} y={scale.sy(pc2.y2)} className="axis-label" fill="var(--success)">PC2</text>
            </g>
          )}
        </svg>

        <div className="viz-side">
          {pca && (
            <>
              <div className="stat-grid">
                <Stat label={<Formula tex="\lambda_1" />} value={formatNum(pca.eig.values[0], 3)} />
                <Stat label={<Formula tex="\lambda_2" />} value={formatNum(pca.eig.values[1], 3)} />
                <Stat label="PC1 variance share" value={`${formatNum(explained * 100, 1)}%`} />
                <Stat label="points" value={points.length} />
              </div>

              <div className="loss-chart">
                <div className="loss-chart-title">Covariance matrix (live)</div>
                <Formula
                  block
                  tex={`\\Sigma = \\begin{bmatrix} ${formatNum(pca.cov.sxx, 2)} & ${formatNum(pca.cov.sxy, 2)} \\\\ ${formatNum(pca.cov.sxy, 2)} & ${formatNum(pca.cov.syy, 2)} \\end{bmatrix}`}
                />
              </div>

              <div className="var-bar">
                <div className="var-bar-fill" style={{ width: `${explained * 100}%` }} />
                <span className="var-bar-label">PC1 keeps {formatNum(explained * 100, 1)}% of the variance</span>
              </div>
            </>
          )}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showProjections} onChange={(e) => setShowProjections(e.target.checked)} />
            Project every point onto PC1 (reduce 2D → 1D)
          </label>
        </div>
      </div>

      <Explain title="1 · The covariance matrix describes the cloud's shape">
        <p>
          Center the data at its mean, then summarize how it spreads with the covariance matrix:
        </p>
        <Formula block tex="\Sigma = \begin{bmatrix} \mathrm{Var}(x_1) & \mathrm{Cov}(x_1, x_2) \\ \mathrm{Cov}(x_1, x_2) & \mathrm{Var}(x_2) \end{bmatrix}" />
        <p>
          The diagonal entries are the spread along each raw axis; the off-diagonal entry says how
          the two move together. Drag points to make the cloud tilt the other way and watch the
          sign of <Formula tex="\mathrm{Cov}(x_1, x_2)" /> flip in the live matrix.
        </p>
      </Explain>

      <Explain title="2 · Eigenvectors are the cloud's natural axes">
        <p>
          PCA asks: along which direction <Formula tex="\mathbf{v}" /> does the data vary the most?
          Maximizing the projected variance <Formula tex="\mathbf{v}^\top \Sigma \mathbf{v}" /> over
          unit vectors leads exactly to the eigenvalue equation
        </p>
        <Formula block tex="\Sigma \mathbf{v} = \lambda \mathbf{v}" />
        <p>
          The red arrow (PC1) is the eigenvector with the largest eigenvalue{" "}
          <Formula tex="\lambda_1" /> — the direction of maximum variance. PC2 is perpendicular and
          carries the leftover variance <Formula tex="\lambda_2" />. The arrows are drawn with
          length <Formula tex="2\sqrt{\lambda}" />, so their proportions show the variance split.
          Stretch the cloud into a circle and watch the two eigenvalues equalize — then PCA has no
          preferred direction at all.
        </p>
      </Explain>

      <Explain title="3 · Dimensionality reduction = keep the big eigenvalues">
        <p>
          Turn on the projection toggle: each point drops perpendicularly onto the PC1 line, keeping
          only its coordinate <Formula tex="t_i = \mathbf{v}_1^\top(\mathbf{x}_i - \bar{\mathbf{x}})" />.
          You have compressed 2D data to 1D, losing only the variance{" "}
          <Formula tex="\lambda_2" /> (the percentage bar shows what survives). Real PCA does the
          same in hundreds of dimensions: diagonalize <Formula tex="\Sigma" />, sort the
          eigenvalues, and keep the top few directions that explain most of the variance.
        </p>
      </Explain>
      <PCA3D />
    </div>
  );
}
