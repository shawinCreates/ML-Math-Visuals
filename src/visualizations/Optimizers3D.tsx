import { useMemo, useRef, useState } from "react";
import { Canvas3D, Viz3DSection, prefersReducedMotion } from "../components/Viz3D";
import { View, Prim, paintSorted, quadPrim, linePrim, ballPrim, lambert, hexRgb } from "../lib/scene3d";
import { Slider } from "../components/Slider";
import { Stat } from "../components/Explain";
import { CLASS_COLORS } from "../lib/plot";

const SGD_COLOR = CLASS_COLORS[1]; // orange
const MOM_COLOR = CLASS_COLORS[0]; // blue
const RANGE = 3;
const MAX_STEPS = 160;
const STEP_MS = 40;
// loss cutoff: the bowl's rim sits at f = RIM everywhere, so the surface is a
// true elliptical bowl whose footprint stretches with the condition number
const RIM = 0.5 * RANGE * RANGE;
const Z_TOP = 2.3;
const Z_SCALE = Z_TOP / RIM;

interface Path {
  pts: { x: number; y: number }[];
  diverged: boolean;
  converged: boolean;
}

function descend(start: { x: number; y: number }, k: number, lr: number, beta: number): Path {
  const pts = [start];
  let { x, y } = start;
  let vx = 0;
  let vy = 0;
  for (let s = 0; s < MAX_STEPS; s++) {
    const gx = x;
    const gy = k * y;
    vx = beta * vx - lr * gx;
    vy = beta * vy - lr * gy;
    x += vx;
    y += vy;
    pts.push({ x, y });
    if (Math.abs(x) > RANGE * 1.6 || Math.abs(y) > RANGE * 1.6) {
      return { pts, diverged: true, converged: false };
    }
    if (Math.hypot(gx, gy) < 4e-3 && Math.hypot(vx, vy) < 4e-3) {
      return { pts, diverged: false, converged: true };
    }
  }
  return { pts, diverged: false, converged: false };
}

/** Direction seed; the actual start point is placed just inside the rim for any k. */
function randomSeed() {
  return {
    x: (Math.random() < 0.5 ? -1 : 1) * (1.7 + Math.random() * 0.9),
    fy: (Math.random() < 0.5 ? -1 : 1) * (0.75 + Math.random() * 0.18),
  };
}

export function Optimizers3D() {
  const [k, setK] = useState(6);
  const [lr, setLr] = useState(0.04);
  const [beta, setBeta] = useState(0.85);
  const [seed, setSeed] = useState(randomSeed);
  const animStart = useRef(performance.now());

  const { sgd, mom, zOf } = useMemo(() => {
    animStart.current = performance.now();
    const yMax = Math.sqrt(Math.max(2 * RIM * 0.92 - seed.x * seed.x, 0.2) / k);
    const start = { x: seed.x, y: seed.fy * yMax };
    return {
      sgd: descend(start, k, lr, 0),
      mom: descend(start, k, lr, beta),
      zOf: (x: number, y: number) => 0.5 * (x * x + k * y * y) * Z_SCALE,
    };
  }, [k, lr, beta, seed]);

  const draw = (ctx: CanvasRenderingContext2D, view: View) => {
    const prims: Prim[] = [];

    // elliptical-polar mesh: rings of constant loss, so the grid IS the
    // contour map and the rim is perfectly smooth at every condition number
    const NU = 16;
    const NT = 48;
    const ry = RANGE / Math.sqrt(k);
    const corner = (u: number, th: number) => ({
      x: RANGE * u * Math.cos(th),
      y: ry * u * Math.sin(th),
      z: Z_TOP * u * u,
    });
    for (let iu = 0; iu < NU; iu++) {
      const u0 = iu / NU;
      const u1 = (iu + 1) / NU;
      for (let it = 0; it < NT; it++) {
        const t0 = (it / NT) * Math.PI * 2;
        const t1 = ((it + 1) / NT) * Math.PI * 2;
        const q: [any, any, any, any] = [corner(u0, t0), corner(u1, t0), corner(u1, t1), corner(u0, t1)];
        const h = u1 * u1;
        const lam = lambert(q[0], q[1], q[3]);
        // valley floor teal-tinted, rim near-white, steep faces slightly darker
        const lo = hexRgb("#bfe7df");
        const hi = hexRgb("#eef2f8");
        const l = 0.74 + 0.26 * lam;
        const ch = lo.map((c, ci) => Math.round((c + (hi[ci] - c) * h) * l)) as [number, number, number];
        prims.push(quadPrim(view, q, `rgb(${ch[0]},${ch[1]},${ch[2]})`, "rgba(255,255,255,0.5)"));
      }
    }

    // animated reveal of both descent paths
    const elapsed = performance.now() - animStart.current;
    const reveal = prefersReducedMotion()
      ? MAX_STEPS
      : Math.max(2, Math.floor(elapsed / STEP_MS));
    const lift = 0.05;

    for (const [path, color] of [
      [sgd, SGD_COLOR],
      [mom, MOM_COLOR],
    ] as const) {
      const shown = path.pts.slice(0, reveal).map((p) => ({
        x: p.x,
        y: p.y,
        z: Math.min(zOf(p.x, p.y), Z_TOP) + lift,
      }));
      if (shown.length >= 2) prims.push(linePrim(view, shown, color, 2.2, 0.95, -0.4));
      const head = shown[shown.length - 1];
      if (head) prims.push(ballPrim(view, head, 5.4, color, -0.5));
    }

    paintSorted(ctx, prims);
    if (reveal < Math.max(sgd.pts.length, mom.pts.length)) view.requestRender();
  };

  const verdict = (p: Path) =>
    p.diverged ? "diverged" : p.converged ? `${p.pts.length - 1} steps` : `${MAX_STEPS}+ steps`;

  return (
    <Viz3DSection
      title="The loss surface"
      lead="The same valley the 2D contours describe, as terrain. Stretch it, then watch plain gradient descent fight the walls while momentum flows along the floor."
    >
      <div className="viz-row">
        <Canvas3D
          draw={draw}
          redrawKey={[k, lr, beta, seed]}
          ariaLabel="3D loss surface with gradient descent and momentum trajectories rolling toward the minimum"
          dist={11}
          pitch={0.6}
          zShift={-1}
        />
        <div className="viz-side">
          <div className="stat-grid">
            <Stat
              label={
                <>
                  <span className="legend-swatch" style={{ background: SGD_COLOR }} />
                  plain SGD
                </>
              }
              value={verdict(sgd)}
            />
            <Stat
              label={
                <>
                  <span className="legend-swatch" style={{ background: MOM_COLOR }} />
                  momentum
                </>
              }
              value={verdict(mom)}
            />
          </div>
          <Slider label="condition number" value={k} min={1} max={16} step={1} onChange={setK} />
          <Slider
            label="learning rate α"
            value={lr}
            min={0.02}
            max={0.3}
            step={0.01}
            onChange={setLr}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="momentum β"
            value={beta}
            min={0}
            max={0.95}
            step={0.05}
            onChange={setBeta}
            format={(v) => v.toFixed(2)}
          />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setSeed(randomSeed())}>
              New start point
            </button>
          </div>
          <div className="callout">
            Raise the condition number and the bowl becomes a canyon: the gradient points at the
            walls, not the exit. Momentum averages those sideways pulls away.
          </div>
        </div>
      </div>
    </Viz3DSection>
  );
}
