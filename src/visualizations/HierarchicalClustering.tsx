import { useMemo, useRef, useState } from "react";
import { Point, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

type Linkage = "single" | "complete" | "average";

function samplePoints(): Point[] {
  const blobs = [
    { x: 2.4, y: 7.4, n: 8 },
    { x: 7.6, y: 7.2, n: 8 },
    { x: 5, y: 2.6, n: 8 },
  ];
  const pts: Point[] = [];
  for (const b of blobs) {
    for (let i = 0; i < b.n; i++) {
      pts.push({ x: clamp(b.x + randn() * 0.8, 0.2, 9.8), y: clamp(b.y + randn() * 0.8, 0.2, 9.8) });
    }
  }
  return pts;
}

interface DNode {
  height: number;
  members: number[]; // point indices
  left?: DNode;
  right?: DNode;
}

function clusterDist(a: DNode, b: DNode, pts: Point[], linkage: Linkage): number {
  let min = Infinity;
  let max = 0;
  let sum = 0;
  for (const i of a.members) {
    for (const j of b.members) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      min = Math.min(min, d);
      max = Math.max(max, d);
      sum += d;
    }
  }
  if (linkage === "single") return min;
  if (linkage === "complete") return max;
  return sum / (a.members.length * b.members.length);
}

/** Naive agglomerative clustering; returns the merge sequence (internal nodes in order). */
function agglomerate(pts: Point[], linkage: Linkage): { merges: DNode[]; root: DNode | null } {
  let active: DNode[] = pts.map((_, i) => ({ height: 0, members: [i] }));
  const merges: DNode[] = [];
  while (active.length > 1) {
    let bi = 0;
    let bj = 1;
    let bd = Infinity;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const d = clusterDist(active[i], active[j], pts, linkage);
        if (d < bd) {
          bd = d;
          bi = i;
          bj = j;
        }
      }
    }
    const merged: DNode = {
      height: bd,
      members: [...active[bi].members, ...active[bj].members],
      left: active[bi],
      right: active[bj],
    };
    active = active.filter((_, idx) => idx !== bi && idx !== bj);
    active.push(merged);
    merges.push(merged);
  }
  return { merges, root: active[0] ?? null };
}

/** Cluster assignment when only the first `m` merges have happened. */
function assignmentsAfter(n: number, merges: DNode[], m: number): number[] {
  // A merge node from the first m merges survives unless a later one of those m consumed it.
  const consumed = new Set<DNode>();
  for (let i = 0; i < m; i++) {
    consumed.add(merges[i].left!);
    consumed.add(merges[i].right!);
  }
  const stillActive = merges.slice(0, m).filter((nd) => !consumed.has(nd));
  const result = new Array(n).fill(-1);
  let cluster = 0;
  for (const nd of stillActive) {
    for (const p of nd.members) result[p] = cluster;
    cluster++;
  }
  // points untouched by the first m merges are still singleton clusters
  for (let i = 0; i < n; i++) {
    if (result[i] === -1) result[i] = cluster++;
  }
  return result;
}

export function HierarchicalClustering() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [linkage, setLinkage] = useState<Linkage>("average");
  const [k, setK] = useState(3);
  const svgRef = useRef<SVGSVGElement>(null);
  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y }));

  const { merges, root } = useMemo(() => agglomerate(points, linkage), [points, linkage]);

  const n = points.length;
  const kClamped = Math.max(1, Math.min(k, n || 1));
  const mergeCount = Math.max(0, n - kClamped);
  const assignments = useMemo(() => assignmentsAfter(n, merges, mergeCount), [n, merges, mergeCount]);

  const cutHeight = useMemo(() => {
    if (mergeCount === 0) return 0;
    const lo = merges[mergeCount - 1]?.height ?? 0;
    const hi = merges[mergeCount]?.height ?? lo * 1.15 + 0.3;
    return (lo + hi) / 2;
  }, [merges, mergeCount]);

  // ---- dendrogram layout ----
  const dendro = useMemo(() => {
    if (!root || n < 2) return null;
    const w = 820;
    const h = 280;
    const padX = 36;
    const padTop = 16;
    const padBot = 26;
    const maxH = Math.max(...merges.map((m) => m.height), 1e-9);
    let leafIdx = 0;
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const leafXs: { x: number; point: number }[] = [];
    const yOf = (height: number) => padTop + (1 - height / maxH) * (h - padTop - padBot);
    function walk(node: DNode): { x: number } {
      if (!node.left || !node.right) {
        const x = padX + (leafIdx / Math.max(1, n - 1)) * (w - 2 * padX);
        leafXs.push({ x, point: node.members[0] });
        leafIdx++;
        return { x };
      }
      const l = walk(node.left);
      const r = walk(node.right);
      const y = yOf(node.height);
      lines.push({ x1: l.x, y1: yOf(node.left.height), x2: l.x, y2: y });
      lines.push({ x1: r.x, y1: yOf(node.right.height), x2: r.x, y2: y });
      lines.push({ x1: l.x, y1: y, x2: r.x, y2: y });
      return { x: (l.x + r.x) / 2 };
    }
    walk(root);
    return { w, h, lines, leafXs, yCut: yOf(cutHeight), maxH, yOf, padX };
  }, [root, merges, n, cutHeight]);

  return (
    <div>
      <Hint>
        The dendrogram below records every merge; the dashed line is your cut. Slide the cluster
        count or switch linkage and watch both views change together. Click / drag / Alt-click to
        edit points.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {points.map((p, i) => (
            <circle
              key={i}
              cx={scale.sx(p.x)}
              cy={scale.sy(p.y)}
              r={6}
              fill={CLASS_COLORS[assignments[i] % CLASS_COLORS.length]}
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        <div className="viz-side">
          <div className="btn-row">
            {(["single", "complete", "average"] as Linkage[]).map((l) => (
              <button key={l} className={"btn" + (linkage === l ? " btn-primary" : "")} onClick={() => setLinkage(l)}>
                {l}
              </button>
            ))}
          </div>

          <Slider label="clusters (cut)" value={kClamped} min={1} max={Math.max(1, Math.min(8, n))} step={1} onChange={setK} />

          <div className="stat-grid">
            <Stat label="points" value={n} />
            <Stat label="merges done" value={`${mergeCount} / ${Math.max(0, n - 1)}`} />
            <Stat label="cut height" value={formatNum(cutHeight, 2)} />
            <Stat label="last merge dist" value={mergeCount > 0 ? formatNum(merges[mergeCount - 1].height, 2) : "—"} />
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>

          <div className="callout">
            Try <strong>single</strong> linkage, then drag a few points into a “bridge” between two
            blobs — watch the chaining effect merge them early.
          </div>
        </div>
      </div>

      {dendro && (
        <div className="explain" style={{ maxWidth: "100%" }}>
          <h3>Dendrogram — the full merge history</h3>
          <svg viewBox={`0 0 ${dendro.w} ${dendro.h}`} style={{ width: "100%", height: "auto" }}>
            {dendro.lines.map((l, i) => (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--border-strong)" strokeWidth={1.5} />
            ))}
            <line
              x1={dendro.padX - 14}
              y1={dendro.yCut}
              x2={dendro.w - dendro.padX + 14}
              y2={dendro.yCut}
              stroke="var(--danger)"
              strokeWidth={2}
              strokeDasharray="7 5"
            />
            <text x={dendro.w - dendro.padX + 4} y={dendro.yCut - 6} className="tick-label" fill="var(--danger)" textAnchor="end">
              cut → {kClamped} clusters
            </text>
            {dendro.leafXs.map((leaf, i) => (
              <circle
                key={i}
                cx={leaf.x}
                cy={dendro.h - 16}
                r={4.5}
                fill={CLASS_COLORS[assignments[leaf.point] % CLASS_COLORS.length]}
                stroke="#fff"
              />
            ))}
          </svg>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            Height = distance at which two clusters merged. Long vertical gaps mean “these groups
            really didn't want to merge” — natural places to cut.
          </p>
        </div>
      )}

      <Explain title="1 · Bottom-up: every point starts alone">
        <p>
          Agglomerative clustering begins with <Formula tex="n" /> singleton clusters and repeats
          one move: <em>merge the two closest clusters</em>. After <Formula tex="n - 1" /> merges
          everything is one cluster. Crucially, nothing is ever un-merged — the slider doesn't
          re-run anything, it just chooses how far down the recorded history to cut.
        </p>
      </Explain>

      <Explain title="2 · “Closest” is a choice: linkage">
        <p>Clusters contain many points, so cluster distance needs a definition:</p>
        <Formula block tex="d_{\text{single}}(A,B) = \min_{a \in A, b \in B} d(a,b) \qquad d_{\text{complete}}(A,B) = \max_{a \in A, b \in B} d(a,b)" />
        <Formula block tex="d_{\text{average}}(A,B) = \frac{1}{|A||B|}\sum_{a \in A}\sum_{b \in B} d(a,b)" />
        <p>
          Single linkage only needs <em>one</em> close pair, so clusters can chain through bridges
          of points (great for elongated shapes, terrible with noise). Complete linkage requires{" "}
          <em>all</em> pairs to be close, producing compact round clusters. Average sits between.
          Switch linkage on the same data and compare the dendrograms — the merge order itself
          changes.
        </p>
      </Explain>

      <Explain title="3 · Reading a dendrogram">
        <p>
          The height of each ∏-shaped bridge is the distance at which that merge happened. Well
          separated blobs show as long vertical stems: many cheap merges inside each blob, then an
          expensive merge to join blobs. Cutting in the middle of a long stem gives a stable
          clustering — move the cut slightly and nothing changes. Unlike k-means you never had to
          pick k before running, and you get every k at once from one history.
        </p>
      </Explain>
    </div>
  );
}
