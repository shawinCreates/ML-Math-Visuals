import { useEffect, useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { TreeNode, buildTree, predictTree } from "../lib/tree";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });
const MAX_TREES = 60;

function samplePoints(): LabeledPoint[] {
  const pts: LabeledPoint[] = [];
  // two interleaving arcs make a boundary single trees butcher
  for (let i = 0; i < 16; i++) {
    const t = Math.PI * (i / 15);
    pts.push({
      x: clamp(5 + 2.8 * Math.cos(t) + randn() * 0.4, 0.2, 9.8),
      y: clamp(6.2 + 2.4 * Math.sin(t) + randn() * 0.4, 0.2, 9.8),
      label: 0,
    });
    pts.push({
      x: clamp(5 + 2.8 * Math.cos(-t) + randn() * 0.4, 0.2, 9.8),
      y: clamp(3.8 + 2.4 * Math.sin(-t) + randn() * 0.4, 0.2, 9.8),
      label: 1,
    });
  }
  return pts;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

const C0 = hexToRgb(CLASS_COLORS[0]);
const C1 = hexToRgb(CLASS_COLORS[1]);

export function RandomForest() {
  const [points, setPoints] = useState<LabeledPoint[]>(samplePoints);
  const [activeClass, setActiveClass] = useState(0);
  const [nTrees, setNTrees] = useState(20);
  const [maxDepth, setMaxDepth] = useState(5);
  const [featureBag, setFeatureBag] = useState(true);
  const [seedTick, setSeedTick] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y, label: activeClass }));

  const forest = useMemo<TreeNode[]>(() => {
    void seedTick;
    const n = points.length;
    if (n < 2) return [];
    const trees: TreeNode[] = [];
    for (let t = 0; t < MAX_TREES; t++) {
      const sample = Array.from({ length: n }, () => points[Math.floor(Math.random() * n)]);
      trees.push(
        buildTree(sample, {
          maxDepth,
          minSamplesLeaf: 1,
          nClasses: 2,
          criterion: "gini",
          rect: { x0: 0, y0: 0, x1: 10, y1: 10 },
          pickFeatures: featureBag ? () => [Math.random() < 0.5 ? 0 : 1] : undefined,
        }),
      );
    }
    return trees;
  }, [points, maxDepth, featureBag, seedTick]);

  const active = forest.slice(0, nTrees);

  // probability shading: fraction of trees voting class 1
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, scale.width, scale.height);
    if (active.length === 0) return;
    const cell = 5;
    for (let px = scale.innerLeft; px < scale.innerRight; px += cell) {
      for (let py = scale.innerTop; py < scale.innerBottom; py += cell) {
        const x = scale.dx(px + cell / 2);
        const y = scale.dy(py + cell / 2);
        let votes1 = 0;
        for (const tree of active) votes1 += predictTree(tree, x, y);
        const p = votes1 / active.length;
        const r = Math.round(C0[0] + (C1[0] - C0[0]) * p);
        const g = Math.round(C0[1] + (C1[1] - C0[1]) * p);
        const b = Math.round(C0[2] + (C1[2] - C0[2]) * p);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.25 + 0.3 * Math.abs(p - 0.5) * 2})`;
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }, [active]);

  const accuracy = useMemo(() => {
    if (active.length === 0 || points.length === 0) return 0;
    let ok = 0;
    for (const p of points) {
      let votes1 = 0;
      for (const tree of active) votes1 += predictTree(tree, p.x, p.y);
      if ((votes1 / active.length >= 0.5 ? 1 : 0) === p.label) ok++;
    }
    return ok / points.length;
  }, [active, points]);

  return (
    <div>
      <Hint>
        Slide the tree count from 1 upward: one tree draws jagged, overconfident boxes; sixty of
        them voting produce a smooth probability gradient. The shading is the fraction of trees
        voting each way.
      </Hint>

      <div className="viz-row">
        <div className="viz-stack">
          <canvas ref={canvasRef} width={scale.width} height={scale.height} className="viz-canvas" />
          <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg viz-svg-overlay" {...handlers}>
            <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
            {points.map((p, i) => (
              <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} fill={CLASS_COLORS[p.label]} stroke="#fff" strokeWidth={1.5} />
            ))}
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

          <Slider label="trees in vote" value={nTrees} min={1} max={MAX_TREES} step={1} onChange={setNTrees} />
          <Slider label="max depth" value={maxDepth} min={1} max={8} step={1} onChange={setMaxDepth} />

          <div className="stat-grid">
            <Stat label="trees" value={nTrees} />
            <Stat label="training accuracy" value={`${formatNum(accuracy * 100, 0)}%`} />
          </div>

          <label className="checkbox">
            <input type="checkbox" checked={featureBag} onChange={(e) => setFeatureBag(e.target.checked)} />
            Random feature per split (decorrelates trees)
          </label>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => setSeedTick((t) => t + 1)}>Regrow forest</button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>
        </div>
      </div>

      <Explain title="1 · Deep trees: accurate alone, erratic together... unless">
        <p>
          A single deep tree (slider at 1) reaches ~100% training accuracy by carving boxes around
          every point — including noise. Press <strong>Regrow forest</strong> a few times with 1
          tree showing: the boundary jumps around wildly between regrowths. That instability is
          variance, and from the ensembles module we know the cure: train many and vote.
        </p>
        <Formula block tex="\hat{y}(\mathbf{x}) = \mathrm{majority}\big(T_1(\mathbf{x}), \dots, T_m(\mathbf{x})\big)" />
      </Explain>

      <Explain title="2 · Two sources of randomness">
        <p>
          Bagging alone isn't enough — trees grown on overlapping data still make correlated
          mistakes, and correlated errors survive averaging (the <Formula tex="\rho\sigma^2" />{" "}
          term). Random forests add a second randomizer: at <em>each split</em>, the tree may only
          consider a random subset of features (here, one of the two). Toggle that checkbox off and
          regrow: the trees agree more, and the boundary gets blockier and more overconfident.
          Decorrelation, not just averaging, is the forest's real trick.
        </p>
      </Explain>

      <Explain title="3 · Votes become probabilities">
        <p>
          The shading shows the vote fraction: deep saturated regions mean near-unanimous trees,
          pale regions mean genuine disagreement — a free confidence estimate that a single tree
          can't give. Notice the smooth gradient along the boundary between the two arcs even
          though every individual tree is a hard step function: smoothness emerging from voting is
          the entire aesthetic of ensemble methods. Try depth 2 — many shallow trees still combine
          into a curved boundary.
        </p>
      </Explain>
    </div>
  );
}
