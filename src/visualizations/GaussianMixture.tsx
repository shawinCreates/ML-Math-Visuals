import { useMemo, useRef, useState } from "react";
import { Point, clamp, eigen2x2, formatNum, randn } from "../lib/math";
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
  // two tilted elongated blobs + one round blob
  const pts: Point[] = [];
  for (let i = 0; i < 14; i++) {
    const a = randn() * 1.5;
    const b = randn() * 0.4;
    pts.push({ x: clamp(3 + a * 0.8 - b * 0.6, 0.2, 9.8), y: clamp(7 + a * 0.6 + b * 0.8, 0.2, 9.8) });
  }
  for (let i = 0; i < 14; i++) {
    const a = randn() * 1.5;
    const b = randn() * 0.4;
    pts.push({ x: clamp(7 + a * 0.8 + b * 0.6, 0.2, 9.8), y: clamp(6.5 - a * 0.6 + b * 0.8, 0.2, 9.8) });
  }
  for (let i = 0; i < 12; i++) {
    pts.push({ x: clamp(5 + randn() * 0.7, 0.2, 9.8), y: clamp(2.5 + randn() * 0.7, 0.2, 9.8) });
  }
  return pts;
}

interface Component {
  pi: number;
  mx: number;
  my: number;
  sxx: number;
  sxy: number;
  syy: number;
}

function density(c: Component, x: number, y: number): number {
  const det = c.sxx * c.syy - c.sxy * c.sxy;
  if (det <= 1e-12) return 0;
  const dx = x - c.mx;
  const dy = y - c.my;
  // Σ⁻¹ for 2x2
  const ixx = c.syy / det;
  const ixy = -c.sxy / det;
  const iyy = c.sxx / det;
  const q = dx * (ixx * dx + ixy * dy) + dy * (ixy * dx + iyy * dy);
  return Math.exp(-q / 2) / (2 * Math.PI * Math.sqrt(det));
}

function logLikelihood(points: Point[], comps: Component[]): number {
  let ll = 0;
  for (const p of points) {
    let s = 0;
    for (const c of comps) s += c.pi * density(c, p.x, p.y);
    ll += Math.log(Math.max(s, 1e-300));
  }
  return ll;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function blendColors(weights: number[]): string {
  let r = 0;
  let g = 0;
  let b = 0;
  weights.forEach((w, i) => {
    const [cr, cg, cb] = hexToRgb(CLASS_COLORS[i % CLASS_COLORS.length]);
    r += w * cr;
    g += w * cg;
    b += w * cb;
  });
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function GaussianMixture() {
  const [points, setPoints] = useState<Point[]>(samplePoints);
  const [k, setK] = useState(3);
  const [comps, setComps] = useState<Component[]>([]);
  const [resp, setResp] = useState<number[][]>([]); // resp[i][j] = γ_ij
  const [phase, setPhase] = useState<"E" | "M">("E");
  const [iteration, setIteration] = useState(0);
  const [llHistory, setLlHistory] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, (pts) => {
    setPoints(pts);
    setResp([]);
    setPhase("E");
  }, (x, y) => ({ x, y }));

  function init() {
    const pool = [...points];
    const chosen: Component[] = [];
    for (let j = 0; j < k; j++) {
      const idx = pool.length > 0 ? Math.floor(Math.random() * pool.length) : -1;
      const m = idx >= 0 ? pool.splice(idx, 1)[0] : { x: 2 + Math.random() * 6, y: 2 + Math.random() * 6 };
      chosen.push({ pi: 1 / k, mx: m.x, my: m.y, sxx: 1.2, sxy: 0, syy: 1.2 });
    }
    setComps(chosen);
    setResp([]);
    setPhase("E");
    setIteration(0);
    setLlHistory([]);
  }

  function step(): boolean {
    if (comps.length === 0 || points.length === 0) return false;
    if (phase === "E") {
      const gamma = points.map((p) => {
        const raw = comps.map((c) => c.pi * density(c, p.x, p.y));
        const total = raw.reduce((a, b) => a + b, 0);
        return total > 0 ? raw.map((r) => r / total) : raw.map(() => 1 / comps.length);
      });
      setResp(gamma);
      setPhase("M");
      setLlHistory((h) => [...h, logLikelihood(points, comps)]);
      return true;
    }
    if (resp.length !== points.length) return false;
    const next = comps.map((c, j) => {
      const nj = points.reduce((s, _, i) => s + resp[i][j], 0);
      if (nj < 1e-9) return c;
      const mx = points.reduce((s, p, i) => s + resp[i][j] * p.x, 0) / nj;
      const my = points.reduce((s, p, i) => s + resp[i][j] * p.y, 0) / nj;
      let sxx = 0;
      let sxy = 0;
      let syy = 0;
      points.forEach((p, i) => {
        sxx += resp[i][j] * (p.x - mx) ** 2;
        sxy += resp[i][j] * (p.x - mx) * (p.y - my);
        syy += resp[i][j] * (p.y - my) ** 2;
      });
      // small ridge keeps Σ invertible when a component collapses onto few points
      return { pi: nj / points.length, mx, my, sxx: sxx / nj + 0.02, sxy: sxy / nj, syy: syy / nj + 0.02 };
    });
    setComps(next);
    setPhase("E");
    setIteration((i) => i + 1);
    return true;
  }

  const ticker = useTicker(() => {
    step();
    // stop when log-likelihood has plateaued
    const h = llHistory;
    return !(h.length > 4 && Math.abs(h[h.length - 1] - h[h.length - 2]) < 1e-5);
  });

  const ready = comps.length > 0;
  const hasResp = resp.length === points.length && resp.length > 0;

  const ellipses = useMemo(
    () =>
      comps.map((c) => {
        const eig = eigen2x2(c.sxx, c.sxy, c.syy);
        const angle = (Math.atan2(eig.vectors[0][1], eig.vectors[0][0]) * 180) / Math.PI;
        return { c, angle, r1: Math.sqrt(Math.max(0.001, eig.values[0])), r2: Math.sqrt(Math.max(0.001, eig.values[1])) };
      }),
    [comps],
  );

  const pxPerUnitX = (scale.innerRight - scale.innerLeft) / 10;
  const pxPerUnitY = (scale.innerBottom - scale.innerTop) / 10;

  return (
    <div>
      <Hint>
        K-means with uncertainty: every point belongs to every blob, weighted by responsibility —
        look for blended colors at the boundaries. Step the E and M moves separately to see how EM
        works.
      </Hint>

      <div className="viz-row">
        <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg" {...handlers}>
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {ellipses.map((e, j) =>
            [1, 2].map((s) => (
              <g
                key={j + "-" + s}
                // rotate in data space, then scale (with y-flip) into pixel space
                transform={`translate(${scale.sx(e.c.mx)} ${scale.sy(e.c.my)}) scale(${pxPerUnitX} ${-pxPerUnitY}) rotate(${e.angle})`}
              >
                <ellipse
                  rx={s * e.r1}
                  ry={s * e.r2}
                  vectorEffect="non-scaling-stroke"
                  fill={s === 1 ? CLASS_COLORS[j % CLASS_COLORS.length] : "none"}
                  fillOpacity={0.07}
                  stroke={CLASS_COLORS[j % CLASS_COLORS.length]}
                  strokeWidth={s === 1 ? 2 : 1}
                  strokeDasharray={s === 1 ? undefined : "4 4"}
                />
              </g>
            )),
          )}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={scale.sx(p.x)}
              cy={scale.sy(p.y)}
              r={6}
              fill={hasResp ? blendColors(resp[i]) : "var(--muted)"}
              stroke="#fff"
              strokeWidth={1.5}
            />
          ))}
          {comps.map((c, j) => (
            <g key={"m" + j} transform={`translate(${scale.sx(c.mx)} ${scale.sy(c.my)})`}>
              <path d="M-6 0 H6 M0 -6 V6" stroke={CLASS_COLORS[j % CLASS_COLORS.length]} strokeWidth={3} />
            </g>
          ))}
        </svg>

        <div className="viz-side">
          <Slider
            label="components k"
            value={k}
            min={2}
            max={4}
            step={1}
            onChange={(v) => { ticker.setRunning(false); setK(v); setComps([]); setResp([]); }}
          />

          <div className="stat-grid">
            <Stat label="iteration" value={iteration} />
            <Stat label="next step" value={ready ? (phase === "E" ? "E (responsibilities)" : "M (refit blobs)") : "—"} />
            <Stat label="log-likelihood" value={llHistory.length > 0 ? formatNum(llHistory[llHistory.length - 1], 1) : "—"} />
            <Stat label="mixing weights π" value={ready ? comps.map((c) => formatNum(c.pi, 2)).join(" / ") : "—"} />
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => { ticker.setRunning(false); init(); }}>
              {ready ? "Re-initialize" : "Initialize"}
            </button>
          </div>
          <div className="btn-row">
            <button className="btn" disabled={!ready} onClick={step}>
              Step ({phase === "E" ? "E" : "M"})
            </button>
            <button className="btn" disabled={!ready} onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Run EM"}
            </button>
          </div>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setPoints(samplePoints()); setComps([]); setResp([]); setLlHistory([]); }}>
              New sample data
            </button>
            <button className="btn btn-ghost" onClick={() => { setPoints([]); setComps([]); setResp([]); setLlHistory([]); }}>
              Clear points
            </button>
          </div>

          <LossChart history={llHistory} label="Log-likelihood (rising = better)" />
        </div>
      </div>

      <Explain title="1 · The model: a blend of Gaussians">
        <p>
          A GMM says the data was generated by <Formula tex="k" /> Gaussian blobs, each with a
          mixing weight <Formula tex="\pi_j" />, a mean <Formula tex="\mu_j" /> and a full
          covariance <Formula tex="\Sigma_j" /> — so unlike Naive Bayes' axis-aligned ellipses or
          k-means' spheres, these ellipses can tilt and stretch:
        </p>
        <Formula block tex="p(\mathbf{x}) = \sum_{j=1}^{k} \pi_j \, \mathcal{N}(\mathbf{x} \mid \mu_j, \Sigma_j)" />
        <p>
          The sample data has two diagonal, elongated blobs on purpose — run EM and watch the
          ellipses rotate to embrace them.
        </p>
      </Explain>

      <Explain title="2 · EM: soft k-means">
        <p>
          The <strong>E-step</strong> asks, for every point, “which blob probably produced you?” —
          Bayes' rule over the components:
        </p>
        <Formula block tex="\gamma_{ij} = \frac{\pi_j \, \mathcal{N}(\mathbf{x}_i \mid \mu_j, \Sigma_j)}{\sum_l \pi_l \, \mathcal{N}(\mathbf{x}_i \mid \mu_l, \Sigma_l)}" />
        <p>
          These responsibilities are the point colors: a point midway between two blobs literally
          shows a blended color, where k-means would force an all-or-nothing choice. The{" "}
          <strong>M-step</strong> then refits each blob with every point, weighted by{" "}
          <Formula tex="\gamma_{ij}" /> — a weighted mean, weighted covariance, and{" "}
          <Formula tex="\pi_j = \frac{1}{n}\sum_i \gamma_{ij}" />. Harden the responsibilities to
          0/1 and this is exactly k-means' assign/update loop.
        </p>
      </Explain>

      <Explain title="3 · The likelihood only climbs">
        <p>
          EM is coordinate ascent on the log-likelihood{" "}
          <Formula tex="\sum_i \log p(\mathbf{x}_i)" /> — each E and M pair is guaranteed not to
          decrease it (watch the chart). As with k-means that means local optima: re-initialize a
          few times and compare final log-likelihoods. Also try <Formula tex="k = 2" /> on this
          3-blob data and see how the model compromises — one ellipse stretches to cover two groups.
        </p>
      </Explain>
    </div>
  );
}
