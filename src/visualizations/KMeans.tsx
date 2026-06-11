import { useMemo, useRef, useState } from "react";
import { Point, clamp, dist, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { useTicker } from "../components/useTicker";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

function samplePoints(): Point[] {
  const centers = [
    { x: 2.5, y: 7.2 },
    { x: 7.5, y: 7 },
    { x: 5, y: 2.6 },
  ];
  const pts: Point[] = [];
  for (const c of centers) {
    for (let i = 0; i < 12; i++) {
      pts.push({ x: clamp(c.x + randn() * 0.9, 0.2, 9.8), y: clamp(c.y + randn() * 0.9, 0.2, 9.8) });
    }
  }
  return pts;
}

type Phase = "assign" | "update";

export function KMeans() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [k, setK] = useState(3);
  const [centroids, setCentroids] = useState<Point[]>([]);
  const [assignments, setAssignments] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("assign");
  const [iteration, setIteration] = useState(0);
  const [inertiaHistory, setInertiaHistory] = useState<number[]>([]);
  const [showLines, setShowLines] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, (pts) => {
    setPoints(pts);
    setAssignments([]); // stale once data changes
    setPhase("assign");
  }, (x, y) => ({ x, y }));

  const inertia = useMemo(() => {
    if (centroids.length === 0 || assignments.length !== points.length) return null;
    let sum = 0;
    points.forEach((p, i) => {
      const c = centroids[assignments[i]];
      if (c) sum += dist(p, c) ** 2;
    });
    return sum;
  }, [points, centroids, assignments]);

  function initCentroids() {
    // Forgy init: pick k random data points as starting centroids.
    const pool = [...points];
    const chosen: Point[] = [];
    for (let i = 0; i < k && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push({ ...pool[idx] });
      pool.splice(idx, 1);
    }
    while (chosen.length < k) {
      chosen.push({ x: 1 + Math.random() * 8, y: 1 + Math.random() * 8 });
    }
    setCentroids(chosen);
    setAssignments([]);
    setPhase("assign");
    setIteration(0);
    setInertiaHistory([]);
  }

  /** Runs one half-step. Returns false when converged. */
  function step(): boolean {
    if (centroids.length === 0 || points.length === 0) return false;
    if (phase === "assign") {
      const next = points.map((p) => {
        let best = 0;
        let bestD = Infinity;
        centroids.forEach((c, j) => {
          const d = dist(p, c);
          if (d < bestD) {
            bestD = d;
            best = j;
          }
        });
        return best;
      });
      const unchanged =
        assignments.length === next.length && next.every((v, i) => v === assignments[i]);
      setAssignments(next);
      setPhase("update");
      let sum = 0;
      points.forEach((p, i) => (sum += dist(p, centroids[next[i]]) ** 2));
      setInertiaHistory((h) => [...h, sum]);
      return !unchanged;
    }
    // update phase: move each centroid to the mean of its assigned points
    const next = centroids.map((c, j) => {
      const mine = points.filter((_, i) => assignments[i] === j);
      if (mine.length === 0) return c; // empty cluster keeps its position
      return {
        x: mine.reduce((s, p) => s + p.x, 0) / mine.length,
        y: mine.reduce((s, p) => s + p.y, 0) / mine.length,
      };
    });
    setCentroids(next);
    setPhase("assign");
    setIteration((i) => i + 1);
    return true;
  }

  const ticker = useTicker(() => step());

  const ready = centroids.length > 0;

  return (
    <div>
      <Hint>
        Click to add points (drag / Alt-click to edit), choose k, then <strong>Initialize</strong>{" "}
        and step through the algorithm — it alternates between two simple moves.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {showLines &&
            ready &&
            assignments.length === points.length &&
            points.map((p, i) => {
              const c = centroids[assignments[i]];
              if (!c) return null;
              return (
                <line
                  key={"l" + i}
                  x1={scale.sx(p.x)}
                  y1={scale.sy(p.y)}
                  x2={scale.sx(c.x)}
                  y2={scale.sy(c.y)}
                  stroke={CLASS_COLORS[assignments[i] % CLASS_COLORS.length]}
                  strokeWidth={1}
                  opacity={0.35}
                />
              );
            })}
          {points.map((p, i) => {
            const a = assignments.length === points.length ? assignments[i] : -1;
            return (
              <circle
                key={i}
                cx={scale.sx(p.x)}
                cy={scale.sy(p.y)}
                r={6}
                fill={a >= 0 ? CLASS_COLORS[a % CLASS_COLORS.length] : "var(--muted)"}
                stroke="#fff"
                strokeWidth={1.5}
              />
            );
          })}
          {centroids.map((c, j) => (
            <g key={"c" + j} transform={`translate(${scale.sx(c.x)} ${scale.sy(c.y)})`}>
              <circle r={11} fill={CLASS_COLORS[j % CLASS_COLORS.length]} opacity={0.25} />
              <path d="M-7 -7 L7 7 M-7 7 L7 -7" stroke={CLASS_COLORS[j % CLASS_COLORS.length]} strokeWidth={3.5} />
            </g>
          ))}
        </svg>

        <div className="viz-side">
          <Slider
            label="clusters k"
            value={k}
            min={2}
            max={6}
            step={1}
            onChange={(v) => { ticker.setRunning(false); setK(v); setCentroids([]); setAssignments([]); }}
          />

          <div className="stat-grid">
            <Stat label="iteration" value={iteration} />
            <Stat label="next move" value={ready ? (phase === "assign" ? "assign points" : "move centroids") : "—"} />
            <Stat label={<>inertia <Formula tex="J" /></>} value={inertia === null ? "—" : formatNum(inertia, 1)} />
            <Stat label="points" value={points.length} />
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={initCentroids}>
              {ready ? "Re-initialize centroids" : "Initialize centroids"}
            </button>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={!ready} onClick={step}>
              Step ({phase === "assign" ? "assign" : "update"})
            </button>
            <button className="btn" disabled={!ready} onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Run to convergence"}
            </button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setPoints(samplePoints()); setCentroids([]); setAssignments([]); setInertiaHistory([]); }}>
              New sample data
            </button>
            <button className="btn btn-ghost" onClick={() => { setPoints([]); setCentroids([]); setAssignments([]); setInertiaHistory([]); }}>
              Clear points
            </button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={showLines} onChange={(e) => setShowLines(e.target.checked)} />
            Show point → centroid links
          </label>

          <LossChart history={inertiaHistory} label="Inertia" />
        </div>
      </div>

      <Explain title="1 · One objective, two alternating moves">
        <p>
          K-means tries to place <Formula tex="k" /> centroids <Formula tex="\mu_1 \dots \mu_k" />{" "}
          so that points sit close to their assigned centroid. The quantity it minimizes is the{" "}
          <em>inertia</em> (within-cluster sum of squares):
        </p>
        <Formula block tex="J = \sum_{i=1}^{n} \big\lVert \mathbf{x}_i - \mu_{c(i)} \big\rVert^2" />
        <p>
          It cannot minimize over assignments and positions at once, so it alternates:{" "}
          <strong>Assign</strong> — give each point to its nearest centroid (
          <Formula tex="c(i) = \arg\min_j \lVert \mathbf{x}_i - \mu_j \rVert" />); <strong>Update</strong>{" "}
          — move each centroid to the mean of its points (
          <Formula tex="\mu_j = \tfrac{1}{|C_j|}\sum_{i \in C_j} \mathbf{x}_i" />). Use{" "}
          <strong>Step</strong> to watch each half-move separately: colors change on assign, the ×
          markers slide on update.
        </p>
      </Explain>

      <Explain title="2 · Why it always settles down">
        <p>
          Each move can only lower <Formula tex="J" />: assigning a point to a <em>nearer</em>{" "}
          centroid lowers its squared distance, and the mean is mathematically the point that
          minimizes the sum of squared distances to a set. Watch the inertia chart — it never goes
          up, and the algorithm stops when an assign step changes nothing.
        </p>
      </Explain>

      <Explain title="3 · Settles down ≠ settles right">
        <p>
          Convergence is only to a <em>local</em> minimum, and the destination depends on the random
          start. Hit <strong>Re-initialize</strong> several times on the same data: sometimes two
          centroids split one blob while another blob is shared — a worse final inertia. Real
          implementations run many restarts (or k-means++ seeding) and keep the best. Also try a
          wrong <Formula tex="k" />: the algorithm happily converges anyway, because it answers
          “where do k centers go?”, never “how many clusters are there?”.
        </p>
      </Explain>
    </div>
  );
}
