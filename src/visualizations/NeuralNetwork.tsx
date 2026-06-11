import { useEffect, useMemo, useRef, useState } from "react";
import { LabeledPoint, clamp, formatNum, randn } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { MLP, createMLP, predict, trainStep } from "../lib/mlp";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { usePointEditor } from "../components/usePointEditor";
import { useTicker } from "../components/useTicker";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [0, 10], yDomain: [0, 10] });

// network sees inputs scaled to [-1, 1]
const toU = (v: number) => (v - 5) / 5;

type Dataset = "xor" | "circle" | "spiral";

function makeDataset(kind: Dataset): LabeledPoint[] {
  const pts: LabeledPoint[] = [];
  if (kind === "xor") {
    const blobs = [
      { x: 2.8, y: 7.2, label: 0 },
      { x: 7.2, y: 2.8, label: 0 },
      { x: 2.8, y: 2.8, label: 1 },
      { x: 7.2, y: 7.2, label: 1 },
    ];
    for (const b of blobs) {
      for (let i = 0; i < 8; i++) {
        pts.push({ x: clamp(b.x + randn(), 0.2, 9.8), y: clamp(b.y + randn(), 0.2, 9.8), label: b.label });
      }
    }
  } else if (kind === "circle") {
    for (let i = 0; i < 16; i++) {
      const t = (i / 16) * 2 * Math.PI;
      const r = 1.2 + Math.random() * 0.6;
      pts.push({ x: clamp(5 + r * Math.cos(t), 0.2, 9.8), y: clamp(5 + r * Math.sin(t), 0.2, 9.8), label: 1 });
    }
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * 2 * Math.PI;
      const r = 3.2 + Math.random() * 0.8;
      pts.push({ x: clamp(5 + r * Math.cos(t), 0.2, 9.8), y: clamp(5 + r * Math.sin(t), 0.2, 9.8), label: 0 });
    }
  } else {
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 22; i++) {
        const t = (i / 22) * 3.2 + 0.4;
        const r = t;
        const angle = t * 1.6 + arm * Math.PI;
        pts.push({
          x: clamp(5 + r * Math.cos(angle) + randn() * 0.15, 0.2, 9.8),
          y: clamp(5 + r * Math.sin(angle) + randn() * 0.15, 0.2, 9.8),
          label: arm,
        });
      }
    }
  }
  return pts;
}

export function NeuralNetwork() {
  const [dataset, setDataset] = useState<Dataset>("xor");
  const [points, setPoints] = useState<LabeledPoint[]>(() => makeDataset("xor"));
  const [activeClass, setActiveClass] = useState(0);
  const [hidden, setHidden] = useState(4);
  const [layers, setLayers] = useState(1);
  const [lr, setLr] = useState(0.8);
  const [lossHistory, setLossHistory] = useState<number[]>([]);
  const [epoch, setEpoch] = useState(0);
  const [version, setVersion] = useState(0); // bumps when in-place weights change
  const netRef = useRef<MLP>(createMLP([2, 4, 1]));
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { handlers } = usePointEditor(svgRef, scale, points, setPoints, (x, y) => ({ x, y, label: activeClass }));

  function rebuild(h = hidden, l = layers) {
    const sizes = [2, ...Array.from({ length: l }, () => h), 1];
    netRef.current = createMLP(sizes);
    setLossHistory([]);
    setEpoch(0);
    setVersion((v) => v + 1);
  }

  const samples = useMemo(
    () => points.map((p) => ({ x: toU(p.x), y: toU(p.y), label: p.label })),
    [points],
  );

  const ticker = useTicker(() => {
    if (samples.length === 0) return false;
    let loss = 0;
    for (let i = 0; i < 10; i++) loss = trainStep(netRef.current, samples, lr);
    setEpoch((e) => e + 10);
    setLossHistory((h) => [...h.slice(-499), loss]);
    setVersion((v) => v + 1);
    return true;
  });

  // decision surface
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, scale.width, scale.height);
    const cell = 6;
    const c0 = [79, 125, 249];
    const c1 = [249, 115, 22];
    for (let px = scale.innerLeft; px < scale.innerRight; px += cell) {
      for (let py = scale.innerTop; py < scale.innerBottom; py += cell) {
        const p = predict(netRef.current, toU(scale.dx(px + cell / 2)), toU(scale.dy(py + cell / 2)));
        const r = Math.round(c0[0] + (c1[0] - c0[0]) * p);
        const g = Math.round(c0[1] + (c1[1] - c0[1]) * p);
        const b = Math.round(c0[2] + (c1[2] - c0[2]) * p);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.18 + 0.3 * Math.abs(p - 0.5) * 2})`;
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }, [version]);

  const accuracy = useMemo(() => {
    void version;
    if (samples.length === 0) return 0;
    let ok = 0;
    for (const s of samples) {
      if ((predict(netRef.current, s.x, s.y) >= 0.5 ? 1 : 0) === s.label) ok++;
    }
    return ok / samples.length;
  }, [samples, version]);

  // ---- network diagram ----
  const diagram = useMemo(() => {
    void version;
    const net = netRef.current;
    const w = 300;
    const h = 220;
    const layerXs = net.sizes.map((_, l) => 30 + (l / (net.sizes.length - 1)) * (w - 60));
    const nodeYs = net.sizes.map((size) =>
      Array.from({ length: size }, (_, j) => (size === 1 ? h / 2 : 24 + (j / (size - 1)) * (h - 48))),
    );
    const maxW = Math.max(0.3, ...net.W.flat(2).map((v) => Math.abs(v)));
    const edges: { x1: number; y1: number; x2: number; y2: number; v: number }[] = [];
    for (let l = 0; l < net.W.length; l++) {
      for (let j = 0; j < net.W[l].length; j++) {
        for (let i = 0; i < net.W[l][j].length; i++) {
          edges.push({
            x1: layerXs[l],
            y1: nodeYs[l][i],
            x2: layerXs[l + 1],
            y2: nodeYs[l + 1][j],
            v: net.W[l][j][i] / maxW,
          });
        }
      }
    }
    return { w, h, layerXs, nodeYs, edges };
  }, [version]);

  return (
    <div>
      <Hint>
        Pick a dataset the line-based models can't solve, then train. The diagram shows every weight
        live: thickness = magnitude, blue = positive, red = negative. Click to add your own points.
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
            {(["xor", "circle", "spiral"] as Dataset[]).map((d) => (
              <button
                key={d}
                className={"btn" + (dataset === d ? " btn-primary" : "")}
                onClick={() => { ticker.setRunning(false); setDataset(d); setPoints(makeDataset(d)); rebuild(); }}
              >
                {d}
              </button>
            ))}
          </div>
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

          <Slider label="hidden layers" value={layers} min={1} max={2} step={1} onChange={(v) => { setLayers(v); rebuild(hidden, v); }} />
          <Slider label="neurons / layer" value={hidden} min={2} max={8} step={1} onChange={(v) => { setHidden(v); rebuild(v, layers); }} />
          <Slider label="learning rate α" value={lr} min={0.05} max={2} step={0.05} onChange={setLr} format={(v) => formatNum(v)} />

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Train"}
            </button>
            <button className="btn" onClick={() => rebuild()}>Reset weights</button>
          </div>

          <div className="stat-grid">
            <Stat label="epochs" value={epoch} />
            <Stat label="loss" value={lossHistory.length > 0 ? formatNum(lossHistory[lossHistory.length - 1], 4) : "—"} />
            <Stat label="accuracy" value={`${formatNum(accuracy * 100, 0)}%`} />
            <Stat label="parameters" value={netRef.current.W.flat(2).length + netRef.current.b.flat().length} />
          </div>

          <div className="loss-chart">
            <div className="loss-chart-title">The network — every weight, live</div>
            <svg viewBox={`0 0 ${diagram.w} ${diagram.h}`} className="loss-chart-svg">
              {diagram.edges.map((e, i) => (
                <line
                  key={i}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke={e.v >= 0 ? "var(--accent)" : "var(--danger)"}
                  strokeWidth={0.5 + Math.abs(e.v) * 3.5}
                  opacity={0.25 + Math.abs(e.v) * 0.6}
                />
              ))}
              {diagram.nodeYs.map((ys, l) =>
                ys.map((y, j) => (
                  <circle key={l + "-" + j} cx={diagram.layerXs[l]} cy={y} r={8} fill="var(--panel)" stroke="var(--ink)" strokeWidth={1.5} />
                )),
              )}
            </svg>
          </div>

          <LossChart history={lossHistory} label="Cross-entropy" />
        </div>
      </div>

      <Explain title="1 · A neuron is logistic regression; a network is many of them">
        <p>
          Each hidden neuron computes <Formula tex="a_j = \tanh(\mathbf{w}_j^\top \mathbf{x} + b_j)" />{" "}
          — weights times input plus bias through a squash, exactly the recipe from the logistic
          regression module. The output neuron then runs logistic regression <em>on the hidden
          activations instead of the raw inputs</em>:
        </p>
        <Formula block tex="\hat{p} = \sigma\big(\mathbf{w}_{\text{out}}^\top \tanh(W\mathbf{x} + \mathbf{b}) + b_{\text{out}}\big)" />
        <p>
          That's the whole trick: the hidden layer <em>learns the features</em> that make the
          problem linearly separable. Each hidden neuron's tanh draws one soft line through the
          plane; the output combines those lines into curved regions.
        </p>
      </Explain>

      <Explain title="2 · Backpropagation is the chain rule, organized">
        <p>
          Training is the same gradient descent as everywhere else in this site — the only question
          is how to get <Formula tex="\partial L / \partial w" /> for weights buried under other
          layers. Backprop computes an error signal <Formula tex="\delta" /> at the output (
          <Formula tex="\hat{p} - y" />, the familiar pattern) and passes it backwards, each layer
          multiplying by its weights and its activation's slope:
        </p>
        <Formula block tex="\delta^{(l)} = \big(W^{(l+1)\top} \delta^{(l+1)}\big) \odot \varphi'(z^{(l)}), \qquad \frac{\partial L}{\partial W^{(l)}} = \delta^{(l)} \, a^{(l-1)\top}" />
        <p>
          Every gradient is still “error × input” — just with locally computed errors.
        </p>
      </Explain>

      <Explain title="3 · Experiments to run">
        <p>
          1) <strong>XOR with 2 neurons</strong>: set 1 layer × 2 neurons — it can just barely solve
          XOR (two lines), but often gets stuck; reset weights a few times. This failure of
          single-line models is what killed the perceptron in 1969. 2) <strong>Capacity</strong>:
          the spiral needs 2 layers × 8 neurons — watch the diagram organize itself. 3){" "}
          <strong>Initialization matters</strong>: same settings, reset weights repeatedly —
          different runs find different solutions, some better. The loss surface of a network is
          full of valleys, unlike linear regression's single bowl.
        </p>
      </Explain>
    </div>
  );
}
