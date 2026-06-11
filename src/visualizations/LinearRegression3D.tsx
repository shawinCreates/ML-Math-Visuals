import { useMemo, useState } from "react";
import { Canvas3D, Viz3DSection } from "../components/Viz3D";
import { View, Prim, Vec3, paintSorted, quadPrim, floorGrid, ballPrim, linePrim, lambert, mixColor } from "../lib/scene3d";
import { Slider } from "../components/Slider";
import { Stat } from "../components/Explain";

const RANGE = 2.5; // features in [-RANGE, RANGE]
const Z_SCALE = 0.35;

interface Sample {
  x1: number;
  x2: number;
  y: number;
}

function sampleData(): { pts: Sample[]; yMean: number } {
  const a = 0.4 + Math.random() * 0.9;
  const b = -1 + Math.random() * 2;
  const c = 1 + Math.random() * 2;
  const pts = Array.from({ length: 24 }, () => {
    const x1 = -RANGE + Math.random() * 2 * RANGE;
    const x2 = -RANGE + Math.random() * 2 * RANGE;
    return { x1, x2, y: a * x1 + b * x2 + c + (Math.random() * 2 - 1) * 1.1 };
  });
  const yMean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { pts, yMean };
}

/** Solve the 3x3 normal equations for y = w1·x1 + w2·x2 + b via Cramer's rule. */
function olsPlane(pts: Sample[]): [number, number, number] {
  let s11 = 0, s12 = 0, s1 = 0, s22 = 0, s2 = 0, sy1 = 0, sy2 = 0, sy = 0;
  const n = pts.length;
  for (const p of pts) {
    s11 += p.x1 * p.x1;
    s12 += p.x1 * p.x2;
    s22 += p.x2 * p.x2;
    s1 += p.x1;
    s2 += p.x2;
    sy1 += p.x1 * p.y;
    sy2 += p.x2 * p.y;
    sy += p.y;
  }
  const A = [
    [s11, s12, s1],
    [s12, s22, s2],
    [s1, s2, n],
  ];
  const r = [sy1, sy2, sy];
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d = det(A);
  if (Math.abs(d) < 1e-9) return [0, 0, sy / n];
  const col = (k: number) => A.map((row, i) => row.map((v, j) => (j === k ? r[i] : v)));
  return [det(col(0)) / d, det(col(1)) / d, det(col(2)) / d];
}

export function LinearRegression3D() {
  const [{ pts, yMean }, setData] = useState(sampleData);
  const [w1, setW1] = useState(0.5);
  const [w2, setW2] = useState(0);
  const [b, setB] = useState(2);
  const [showResiduals, setShowResiduals] = useState(true);

  const mse = useMemo(
    () => pts.reduce((s, p) => s + (w1 * p.x1 + w2 * p.x2 + b - p.y) ** 2, 0) / pts.length,
    [pts, w1, w2, b]
  );

  const zOf = (y: number) => (y - yMean) * Z_SCALE;
  const planeZ = (x1: number, x2: number) => zOf(w1 * x1 + w2 * x2 + b);

  const draw = (ctx: CanvasRenderingContext2D, view: View) => {
    const prims: Prim[] = [...floorGrid(view, 3, 1)];
    const n = 10;
    const step = (2 * RANGE) / n;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const x0 = -RANGE + i * step;
        const y0 = -RANGE + j * step;
        const q: [Vec3, Vec3, Vec3, Vec3] = [
          { x: x0, y: y0, z: planeZ(x0, y0) },
          { x: x0 + step, y: y0, z: planeZ(x0 + step, y0) },
          { x: x0 + step, y: y0 + step, z: planeZ(x0 + step, y0 + step) },
          { x: x0, y: y0 + step, z: planeZ(x0, y0 + step) },
        ];
        const lam = lambert(q[0], q[1], q[3]);
        prims.push(quadPrim(view, q, mixColor("#0f766e", "#5eead4", 0.3 + 0.7 * lam), undefined, 0.32));
      }
    }

    for (const p of pts) {
      const pz = zOf(p.y);
      const fz = planeZ(p.x1, p.x2);
      if (showResiduals) {
        prims.push(
          linePrim(
            view,
            [
              { x: p.x1, y: p.x2, z: pz },
              { x: p.x1, y: p.x2, z: fz },
            ],
            "#e0506b",
            1.4,
            0.8
          )
        );
      }
      prims.push(ballPrim(view, { x: p.x1, y: p.x2, z: pz }, 4.6, "#16202e", -0.3));
    }

    paintSorted(ctx, prims);
  };

  return (
    <Viz3DSection
      title="Two features, one plane"
      lead="With a second feature the fitted line becomes a fitted plane. Tilt it with the weight sliders and shrink the red residuals, or jump straight to the closed-form answer."
    >
      <div className="viz-row">
        <Canvas3D
          draw={draw}
          redrawKey={[pts, w1, w2, b, showResiduals]}
          ariaLabel="3D scatter of two-feature data with an adjustable regression plane and vertical residual lines"
          dist={10.5}
          pitch={0.45}
        />
        <div className="viz-side">
          <div className="stat-grid">
            <Stat label="MSE loss" value={mse.toFixed(3)} />
            <Stat label="points" value={pts.length} />
          </div>
          <Slider label="weight w₁" value={w1} min={-2} max={2} step={0.05} onChange={setW1} format={(v) => v.toFixed(2)} />
          <Slider label="weight w₂" value={w2} min={-2} max={2} step={0.05} onChange={setW2} format={(v) => v.toFixed(2)} />
          <Slider label="bias b" value={b} min={-2} max={6} step={0.1} onChange={setB} format={(v) => v.toFixed(1)} />
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                const [a1, a2, a3] = olsPlane(pts);
                setW1(Math.round(a1 * 100) / 100);
                setW2(Math.round(a2 * 100) / 100);
                setB(Math.round(a3 * 10) / 10);
              }}
            >
              Jump to best fit (OLS)
            </button>
            <button
              className="btn"
              onClick={() => {
                setData(sampleData());
              }}
            >
              New sample data
            </button>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={showResiduals}
              onChange={(e) => setShowResiduals(e.target.checked)}
            />
            Show residuals
          </label>
          <div className="callout">
            Same least squares, one dimension up: the normal equations now solve for three numbers,
            and every extra feature just adds another tilt axis to this plane.
          </div>
        </div>
      </div>
    </Viz3DSection>
  );
}
