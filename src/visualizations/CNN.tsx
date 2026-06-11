import { useMemo, useRef, useState } from "react";
import { formatNum } from "../lib/math";
import { Formula } from "../components/Formula";
import { useTicker } from "../components/useTicker";
import { Explain, Hint, Stat } from "../components/Explain";

const N = 12; // input size
const K = 3; // kernel size
const M = N - K + 1; // output size

type Grid = number[][];

function blank(): Grid {
  return Array.from({ length: N }, () => new Array(N).fill(0));
}

function drawX(): Grid {
  const g = blank();
  for (let i = 1; i < N - 1; i++) {
    g[i][i] = 1;
    g[i][N - 1 - i] = 1;
  }
  return g;
}

function drawT(): Grid {
  const g = blank();
  for (let j = 2; j < N - 2; j++) g[2][j] = 1;
  for (let i = 2; i < N - 2; i++) g[i][Math.floor(N / 2)] = 1;
  return g;
}

function drawSquare(): Grid {
  const g = blank();
  for (let i = 2; i < N - 2; i++) {
    g[2][i] = 1;
    g[N - 3][i] = 1;
    g[i][2] = 1;
    g[i][N - 3] = 1;
  }
  return g;
}

const KERNELS: Record<string, { label: string; k: number[][] }> = {
  vEdge: { label: "vertical edge", k: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]] },
  hEdge: { label: "horizontal edge", k: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]] },
  diag: { label: "diagonal ↘", k: [[1, 0, -1], [0, 1, 0], [-1, 0, 1]] },
  blur: { label: "blur (average)", k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((v) => v / 9)) },
};

const CELL = 26;
const GAP = 2;

export function CNN() {
  const [img, setImg] = useState<Grid>(drawX);
  const [kernel, setKernel] = useState<number[][]>(KERNELS.vEdge.k);
  const [kernelName, setKernelName] = useState("vEdge");
  const [pos, setPos] = useState<{ i: number; j: number } | null>({ i: 4, j: 4 });
  const [useRelu, setUseRelu] = useState(false);
  const sweep = useRef(0);
  const paintValue = useRef(1);

  const out = useMemo(() => {
    const o: Grid = Array.from({ length: M }, () => new Array(M).fill(0));
    for (let i = 0; i < M; i++) {
      for (let j = 0; j < M; j++) {
        let s = 0;
        for (let u = 0; u < K; u++) {
          for (let v = 0; v < K; v++) s += img[i + u][j + v] * kernel[u][v];
        }
        o[i][j] = useRelu ? Math.max(0, s) : s;
      }
    }
    return o;
  }, [img, kernel, useRelu]);

  const outMax = useMemo(() => Math.max(1e-9, ...out.flat().map((v) => Math.abs(v))), [out]);

  const ticker = useTicker(() => {
    sweep.current = (sweep.current + 1) % (M * M);
    setPos({ i: Math.floor(sweep.current / M), j: sweep.current % M });
    return true;
  });

  function paint(i: number, j: number, start: boolean) {
    if (start) paintValue.current = img[i][j] === 1 ? 0 : 1;
    setImg(img.map((row, r) => (r === i ? row.map((v, c) => (c === j ? paintValue.current : v)) : row)));
  }

  function cycleKernel(u: number, v: number) {
    setKernelName("custom");
    setKernel(kernel.map((row, r) => (r === u ? row.map((val, c) => (c === v ? (val >= 1 ? -1 : Math.round(val + 1)) : val)) : row)));
  }

  const dot = useMemo(() => {
    if (!pos) return null;
    const terms: { img: number; k: number }[] = [];
    let sum = 0;
    for (let u = 0; u < K; u++) {
      for (let v = 0; v < K; v++) {
        const a = img[pos.i + u][pos.j + v];
        const b = kernel[u][v];
        terms.push({ img: a, k: b });
        sum += a * b;
      }
    }
    return { terms, sum };
  }, [pos, img, kernel]);

  const gridSize = N * (CELL + GAP);
  const outSize = M * (CELL + GAP);

  const outColor = (v: number) => {
    const t = Math.abs(v) / outMax;
    return v >= 0 ? `rgba(249, 115, 22, ${t})` : `rgba(79, 125, 249, ${t})`;
  };

  return (
    <div>
      <Hint>
        Paint pixels on the left (click/drag), pick or edit a kernel, and hover the output map —
        every output pixel is one dot product between the kernel and the patch under it.
      </Hint>

      <div className="viz-row" style={{ gridTemplateColumns: "minmax(0, 1.4fr) 300px" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div className="loss-chart-title">Input image ({N}×{N}) — click to paint</div>
            <svg
              viewBox={`0 0 ${gridSize} ${gridSize}`}
              style={{ width: "100%", maxWidth: 340, touchAction: "none" }}
              onPointerLeave={() => !ticker.running && setPos(null)}
            >
              {img.map((row, i) =>
                row.map((v, j) => (
                  <rect
                    key={i + "-" + j}
                    x={j * (CELL + GAP)}
                    y={i * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    fill={v === 1 ? "var(--ink)" : "var(--grid)"}
                    onPointerDown={() => paint(i, j, true)}
                    onPointerEnter={(e) => e.buttons === 1 && paint(i, j, false)}
                    style={{ cursor: "pointer" }}
                  />
                )),
              )}
              {pos && (
                <rect
                  x={pos.j * (CELL + GAP) - GAP / 2}
                  y={pos.i * (CELL + GAP) - GAP / 2}
                  width={K * (CELL + GAP)}
                  height={K * (CELL + GAP)}
                  fill="none"
                  stroke="var(--danger)"
                  strokeWidth={3}
                  rx={4}
                />
              )}
            </svg>
          </div>

          <div>
            <div className="loss-chart-title">Feature map ({M}×{M}) — hover me</div>
            <svg viewBox={`0 0 ${outSize} ${outSize}`} style={{ width: "100%", maxWidth: 290 }}>
              {out.map((row, i) =>
                row.map((v, j) => (
                  <rect
                    key={i + "-" + j}
                    x={j * (CELL + GAP)}
                    y={i * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    fill={outColor(v)}
                    stroke={pos && pos.i === i && pos.j === j ? "var(--danger)" : "var(--border)"}
                    strokeWidth={pos && pos.i === i && pos.j === j ? 3 : 1}
                    onPointerEnter={() => { ticker.setRunning(false); setPos({ i, j }); }}
                  />
                )),
              )}
            </svg>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>orange = positive, blue = negative</div>
          </div>
        </div>

        <div className="viz-side">
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setImg(drawX())}>X</button>
            <button className="btn btn-ghost" onClick={() => setImg(drawT())}>T</button>
            <button className="btn btn-ghost" onClick={() => setImg(drawSquare())}>□</button>
            <button className="btn btn-ghost" onClick={() => setImg(blank())}>clear</button>
          </div>

          <div className="loss-chart">
            <div className="loss-chart-title">Kernel (3×3) — click cells to edit</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gap: 4, justifyContent: "center", margin: "6px 0" }}>
              {kernel.map((row, u) =>
                row.map((v, c) => (
                  <button
                    key={u + "-" + c}
                    className="btn"
                    style={{
                      height: 40,
                      padding: 0,
                      fontVariantNumeric: "tabular-nums",
                      background: v > 0 ? "rgba(249, 115, 22, 0.25)" : v < 0 ? "rgba(79, 125, 249, 0.25)" : "var(--panel)",
                    }}
                    onClick={() => cycleKernel(u, c)}
                  >
                    {Math.abs(v) < 1 && v !== 0 ? formatNum(v, 1) : v}
                  </button>
                )),
              )}
            </div>
            <div className="btn-row">
              {Object.entries(KERNELS).map(([name, k]) => (
                <button
                  key={name}
                  className={"btn" + (kernelName === name ? " btn-primary" : "")}
                  style={{ fontSize: 11.5 }}
                  onClick={() => { setKernel(k.k.map((r) => [...r])); setKernelName(name); }}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause sweep" : "Animate the slide"}
            </button>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={useRelu} onChange={(e) => setUseRelu(e.target.checked)} />
            Apply ReLU to the feature map
          </label>

          {dot && pos && (
            <div className="loss-chart">
              <div className="loss-chart-title">Dot product at output ({pos.i}, {pos.j})</div>
              <div style={{ fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                {dot.terms.filter((t) => t.img !== 0 && t.k !== 0).length === 0
                  ? "All terms are zero here."
                  : dot.terms
                      .filter((t) => t.img !== 0 && t.k !== 0)
                      .map((t) => `${t.img}×${formatNum(t.k, t.k % 1 ? 1 : 0)}`)
                      .join(" + ")}
                {" = "}
                <strong>{formatNum(dot.sum, 2)}</strong>
              </div>
            </div>
          )}

          <Stat label="parameters in this layer" value={`${K * K} (vs ${N * N * M * M} for a dense layer)`} />
        </div>
      </div>

      <Explain title="1 · Convolution = one tiny dot product, repeated everywhere">
        <p>
          The output pixel at position <Formula tex="(i, j)" /> is the kernel laid over the input
          patch at the same position, multiplied elementwise, summed:
        </p>
        <Formula block tex="(I * K)_{ij} = \sum_{u=0}^{2}\sum_{v=0}^{2} I_{i+u,\, j+v}\, K_{u, v}" />
        <p>
          That's it — the entire operation, shown live in the side panel as you hover. The kernel's
          9 numbers are <em>weights</em>, exactly like every other weight on this site, and in a
          real CNN they are learned by gradient descent rather than hand-picked.
        </p>
      </Explain>

      <Explain title="2 · A kernel is a pattern detector">
        <p>
          Load the X image with the vertical-edge kernel: the feature map lights up orange where the
          image transitions dark→bright left-to-right, blue for the opposite — and stays silent on
          uniform regions (sum of +1s and −1s over a constant patch is zero). Switch kernels and the{" "}
          <em>same image</em> yields a completely different summary. Apply ReLU and the map becomes
          “where does my pattern appear?” — negative evidence is clipped to silence. Draw your own
          shapes and find which kernel sees them best.
        </p>
      </Explain>

      <Explain title="3 · Weight sharing, again — and why it's a superpower for images">
        <p>
          This layer has 9 parameters; a dense layer mapping {N}×{N} inputs to the same {M}×{M}{" "}
          output would need {(N * N * M * M).toLocaleString()}. The savings come from an assumption
          baked into the architecture: <em>an edge is an edge wherever it appears</em> (translation
          equivariance) — so one detector, slid everywhere, suffices. Real CNNs stack dozens of such
          layers: early kernels find edges, later ones (looking at feature maps of feature maps)
          find corners, textures, eyes, faces. It's the RNN's weight-sharing idea, transplanted from
          time to space — and without the vanishing-gradient curse, because depth stays modest while
          width does the work.
        </p>
      </Explain>
    </div>
  );
}
