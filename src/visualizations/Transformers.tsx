import { useMemo, useRef, useState } from "react";
import { clamp, formatNum } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [-5, 5], yDomain: [-5, 5] });

interface Token {
  word: string;
  x: number;
  y: number;
}

const INITIAL: Token[] = [
  { word: "The", x: -3.2, y: 2.6 },
  { word: "cat", x: 2.4, y: 3.0 },
  { word: "sat", x: 3.2, y: 0.8 },
  { word: "on", x: -2.6, y: -1.4 },
  { word: "the", x: -3.4, y: 1.4 },
  { word: "mat", x: 1.6, y: -3.0 },
];

export function Transformers() {
  const [tokens, setTokens] = useState<Token[]>(INITIAL.map((t) => ({ ...t })));
  const [sel, setSel] = useState(1); // query token index
  const [temp, setTemp] = useState(2); // plays the role of √d_k
  const dragIdx = useRef(-1);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = tokens.length;

  const attn = useMemo(() => {
    // self-attention with Q = K = V = token vectors
    const scores = tokens.map((qi) => tokens.map((kj) => (qi.x * kj.x + qi.y * kj.y) / temp));
    return scores.map((row) => {
      const mx = Math.max(...row);
      const exps = row.map((s) => Math.exp(s - mx));
      const sum = exps.reduce((a, b) => a + b, 0);
      return exps.map((e) => e / sum);
    });
  }, [tokens, temp]);

  const output = useMemo(() => {
    const row = attn[sel];
    return {
      x: row.reduce((s, a, j) => s + a * tokens[j].x, 0),
      y: row.reduce((s, a, j) => s + a * tokens[j].y, 0),
    };
  }, [attn, sel, tokens]);

  function toSvg(e: { clientX: number; clientY: number }) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      px: ((e.clientX - rect.left) / rect.width) * scale.width,
      py: ((e.clientY - rect.top) / rect.height) * scale.height,
    };
  }

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { px, py } = toSvg(e);
    let best = -1;
    let bestD = 18;
    tokens.forEach((t, i) => {
      const d = Math.hypot(scale.sx(t.x) - px, scale.sy(t.y) - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0) {
      dragIdx.current = best;
      setSel(best);
    }
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragIdx.current < 0) return;
    const { px, py } = toSvg(e);
    const x = clamp(scale.dx(px), -5, 5);
    const y = clamp(scale.dy(py), -5, 5);
    setTokens(tokens.map((t, i) => (i === dragIdx.current ? { ...t, x, y } : t)));
  };

  const heat = (v: number) => `rgba(79, 125, 249, ${v})`;
  const CELLW = 46;

  return (
    <div>
      <Hint>
        Each word is a vector — drag them. Attention is just dot products: words pointing the same
        way attend to each other. The ◆ is the selected word's output: a weighted average of
        everyone it attends to.
      </Hint>

      <div className="viz-row">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          className="viz-svg"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={() => (dragIdx.current = -1)}
          onPointerLeave={() => (dragIdx.current = -1)}
        >
          <Axes scale={scale} />
          {/* mixing lines from selected token's output to its sources */}
          {tokens.map((t, j) => (
            <line
              key={"mix" + j}
              x1={scale.sx(output.x)}
              y1={scale.sy(output.y)}
              x2={scale.sx(t.x)}
              y2={scale.sy(t.y)}
              stroke={CLASS_COLORS[1]}
              strokeWidth={1 + attn[sel][j] * 6}
              opacity={0.15 + attn[sel][j] * 0.6}
            />
          ))}
          {/* token vectors from origin */}
          {tokens.map((t, i) => (
            <line
              key={"v" + i}
              x1={scale.sx(0)}
              y1={scale.sy(0)}
              x2={scale.sx(t.x)}
              y2={scale.sy(t.y)}
              stroke={i === sel ? "var(--accent)" : "var(--border-strong)"}
              strokeWidth={i === sel ? 2 : 1.2}
            />
          ))}
          {tokens.map((t, i) => (
            <g key={i} transform={`translate(${scale.sx(t.x)} ${scale.sy(t.y)})`} style={{ cursor: "grab" }}>
              <circle r={13} fill={i === sel ? "var(--accent)" : "var(--panel)"} stroke={i === sel ? "var(--accent)" : "var(--ink)"} strokeWidth={1.5} />
              <text textAnchor="middle" dy={4} style={{ fontSize: 11, fontWeight: 700, fill: i === sel ? "#fff" : "var(--ink)", pointerEvents: "none" }}>
                {t.word}
              </text>
            </g>
          ))}
          <g transform={`translate(${scale.sx(output.x)} ${scale.sy(output.y)})`}>
            <path d="M0 -9 L9 0 L0 9 L-9 0 Z" fill={CLASS_COLORS[1]} stroke="#fff" strokeWidth={1.5} />
          </g>
          <text x={scale.sx(output.x) + 12} y={scale.sy(output.y) - 8} className="axis-label" fill={CLASS_COLORS[1]}>
            output of “{tokens[sel].word}”
          </text>
        </svg>

        <div className="viz-side">
          <Slider label="scale √dₖ (temperature)" value={temp} min={0.3} max={6} step={0.1} onChange={setTemp} format={(v) => formatNum(v, 1)} />

          <div className="loss-chart">
            <div className="loss-chart-title">Attention matrix — row = query, column = key (click a row)</div>
            <svg viewBox={`0 0 ${CELLW * (n + 1)} ${CELLW * (n + 1)}`} className="loss-chart-svg">
              {tokens.map((t, j) => (
                <text key={"c" + j} x={CELLW * (j + 1) + CELLW / 2} y={CELLW - 12} textAnchor="middle" className="tick-label">
                  {t.word}
                </text>
              ))}
              {tokens.map((t, i) => (
                <g key={"r" + i}>
                  <text x={CELLW - 6} y={CELLW * (i + 1) + CELLW / 2 + 4} textAnchor="end" className="tick-label" style={{ fontWeight: i === sel ? 700 : 400 }}>
                    {t.word}
                  </text>
                  {tokens.map((_, j) => (
                    <g key={j}>
                      <rect
                        x={CELLW * (j + 1) + 1}
                        y={CELLW * (i + 1) + 1}
                        width={CELLW - 2}
                        height={CELLW - 2}
                        rx={4}
                        fill={heat(attn[i][j])}
                        stroke={i === sel ? "var(--accent)" : "var(--border)"}
                        strokeWidth={i === sel ? 1.5 : 0.5}
                        onClick={() => setSel(i)}
                        style={{ cursor: "pointer" }}
                      />
                      <text
                        x={CELLW * (j + 1) + CELLW / 2}
                        y={CELLW * (i + 1) + CELLW / 2 + 3.5}
                        textAnchor="middle"
                        style={{ fontSize: 9.5, fill: attn[i][j] > 0.5 ? "#fff" : "var(--muted)", pointerEvents: "none" }}
                      >
                        {(attn[i][j] * 100).toFixed(0)}
                      </text>
                    </g>
                  ))}
                </g>
              ))}
            </svg>
          </div>

          <div className="stat-grid">
            <Stat label="selected query" value={`“${tokens[sel].word}”`} />
            <Stat
              label="top attention"
              value={(() => {
                const row = attn[sel];
                let best = 0;
                row.forEach((v, j) => { if (v > row[best]) best = j; });
                return `“${tokens[best].word}” (${(row[best] * 100).toFixed(0)}%)`;
              })()}
            />
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => setTokens(INITIAL.map((t) => ({ ...t })))}>Reset layout</button>
          </div>
        </div>
      </div>

      <Explain title="1 · Three jobs per token: query, key, value">
        <p>
          Every token asks “who is relevant to me?” (its <em>query</em>), advertises “this is what I
          offer” (its <em>key</em>), and carries content to share (its <em>value</em>). Relevance is
          measured the simplest way vectors allow — a dot product — then each row is softmaxed into
          weights that sum to 1:
        </p>
        <Formula block tex="\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\Big(\frac{QK^\top}{\sqrt{d_k}}\Big)\,V" />
        <p>
          In this toy, query = key = value = the 2D vector you drag (a real transformer learns three
          matrices <Formula tex="W_Q, W_K, W_V" /> to make them differ). Drag “cat” to point the
          same way as “sat”: their dot product grows, and the matrix cell lights up.
        </p>
      </Explain>

      <Explain title="2 · The output is a weighted average — a soft lookup">
        <p>
          The orange ◆ is the selected token's output:{" "}
          <Formula tex="\mathbf{o}_i = \sum_j \alpha_{ij}\, \mathbf{v}_j" />. It sits at the
          attention-weighted center of mass of all the tokens — drag a heavily-attended token and
          the ◆ follows it; drag an ignored one and nothing happens. This is how “cat” can pull in
          information from “sat” and “mat” in one step, no matter how far apart they sit in the
          sentence: contrast the RNN module, where information had to survive a 27-step relay race.
        </p>
      </Explain>

      <Explain title="3 · The √dₖ slider is the softmax thermostat">
        <p>
          Slide the scale down to 0.3: scores get divided by a small number, differences are
          amplified, and softmax saturates — each row puts ~100% on one token (hard, brittle
          attention with vanishing gradients to everyone else). Slide it to 6 and every row goes
          uniform — attention becomes a blur. Real transformers divide by{" "}
          <Formula tex="\sqrt{d_k}" /> precisely to keep dot products in the soft middle zone where
          gradients flow to many tokens at once. Everything else in a transformer — multiple heads,
          stacked layers, positional encodings — is this one mechanism, repeated and composed.
        </p>
      </Explain>
    </div>
  );
}
