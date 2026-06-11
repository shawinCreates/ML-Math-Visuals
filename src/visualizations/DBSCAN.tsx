import { useMemo, useRef, useState } from "react";
import { Point, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): Point[] {
  const pts: Point[] = [];
  // two interleaved crescents
  for (let i = 0; i < 22; i++) {
    const t = Math.PI * (i / 21);
    pts.push({
      x: clamp(5 + 2.6 * Math.cos(t) + randn() * 0.25, 0.2, 9.8),
      y: clamp(6 + 2.2 * Math.sin(t) + randn() * 0.25, 0.2, 9.8),
    });
  }
  for (let i = 0; i < 22; i++) {
    const t = Math.PI * (i / 21);
    pts.push({
      x: clamp(5 + 2.6 * Math.cos(-t) + randn() * 0.25, 0.2, 9.8),
      y: clamp(4 + 2.2 * Math.sin(-t) + randn() * 0.25, 0.2, 9.8),
    });
  }
  // sprinkle noise
  for (let i = 0; i < 5; i++) {
    pts.push({ x: 0.5 + Math.random() * 9, y: 0.5 + Math.random() * 9 });
  }
  return pts;
}

type PointKind = "core" | "border" | "noise";

interface DbscanResult {
  labels: number[]; // cluster id, -1 = noise
  kinds: PointKind[];
  nClusters: number;
}

function dbscan(pts: Point[], eps: number, minPts: number): DbscanResult {
  const n = pts.length;
  const neighbors: number[][] = pts.map((p, i) =>
    pts.map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) })).filter((e) => e.d <= eps && e.j !== i).map((e) => e.j),
  );
  const isCore = neighbors.map((nb) => nb.length + 1 >= minPts); // count the point itself
  const labels = new Array(n).fill(-1);
  let cluster = 0;
  for (let i = 0; i < n; i++) {
    if (!isCore[i] || labels[i] !== -1) continue;
    // BFS flood-fill from this unvisited core point
    labels[i] = cluster;
    const queue = [i];
    while (queue.length > 0) {
      const cur = queue.pop()!;
      for (const nb of neighbors[cur]) {
        if (labels[nb] === -1) {
          labels[nb] = cluster;
          if (isCore[nb]) queue.push(nb); // only cores keep expanding
        }
      }
    }
    cluster++;
  }
  const kinds: PointKind[] = pts.map((_, i) => (isCore[i] ? "core" : labels[i] >= 0 ? "border" : "noise"));
  return { labels, kinds, nClusters: cluster };
}

export function DBSCAN() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [eps, setEps] = useState(0.9);
  const [minPts, setMinPts] = useState(4);
  const [showCircles, setShowCircles] = useState(false);
  const [hover, setHover] = useState<number>(-1);
  const svgRef = useRef<SVGSVGElement>(null);
  const { dragging, handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y }));

  const result = useMemo(() => dbscan(points, eps, minPts), [points, eps, minPts]);

  const noiseCount = result.kinds.filter((k) => k === "noise").length;
  const coreCount = result.kinds.filter((k) => k === "core").length;

  const epsPx = (eps / 10) * (scale.innerRight - scale.innerLeft);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    handlers.onPointerMove(e);
    if (dragging) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * scale.width;
    const py = ((e.clientY - rect.top) / rect.height) * scale.height;
    let best = -1;
    let bestD = 16;
    points.forEach((p, i) => {
      const d = Math.hypot(scale.sx(p.x) - px, scale.sy(p.y) - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };

  const hoverNeighbors = useMemo(() => {
    if (hover < 0 || hover >= points.length) return 0;
    const p = points[hover];
    return points.filter((q) => Math.hypot(p.x - q.x, p.y - q.y) <= eps).length; // includes itself
  }, [hover, points, eps]);

  const color = (i: number) =>
    result.labels[i] >= 0 ? CLASS_COLORS[result.labels[i] % CLASS_COLORS.length] : "var(--muted)";

  return (
    <div>
      <Hint>
        No k anywhere: density decides everything. Hover a point to see its ε-neighborhood; tune ε
        and minPts and watch clusters form, merge, and dissolve into noise.
      </Hint>

      <div className="viz-row">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          className="viz-svg"
          {...handlers}
          onPointerMove={onMove}
          onPointerLeave={() => { handlers.onPointerLeave(); setHover(-1); }}
        >
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {showCircles &&
            points.map((p, i) =>
              result.kinds[i] === "core" ? (
                <circle key={"c" + i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={epsPx} fill={color(i)} opacity={0.06} stroke={color(i)} strokeOpacity={0.18} />
              ) : null,
            )}
          {hover >= 0 && hover < points.length && (
            <circle
              cx={scale.sx(points[hover].x)}
              cy={scale.sy(points[hover].y)}
              r={epsPx}
              fill="var(--accent)"
              opacity={0.1}
              stroke="var(--accent)"
              strokeDasharray="5 4"
            />
          )}
          {points.map((p, i) => {
            const kind = result.kinds[i];
            if (kind === "noise") {
              return (
                <g key={i} transform={`translate(${scale.sx(p.x)} ${scale.sy(p.y)})`}>
                  <path d="M-5 -5 L5 5 M-5 5 L5 -5" stroke="var(--muted)" strokeWidth={2.5} />
                </g>
              );
            }
            return (
              <circle
                key={i}
                cx={scale.sx(p.x)}
                cy={scale.sy(p.y)}
                r={kind === "core" ? 6.5 : 5}
                fill={kind === "core" ? color(i) : "#fff"}
                stroke={color(i)}
                strokeWidth={kind === "core" ? 1.5 : 2.5}
              />
            );
          })}
        </svg>

        <div className="viz-side">
          <Slider label="radius ε" value={eps} min={0.2} max={2.5} step={0.05} onChange={setEps} format={(v) => formatNum(v)} />
          <Slider label="minPts" value={minPts} min={2} max={8} step={1} onChange={setMinPts} />

          <div className="stat-grid">
            <Stat label="clusters found" value={result.nClusters} />
            <Stat label="noise points" value={noiseCount} />
            <Stat label="core points" value={coreCount} />
            <Stat label="points" value={points.length} />
          </div>

          {hover >= 0 && hover < points.length && (
            <div className="callout">
              Hovered point: <strong>{hoverNeighbors}</strong> point{hoverNeighbors === 1 ? "" : "s"} within ε
              (needs ≥ {minPts}) → <strong>{result.kinds[hover]}</strong>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setPoints(samplePoints())}>New sample data (crescents)</button>
            <button className="btn btn-ghost" onClick={() => setPoints([])}>Clear points</button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showCircles} onChange={(e) => setShowCircles(e.target.checked)} />
            Show ε-disc of every core point
          </label>

          <div className="callout">
            Legend: <strong>filled</strong> = core, <strong>hollow</strong> = border,{" "}
            <strong>×</strong> = noise.
          </div>
        </div>
      </div>

      <Explain title="1 · Density, made precise">
        <p>
          DBSCAN's entire vocabulary comes from one neighborhood definition:{" "}
          <Formula tex="N_\varepsilon(p) = \{\, q : d(p,q) \le \varepsilon \,\}" />. A point is a{" "}
          <strong>core point</strong> if its neighborhood holds at least minPts points (itself
          included): <Formula tex="|N_\varepsilon(p)| \ge \text{minPts}" />. Hover any point — the
          dashed circle is its neighborhood and the panel shows the live count. Points inside a core
          point's disc but not dense themselves are <strong>border points</strong>; everything else
          is <strong>noise</strong>, deliberately left unclustered.
        </p>
      </Explain>

      <Explain title="2 · Clusters are chains of overlapping discs">
        <p>
          A cluster is everything reachable from a core point by hopping core-to-core through
          overlapping ε-discs (turn on “show ε-discs” to see the chains). That's why DBSCAN traces
          the two crescents perfectly — a shape k-means can never produce, since k-means partitions
          space by straight-line distance to centroids. The expansion only flows{" "}
          <em>through</em> core points: borders join a cluster but never extend it, which keeps
          thin bridges of sparse points from gluing clusters together.
        </p>
      </Explain>

      <Explain title="3 · ε and minPts are a density threshold in disguise">
        <p>
          Together the two parameters define the minimum density{" "}
          <Formula tex="\text{minPts} / (\pi \varepsilon^2)" /> a region must have to count as
          cluster material. Sweep ε slowly upward: isolated × marks join clusters, then at some
          point the crescents fuse into one blob — the density threshold dropped below the gap's
          density. Sweep it down and clusters crumble into noise. There's no “right” answer baked
          in; you are choosing what density counts as “dense”. Notice what you never chose: the
          number of clusters.
        </p>
      </Explain>
    </div>
  );
}
