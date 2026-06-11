import { useEffect, useMemo, useState } from "react";
import { Canvas3D, Viz3DSection, prefersReducedMotion } from "../components/Viz3D";
import { View, Prim, Vec3, paintSorted, quadPrim, floorGrid, ballPrim, linePrim } from "../lib/scene3d";
import { Slider } from "../components/Slider";
import { Stat } from "../components/Explain";
import { CLASS_COLORS } from "../lib/plot";

const INNER_R = 1.05;
const OUTER_R0 = 1.95;
const OUTER_R1 = 2.7;
const Z_SCALE = 0.34;
const THRESH = (INNER_R * INNER_R + OUTER_R0 * OUTER_R0) / 2;

interface Pt2 {
  x: number;
  y: number;
  cls: 0 | 1;
}

function sampleRings(): Pt2[] {
  const pts: Pt2[] = [];
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * INNER_R;
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), cls: 0 });
  }
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = OUTER_R0 + Math.random() * (OUTER_R1 - OUTER_R0);
    pts.push({ x: r * Math.cos(a), y: r * Math.sin(a), cls: 1 });
  }
  return pts;
}

export function SVM3D() {
  const [points, setPoints] = useState<Pt2[]>(sampleRings);
  const [lift, setLift] = useState(0);
  const [target, setTarget] = useState<number | null>(null);

  // tween the lift toward the target when the button drives it
  useEffect(() => {
    if (target === null) return;
    if (prefersReducedMotion()) {
      setLift(target);
      setTarget(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      setLift((cur) => {
        const next = cur + (target - cur) * 0.09;
        if (Math.abs(next - target) < 0.005) {
          setTarget(null);
          return target;
        }
        raf = requestAnimationFrame(tick);
        return next;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const zOf = (p: Pt2) => lift * (p.x * p.x + p.y * p.y) * Z_SCALE;
  const planeZ = lift * THRESH * Z_SCALE;
  const margin = lift * Z_SCALE * (OUTER_R0 * OUTER_R0 - INNER_R * INNER_R);
  const lifted = lift > 0.04;

  const decisionR = Math.sqrt(THRESH);
  const circlePts = useMemo(() => {
    const pts: Vec3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push({ x: decisionR * Math.cos(a), y: decisionR * Math.sin(a), z: 0.01 });
    }
    return pts;
  }, [decisionR]);

  const draw = (ctx: CanvasRenderingContext2D, view: View) => {
    const prims: Prim[] = [...floorGrid(view, 3, 1)];

    if (lifted) {
      // separating plane z = planeZ
      const H = 3;
      prims.push(
        quadPrim(
          view,
          [
            { x: -H, y: -H, z: planeZ },
            { x: H, y: -H, z: planeZ },
            { x: H, y: H, z: planeZ },
            { x: -H, y: H, z: planeZ },
          ],
          "#0d9488",
          "#0f766e",
          0.16
        )
      );
      // its shadow on the floor: the decision boundary the 2D view would show
      prims.push(linePrim(view, circlePts, "#0f766e", 1.8, 0.85, 8));
    }

    for (const p of points) {
      prims.push(ballPrim(view, { x: p.x, y: p.y, z: zOf(p) }, 5, CLASS_COLORS[p.cls], -0.3));
    }

    paintSorted(ctx, prims);
  };

  return (
    <Viz3DSection
      title="The kernel trick"
      lead="No straight line separates a ring from its center. Lift every point with φ(x) = ‖x‖² and a flat plane does it instantly. That lift is what a kernel buys you."
    >
      <div className="viz-row">
        <Canvas3D
          draw={draw}
          redrawKey={[points, lift]}
          ariaLabel="Ring-shaped 2D data lifted into 3D by the kernel map, separated by a flat plane"
          dist={10.5}
          pitch={0.45}
          zShift={-0.9}
        />
        <div className="viz-side">
          <div className="stat-grid">
            <Stat label="separable in 2D" value="no" />
            <Stat label="separable lifted" value={lifted ? "yes, by a plane" : "lift it"} />
          </div>
          <Slider
            label="lift φ(x)"
            value={lift}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => {
              setTarget(null);
              setLift(v);
            }}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setTarget(lift > 0.5 ? 0 : 1)}>
              {lift > 0.5 ? "Flatten back to 2D" : "Lift into 3D"}
            </button>
            <button
              className="btn"
              onClick={() => {
                setPoints(sampleRings());
              }}
            >
              New sample data
            </button>
          </div>
          <Stat label="vertical margin" value={margin.toFixed(2)} />
          <div className="callout">
            The teal circle on the floor is where the plane slices the bowl: seen from above, the
            planar boundary becomes the circular boundary the 2D problem needed all along.
          </div>
        </div>
      </div>
    </Viz3DSection>
  );
}
