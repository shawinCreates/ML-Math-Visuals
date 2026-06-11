import { useMemo, useRef, useState } from "react";
import { formatNum, sigmoid } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [-5, 5], yDomain: [-5, 5] });

export function WeightsBiases() {
  const [w1, setW1] = useState(1);
  const [w2, setW2] = useState(0.6);
  const [b, setB] = useState(-1);
  const [probe, setProbe] = useState<{ x: number; y: number }>({ x: 2, y: 1.5 });
  const svgRef = useRef<SVGSVGElement>(null);

  const z = w1 * probe.x + w2 * probe.y + b;
  const p = sigmoid(z);

  // shading cells by σ(z)
  const cells = useMemo(() => {
    const nx = 28;
    const ny = 21;
    const out: { px: number; py: number; w: number; h: number; color: string; opacity: number }[] = [];
    const cw = (scale.innerRight - scale.innerLeft) / nx;
    const ch = (scale.innerBottom - scale.innerTop) / ny;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const px = scale.innerLeft + i * cw;
        const py = scale.innerTop + j * ch;
        const x = scale.dx(px + cw / 2);
        const y = scale.dy(py + ch / 2);
        const prob = sigmoid(w1 * x + w2 * y + b);
        out.push({
          px, py, w: cw, h: ch,
          color: prob >= 0.5 ? CLASS_COLORS[1] : CLASS_COLORS[0],
          opacity: Math.abs(prob - 0.5) * 0.55,
        });
      }
    }
    return out;
  }, [w1, w2, b]);

  // decision line w1x + w2y + b = 0
  const line = useMemo(() => {
    if (Math.abs(w2) < 1e-6 && Math.abs(w1) < 1e-6) return null;
    if (Math.abs(w2) >= Math.abs(w1)) {
      return { x1: -5, y1: (-b + 5 * w1) / w2, x2: 5, y2: (-b - 5 * w1) / w2 };
    }
    return { x1: (-b + 5 * w2) / w1, y1: -5, x2: (-b - 5 * w2) / w1, y2: 5 };
  }, [w1, w2, b]);

  // weight vector arrow anchored on the line's closest point to origin
  const arrow = useMemo(() => {
    const norm = Math.hypot(w1, w2);
    if (norm < 1e-6) return null;
    const t = -b / (norm * norm);
    const ax = w1 * t;
    const ay = w2 * t;
    const len = 1.8;
    return { ax, ay, bx: ax + (w1 / norm) * len, by: ay + (w2 / norm) * len };
  }, [w1, w2, b]);

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons !== 1) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * scale.width;
    const py = ((e.clientY - rect.top) / rect.height) * scale.height;
    if (px < scale.innerLeft || px > scale.innerRight || py < scale.innerTop || py > scale.innerBottom) return;
    setProbe({ x: scale.dx(px), y: scale.dy(py) });
  };

  return (
    <div>
      <Hint>
        One neuron, three numbers. Drag the sliders and watch what each one <em>geometrically</em>{" "}
        does. Click/drag on the plot to move the probe input ✕ and read the computation below it.
      </Hint>

      <div className="viz-row">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${scale.width} ${scale.height}`}
          className="viz-svg"
          onPointerDown={onPointer}
          onPointerMove={onPointer}
        >
          {cells.map((c, i) => (
            <rect key={i} x={c.px} y={c.py} width={c.w} height={c.h} fill={c.color} opacity={c.opacity} />
          ))}
          <Axes scale={scale} xLabel="x₁" yLabel="x₂" />
          {line && (
            <line
              x1={scale.sx(line.x1)} y1={scale.sy(line.y1)}
              x2={scale.sx(line.x2)} y2={scale.sy(line.y2)}
              stroke="var(--ink)" strokeWidth={2.5}
            />
          )}
          {arrow && (
            <g>
              <defs>
                <marker id="wb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--danger)" />
                </marker>
              </defs>
              <line
                x1={scale.sx(arrow.ax)} y1={scale.sy(arrow.ay)}
                x2={scale.sx(arrow.bx)} y2={scale.sy(arrow.by)}
                stroke="var(--danger)" strokeWidth={2.5} markerEnd="url(#wb-arrow)"
              />
              <text x={scale.sx(arrow.bx) + 8} y={scale.sy(arrow.by)} className="axis-label" fill="var(--danger)">w</text>
            </g>
          )}
          <g transform={`translate(${scale.sx(probe.x)} ${scale.sy(probe.y)})`}>
            <path d="M-7 -7 L7 7 M-7 7 L7 -7" stroke="var(--ink)" strokeWidth={3} />
          </g>
        </svg>

        <div className="viz-side">
          <Slider label="weight w₁" value={w1} min={-2} max={2} step={0.05} onChange={setW1} format={(v) => formatNum(v)} />
          <Slider label="weight w₂" value={w2} min={-2} max={2} step={0.05} onChange={setW2} format={(v) => formatNum(v)} />
          <Slider label="bias b" value={b} min={-5} max={5} step={0.1} onChange={setB} format={(v) => formatNum(v, 1)} />

          <div className="stat-grid">
            <Stat label={<>score <Formula tex="z" /></>} value={formatNum(z, 3)} />
            <Stat label={<Formula tex="\sigma(z)" />} value={formatNum(p, 3)} />
            <Stat label={<Formula tex="\lVert \mathbf{w} \rVert" />} value={formatNum(Math.hypot(w1, w2), 3)} />
            <Stat label="probe (x₁, x₂)" value={`(${formatNum(probe.x, 1)}, ${formatNum(probe.y, 1)})`} />
          </div>

          <div className="loss-chart">
            <div className="loss-chart-title">The neuron's computation at the probe</div>
            <Formula
              block
              tex={`z = ${formatNum(w1, 2)} \\times ${formatNum(probe.x, 1)} + ${formatNum(w2, 2)} \\times ${formatNum(probe.y, 1)} + (${formatNum(b, 1)}) = ${formatNum(z, 2)}`}
            />
            <Formula block tex={`\\sigma(${formatNum(z, 2)}) = ${formatNum(p, 3)}`} />
          </div>

          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { setW1(1); setW2(0.6); setB(-1); }}>Reset</button>
          </div>
        </div>
      </div>

      <Explain title="1 · Weights set the direction">
        <p>
          The red arrow is the weight vector <Formula tex="\mathbf{w} = (w_1, w_2)" />. It is always
          perpendicular to the decision line, pointing toward the “positive” side — because{" "}
          <Formula tex="z = \mathbf{w}^\top\mathbf{x} + b" /> grows fastest in exactly that
          direction. Change the ratio of <Formula tex="w_1" /> to <Formula tex="w_2" /> and the line
          rotates; this is the same <Formula tex="m" /> from linear regression, dressed up in vector
          clothes.
        </p>
      </Explain>

      <Explain title="2 · The bias shifts, the magnitude sharpens">
        <p>
          With <Formula tex="b = 0" /> the line must pass through the origin — try it. The bias
          slides the line away without rotating it: it is the neuron's <em>threshold</em>, deciding
          how much weighted evidence is needed before <Formula tex="z" /> turns positive. Now scale
          both weights up together (keeping their ratio): the line doesn't move, but the shading
          snaps from a soft gradient to a hard edge. The magnitude <Formula tex="\lVert\mathbf{w}\rVert" />{" "}
          controls <em>confidence</em> — how fast <Formula tex="\sigma(z)" /> saturates as you walk
          away from the line.
        </p>
      </Explain>

      <Explain title="3 · Scale this picture up by a million">
        <p>
          Everything a deep network learns is stored in numbers exactly like these three. A
          768-dimensional transformer layer is this same picture in a space you can't draw: each
          neuron owns a hyperplane, its weights say which direction matters, its bias says how much
          is enough. When you hear “the model has 7 billion parameters,” it means 7 billion of these
          sliders — and gradient descent moves all of them at once, each by{" "}
          <Formula tex="-\alpha\, \partial L / \partial w" />.
        </p>
      </Explain>
    </div>
  );
}
