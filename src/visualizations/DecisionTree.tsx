import { useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, CLASS_COLORS_SOFT, makeScale } from "../lib/plot";
import { Criterion, TreeNode, buildTree, collectLeaves, gainCurve, predictTree, treeDepth } from "../lib/tree";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): LabeledPoint[] {
  const blobs = [
    { x: 2.5, y: 7.5, label: 0 },
    { x: 7.5, y: 7.5, label: 1 },
    { x: 5, y: 2.5, label: 2 },
    { x: 8.5, y: 2.5, label: 0 },
  ];
  const pts: LabeledPoint[] = [];
  for (const b of blobs) {
    for (let i = 0; i < 7; i++) {
      pts.push({
        x: clamp(b.x + randn() * 0.9, 0.2, 9.8),
        y: clamp(b.y + randn() * 0.9, 0.2, 9.8),
        label: b.label,
      });
    }
  }
  return pts;
}

/** Recursive tree diagram layout: leaves get consecutive x slots, parents center over children. */
function layoutTree(root: TreeNode) {
  const nodes: { node: TreeNode; x: number; y: number; parent?: { x: number; y: number } }[] = [];
  let leafIdx = 0;
  function walk(n: TreeNode): number {
    let x: number;
    if (n.left && n.right) {
      const lx = walk(n.left);
      const rx = walk(n.right);
      x = (lx + rx) / 2;
    } else {
      x = leafIdx++;
    }
    nodes.push({ node: n, x, y: n.depth });
    return x;
  }
  walk(root);
  // attach parent positions for edges
  const pos = new Map(nodes.map((e) => [e.node, e]));
  for (const e of nodes) {
    if (e.node.left) {
      pos.get(e.node.left)!.parent = { x: e.x, y: e.y };
      pos.get(e.node.right!)!.parent = { x: e.x, y: e.y };
    }
  }
  return { nodes, leafCount: leafIdx };
}

export function DecisionTree() {
  const [points, setPoints] = useState<LabeledPoint[]>(samplePoints);
  const [activeClass, setActiveClass] = useState(0);
  const [maxDepth, setMaxDepth] = useState(3);
  const [minLeaf, setMinLeaf] = useState(1);
  const [criterion, setCriterion] = useState<Criterion>("gini");
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y, label: activeClass }));

  const tree = useMemo(() => {
    if (points.length === 0) return null;
    return buildTree(points, {
      maxDepth,
      minSamplesLeaf: minLeaf,
      nClasses: 3,
      criterion,
      rect: { x0: 0, y0: 0, x1: 10, y1: 10 },
    });
  }, [points, maxDepth, minLeaf, criterion]);

  const leaves = useMemo(() => (tree ? collectLeaves(tree) : []), [tree]);

  const accuracy = useMemo(() => {
    if (!tree || points.length === 0) return 0;
    return points.filter((p) => predictTree(tree, p.x, p.y) === p.label).length / points.length;
  }, [tree, points]);

  const rootCurves = useMemo(() => {
    if (points.length < 2) return null;
    return {
      f0: gainCurve(points, 0, 3, criterion),
      f1: gainCurve(points, 1, 3, criterion),
    };
  }, [points, criterion]);

  const layout = useMemo(() => (tree ? layoutTree(tree) : null), [tree]);

  // tree diagram geometry
  const diagW = 820;
  const slotW = layout ? Math.min(120, (diagW - 60) / Math.max(1, layout.leafCount - 1 || 1)) : 0;
  const rowH = 78;
  const diagH = tree ? (treeDepth(tree) + 1) * rowH + 30 : 0;
  const diagX = (x: number) =>
    layout && layout.leafCount > 1 ? 40 + x * slotW + (diagW - 80 - (layout.leafCount - 1) * slotW) / 2 : diagW / 2;
  const diagY = (y: number) => 34 + y * rowH;

  const gainChart = useMemo(() => {
    if (!rootCurves) return null;
    const w = 300;
    const h = 150;
    const pad = 28;
    const all = [...rootCurves.f0, ...rootCurves.f1];
    if (all.length === 0) return null;
    const gMax = Math.max(...all.map((d) => d.gain), 1e-9);
    const px = (t: number) => pad + (t / 10) * (w - 2 * pad);
    const py = (g: number) => h - pad - (g / gMax) * (h - 2 * pad);
    const path = (data: { threshold: number; gain: number }[]) =>
      data.map((d, i) => `${i === 0 ? "M" : "L"}${px(d.threshold).toFixed(1)},${py(d.gain).toFixed(1)}`).join("");
    let best = all[0];
    for (const d of all) if (d.gain > best.gain) best = d;
    const bestF = rootCurves.f0.includes(best) ? 0 : 1;
    return { w, h, pad, p0: path(rootCurves.f0), p1: path(rootCurves.f1), best, bestF, px, py };
  }, [rootCurves]);

  return (
    <div>
      <Hint>
        Click to add points of the selected class (drag / Alt-click to edit). The tree regrows
        instantly — watch the rectangles it carves and the gain curves it scanned to pick each split.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          {leaves.map((leaf, i) => (
            <rect
              key={i}
              x={scale.sx(leaf.rect.x0)}
              y={scale.sy(leaf.rect.y1)}
              width={scale.sx(leaf.rect.x1) - scale.sx(leaf.rect.x0)}
              height={scale.sy(leaf.rect.y0) - scale.sy(leaf.rect.y1)}
              fill={CLASS_COLORS_SOFT[leaf.prediction]}
              stroke="var(--border-strong)"
              strokeWidth={1}
            />
          ))}
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {points.map((p, i) => (
            <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={6} fill={CLASS_COLORS[p.label]} stroke="#fff" strokeWidth={1.5} />
          ))}
        </svg>

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

          <Slider label="max depth" value={maxDepth} min={1} max={6} step={1} onChange={setMaxDepth} />
          <Slider label="min samples / leaf" value={minLeaf} min={1} max={8} step={1} onChange={setMinLeaf} />

          <div className="btn-row">
            <button className={"btn" + (criterion === "gini" ? " btn-primary" : "")} onClick={() => setCriterion("gini")}>
              Gini
            </button>
            <button className={"btn" + (criterion === "entropy" ? " btn-primary" : "")} onClick={() => setCriterion("entropy")}>
              Entropy
            </button>
          </div>

          <div className="stat-grid">
            <Stat label="leaves" value={leaves.length} />
            <Stat label="depth used" value={tree ? treeDepth(tree) : 0} />
            <Stat label="training accuracy" value={`${formatNum(accuracy * 100, 0)}%`} />
            <Stat label="root impurity" value={tree ? formatNum(tree.impurity, 3) : "—"} />
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>

          {gainChart && (
            <div className="loss-chart">
              <div className="loss-chart-title">Root split search: gain vs threshold</div>
              <svg viewBox={`0 0 ${gainChart.w} ${gainChart.h}`} className="loss-chart-svg">
                <path d={gainChart.p0} fill="none" stroke={CLASS_COLORS[0]} strokeWidth={2} />
                <path d={gainChart.p1} fill="none" stroke={CLASS_COLORS[1]} strokeWidth={2} />
                <circle cx={gainChart.px(gainChart.best.threshold)} cy={gainChart.py(gainChart.best.gain)} r={5} fill="var(--danger)" />
                <text x={gainChart.w / 2} y={gainChart.h - 6} textAnchor="middle" className="tick-label">
                  threshold (blue: x₁ · orange: x₂ · red dot: chosen split)
                </text>
              </svg>
            </div>
          )}
        </div>
      </div>

      {layout && tree && (
        <div className="explain" style={{ maxWidth: "100%", overflowX: "auto" }}>
          <h3>The tree itself</h3>
          <svg viewBox={`0 0 ${diagW} ${diagH}`} style={{ width: "100%", minWidth: 560, height: "auto" }}>
            {layout.nodes.map((e, i) =>
              e.parent ? (
                <line
                  key={"e" + i}
                  x1={diagX(e.parent.x)}
                  y1={diagY(e.parent.y) + 18}
                  x2={diagX(e.x)}
                  y2={diagY(e.y) - 18}
                  stroke="var(--border-strong)"
                />
              ) : null,
            )}
            {layout.nodes.map((e, i) => {
              const isLeaf = !e.node.left;
              const cx = diagX(e.x);
              const cy = diagY(e.y);
              return (
                <g key={"n" + i}>
                  <rect
                    x={cx - 52}
                    y={cy - 18}
                    width={104}
                    height={36}
                    rx={8}
                    fill={isLeaf ? CLASS_COLORS_SOFT[e.node.prediction] : "var(--panel)"}
                    stroke={isLeaf ? CLASS_COLORS[e.node.prediction] : "var(--border-strong)"}
                  />
                  <text x={cx} y={cy - 3} textAnchor="middle" style={{ fontSize: 11, fontWeight: 600 }}>
                    {isLeaf
                      ? `class ${e.node.prediction} (${e.node.n} pts)`
                      : `${e.node.feature === 0 ? "x₁" : "x₂"} ≤ ${formatNum(e.node.threshold!, 2)}`}
                  </text>
                  <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 10, fill: "var(--muted)" }}>
                    {criterion === "gini" ? "G" : "H"}={formatNum(e.node.impurity, 2)}
                    {!isLeaf && e.node.gain !== undefined ? ` · gain ${formatNum(e.node.gain, 2)}` : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      <Explain title="1 · A tree is twenty-questions with thresholds">
        <p>
          Each internal node asks one yes/no question like <Formula tex="x_1 \le 4.3" />. Following
          the answers leads to a leaf, which predicts the majority class of the training points that
          landed there. Geometrically every question slices the current rectangle in two — the
          colored regions in the plot <em>are</em> the leaves.
        </p>
      </Explain>

      <Explain title="2 · Choosing the question: impurity and gain">
        <p>
          To pick a split, the tree measures how mixed a set of labels is. With class proportions{" "}
          <Formula tex="p_c" />:
        </p>
        <Formula block tex="G = 1 - \sum_c p_c^2 \qquad\text{(Gini)}, \qquad H = -\sum_c p_c \log_2 p_c \qquad\text{(entropy)}" />
        <p>
          A candidate split's <em>gain</em> is the impurity drop it buys, weighting each side by its
          share of points:
        </p>
        <Formula block tex="\mathrm{Gain} = I(S) - \tfrac{|S_L|}{|S|} I(S_L) - \tfrac{|S_R|}{|S|} I(S_R)" />
        <p>
          The small chart on the right shows this search happening at the root: gain evaluated at
          every threshold of <Formula tex="x_1" /> (blue) and <Formula tex="x_2" /> (orange). The
          red dot is the winner — drag points around and watch the optimal question move. Toggle
          Gini ↔ entropy: the curves change shape slightly but usually agree on the winner.
        </p>
      </Explain>

      <Explain title="3 · Depth is the overfitting dial">
        <p>
          Recursion repeats the same greedy search inside each half. At max depth 1 (a “decision
          stump”) the model is one question — usually underfitting. Crank depth to 6 and add a few
          stray points inside another class: the tree grows tiny rectangles to capture each one,
          reaching 100% training accuracy by memorizing noise. Raising <em>min samples per leaf</em>{" "}
          forbids those micro-leaves — a form of pre-pruning. This instability of deep trees is
          exactly what random forests (next topics) exploit and fix.
        </p>
      </Explain>
    </div>
  );
}
