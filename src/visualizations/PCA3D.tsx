import { useMemo, useState } from "react";
import { Canvas3D, Viz3DSection } from "../components/Viz3D";
import { View, Prim, Vec3, paintSorted, quadPrim, floorGrid, ballPrim, linePrim, cross, normalize } from "../lib/scene3d";
import { Slider } from "../components/Slider";
import { Stat } from "../components/Explain";
import { CLASS_COLORS } from "../lib/plot";

const N = 64;

function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Random orthonormal frame for the data's hidden plane. */
function randomFrame(): [Vec3, Vec3, Vec3] {
  const a = normalize({ x: randn(), y: randn(), z: randn() * 0.5 });
  let b = normalize(cross(a, { x: 0, y: 0, z: 1 }));
  if (!Number.isFinite(b.x)) b = { x: 1, y: 0, z: 0 };
  const c = normalize(cross(a, b));
  return [a, b, c];
}

function sampleCloud(): Vec3[] {
  const [e1, e2, e3] = randomFrame();
  return Array.from({ length: N }, () => {
    const u = randn() * 1.5;
    const v = randn() * 0.8;
    const w = randn() * 0.22;
    return {
      x: u * e1.x + v * e2.x + w * e3.x,
      y: u * e1.y + v * e2.y + w * e3.y,
      z: u * e1.z + v * e2.z + w * e3.z,
    };
  });
}

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

function covApply(cov: number[][], v: Vec3): Vec3 {
  return {
    x: cov[0][0] * v.x + cov[0][1] * v.y + cov[0][2] * v.z,
    y: cov[1][0] * v.x + cov[1][1] * v.y + cov[1][2] * v.z,
    z: cov[2][0] * v.x + cov[2][1] * v.y + cov[2][2] * v.z,
  };
}

/** Top eigenvector by power iteration, after deflating `remove`. */
function powerIter(cov: number[][], remove: { v: Vec3; l: number }[]): { v: Vec3; l: number } {
  let v: Vec3 = normalize({ x: 1, y: 0.7, z: 0.4 });
  for (let i = 0; i < 60; i++) {
    let next = covApply(cov, v);
    for (const r of remove) {
      const proj = dot(next, r.v);
      next = { x: next.x - proj * r.v.x, y: next.y - proj * r.v.y, z: next.z - proj * r.v.z };
    }
    v = normalize(next);
  }
  const lv = covApply(cov, v);
  return { v, l: Math.max(dot(lv, v), 1e-9) };
}

function pca(points: Vec3[]) {
  const c = points.reduce((s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }), { x: 0, y: 0, z: 0 });
  const mean: Vec3 = { x: c.x / points.length, y: c.y / points.length, z: c.z / points.length };
  const cov = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d = [p.x - mean.x, p.y - mean.y, p.z - mean.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += (d[i] * d[j]) / points.length;
  }
  const p1 = powerIter(cov, []);
  const p2 = powerIter(cov, [p1]);
  const p3 = powerIter(cov, [p1, p2]);
  return { mean, pcs: [p1, p2, p3] };
}

export function PCA3D() {
  const [points, setPoints] = useState<Vec3[]>(sampleCloud);
  const [proj, setProj] = useState(0);
  const [showPlane, setShowPlane] = useState(true);

  const { mean, pcs } = useMemo(() => pca(points), [points]);
  const total = pcs[0].l + pcs[1].l + pcs[2].l;
  const kept = ((pcs[0].l + pcs[1].l) / total) * 100;

  const draw = (ctx: CanvasRenderingContext2D, view: View) => {
    const prims: Prim[] = [...floorGrid(view, 3, 1)];
    const [p1, p2, p3] = pcs;

    if (showPlane) {
      const s1 = 2.6 * Math.sqrt(p1.l);
      const s2 = 2.6 * Math.sqrt(p2.l);
      const corner = (a: number, b: number): Vec3 => ({
        x: mean.x + a * s1 * p1.v.x + b * s2 * p2.v.x,
        y: mean.y + a * s1 * p1.v.y + b * s2 * p2.v.y,
        z: mean.z + a * s1 * p1.v.z + b * s2 * p2.v.z,
      });
      prims.push(
        quadPrim(view, [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], "#0d9488", "#0f766e", 0.13)
      );
    }

    // principal axes, scaled by sqrt(eigenvalue)
    pcs.forEach((pc, i) => {
      const len = 2.2 * Math.sqrt(pc.l);
      const a: Vec3 = {
        x: mean.x - len * pc.v.x,
        y: mean.y - len * pc.v.y,
        z: mean.z - len * pc.v.z,
      };
      const b: Vec3 = {
        x: mean.x + len * pc.v.x,
        y: mean.y + len * pc.v.y,
        z: mean.z + len * pc.v.z,
      };
      prims.push(linePrim(view, [a, b], CLASS_COLORS[i], i === 0 ? 2.6 : 1.8, 0.95, -0.6));
    });

    for (const p of points) {
      const d = { x: p.x - mean.x, y: p.y - mean.y, z: p.z - mean.z };
      const off = dot(d, p3.v) * proj;
      const q: Vec3 = { x: p.x - off * p3.v.x, y: p.y - off * p3.v.y, z: p.z - off * p3.v.z };
      prims.push(ballPrim(view, q, 4.2, "#16202e", -0.3));
    }

    paintSorted(ctx, prims);
  };

  return (
    <Viz3DSection
      title="Projection in three dimensions"
      lead="PCA's real job is dropping dimensions. Here the cloud lives in 3D; slide the projection and watch it flatten onto the plane spanned by the top two components."
    >
      <div className="viz-row">
        <Canvas3D
          draw={draw}
          redrawKey={[points, proj, showPlane]}
          ariaLabel="3D point cloud with its three principal axes and the best-fit plane, flattening as the projection slider rises"
          dist={10.5}
          pitch={0.5}
        />
        <div className="viz-side">
          <div className="stat-grid">
            <Stat
              label={
                <>
                  <span className="legend-swatch" style={{ background: CLASS_COLORS[0] }} />
                  PC1 λ
                </>
              }
              value={pcs[0].l.toFixed(2)}
            />
            <Stat
              label={
                <>
                  <span className="legend-swatch" style={{ background: CLASS_COLORS[1] }} />
                  PC2 λ
                </>
              }
              value={pcs[1].l.toFixed(2)}
            />
            <Stat
              label={
                <>
                  <span className="legend-swatch" style={{ background: CLASS_COLORS[2] }} />
                  PC3 λ
                </>
              }
              value={pcs[2].l.toFixed(2)}
            />
            <Stat label="variance kept" value={`${kept.toFixed(1)}%`} />
          </div>
          <Slider
            label="project to 2D"
            value={proj}
            min={0}
            max={1}
            step={0.01}
            onChange={setProj}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <label className="checkbox">
            <input type="checkbox" checked={showPlane} onChange={(e) => setShowPlane(e.target.checked)} />
            Show PC1-PC2 plane
          </label>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={() => {
                setPoints(sampleCloud());
                setProj(0);
              }}
            >
              New sample data
            </button>
          </div>
          <div className="callout">
            At 100% every point has its PC3 component removed: three coordinates become two, and
            the variance kept stat says exactly how much information survived the squash.
          </div>
        </div>
      </div>
    </Viz3DSection>
  );
}
