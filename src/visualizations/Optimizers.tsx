import { useEffect, useMemo, useRef, useState } from "react";
import { formatNum } from "../lib/math";
import { CLASS_COLORS, makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { useTicker } from "../components/useTicker";
import { Explain, Hint, Stat } from "../components/Explain";
import { Optimizers3D } from "./Optimizers3D";

const scale = makeScale({ width: 560, height: 420, margin: 40, xDomain: [-10, 10], yDomain: [-4, 4] });

// elongated bowl: shallow along x, steep along y (condition number 20)
const f = (x: number, y: number) => (x * x) / 20 + y * y;
const grad = (x: number, y: number): [number, number] => [x / 10, 2 * y];

type OptName = "sgd" | "momentum" | "adam";
const OPT_COLORS: Record<OptName, string> = { sgd: CLASS_COLORS[0], momentum: CLASS_COLORS[1], adam: CLASS_COLORS[2] };
const OPT_LABELS: Record<OptName, string> = { sgd: "SGD", momentum: "Momentum", adam: "Adam" };

interface OptState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mx: number;
  my: number;
  sx: number;
  sy: number;
  t: number;
  path: [number, number][];
  done: boolean;
}

function fresh(x: number, y: number): OptState {
  return { x, y, vx: 0, vy: 0, mx: 0, my: 0, sx: 0, sy: 0, t: 0, path: [[x, y]], done: false };
}

function stepOpt(s: OptState, kind: OptName, lr: number, beta: number): OptState {
  if (s.done) return s;
  const [gx, gy] = grad(s.x, s.y);
  let { x, y, vx, vy, mx, my, sx, sy } = s;
  const t = s.t + 1;
  if (kind === "sgd") {
    x -= lr * gx;
    y -= lr * gy;
  } else if (kind === "momentum") {
    vx = beta * vx - lr * gx;
    vy = beta * vy - lr * gy;
    x += vx;
    y += vy;
  } else {
    const b1 = 0.9;
    const b2 = 0.999;
    mx = b1 * mx + (1 - b1) * gx;
    my = b1 * my + (1 - b1) * gy;
    sx = b2 * sx + (1 - b2) * gx * gx;
    sy = b2 * sy + (1 - b2) * gy * gy;
    const mhx = mx / (1 - b1 ** t);
    const mhy = my / (1 - b1 ** t);
    const shx = sx / (1 - b2 ** t);
    const shy = sy / (1 - b2 ** t);
    x -= (lr * mhx) / (Math.sqrt(shx) + 1e-8);
    y -= (lr * mhy) / (Math.sqrt(shy) + 1e-8);
  }
  const done = Math.hypot(...grad(x, y)) < 2e-3 || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 50 || Math.abs(y) > 50;
  return { x, y, vx, vy, mx, my, sx, sy, t, path: [...s.path, [x, y]], done };
}

const START: [number, number] = [-8.5, 2.5];

export function Optimizers() {
  const [lr, setLr] = useState(0.12);
  const [beta, setBeta] = useState(0.9);
  const [states, setStates] = useState<Record<OptName, OptState>>({
    sgd: fresh(...START),
    momentum: fresh(...START),
    adam: fresh(...START),
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // contour heatmap, drawn once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, scale.width, scale.height);
    const cell = 3;
    const fMax = f(10, 4);
    for (let px = scale.innerLeft; px < scale.innerRight; px += cell) {
      for (let py = scale.innerTop; py < scale.innerBottom; py += cell) {
        const v = f(scale.dx(px), scale.dy(py)) / fMax;
        const band = Math.floor(Math.sqrt(v) * 14);
        const shade = 248 - band * 7;
        ctx.fillStyle = band % 2 === 0 ? `rgb(${shade}, ${shade + 3}, 255)` : `rgb(${shade - 4}, ${shade}, 250)`;
        ctx.fillRect(px, py, cell, cell);
      }
    }
  }, []);

  function reset(start: [number, number] = START) {
    setStates({ sgd: fresh(...start), momentum: fresh(...start), adam: fresh(...start) });
  }

  const ticker = useTicker(() => {
    let alive = false;
    setStates((s) => {
      const next = {
        sgd: stepOpt(s.sgd, "sgd", lr, beta),
        momentum: stepOpt(s.momentum, "momentum", lr, beta),
        adam: stepOpt(s.adam, "adam", lr, beta),
      };
      alive = !(next.sgd.done && next.momentum.done && next.adam.done);
      return next;
    });
    return alive;
  });

  const onClick = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * scale.width;
    const py = ((e.clientY - rect.top) / rect.height) * scale.height;
    if (px < scale.innerLeft || px > scale.innerRight || py < scale.innerTop || py > scale.innerBottom) return;
    ticker.setRunning(false);
    reset([scale.dx(px), scale.dy(py)]);
  };

  const order = useMemo(() => (Object.keys(states) as OptName[]), [states]);

  return (
    <div>
      <Hint>
        The bowl is 20× steeper top-to-bottom than left-to-right — the classic ravine. Click
        anywhere to drop the three optimizers there, then run. Same gradients, three philosophies.
      </Hint>

      <div className="viz-row">
        <div className="viz-stack">
          <canvas ref={canvasRef} width={scale.width} height={scale.height} className="viz-canvas" />
          <svg ref={svgRef} viewBox={`0 0 ${scale.width} ${scale.height}`} className="viz-svg viz-svg-overlay" onPointerDown={onClick}>
            <Axes scale={scale} xLabel="θ₁" yLabel="θ₂" />
            <circle cx={scale.sx(0)} cy={scale.sy(0)} r={7} fill="none" stroke="var(--ink)" strokeWidth={2} />
            <circle cx={scale.sx(0)} cy={scale.sy(0)} r={2.5} fill="var(--ink)" />
            {order.map((k) => (
              <g key={k}>
                <polyline
                  points={states[k].path.map(([x, y]) => `${scale.sx(x).toFixed(1)},${scale.sy(y).toFixed(1)}`).join(" ")}
                  fill="none"
                  stroke={OPT_COLORS[k]}
                  strokeWidth={2}
                  opacity={0.85}
                />
                <circle cx={scale.sx(states[k].x)} cy={scale.sy(states[k].y)} r={6} fill={OPT_COLORS[k]} stroke="#fff" strokeWidth={1.5} />
              </g>
            ))}
          </svg>
        </div>

        <div className="viz-side">
          <div className="stat-grid">
            {order.map((k) => (
              <Stat
                key={k}
                label={<span style={{ color: OPT_COLORS[k], fontWeight: 700 }}>{OPT_LABELS[k]}</span>}
                value={
                  states[k].done && Math.hypot(states[k].x, states[k].y) < 1
                    ? `done in ${states[k].t}`
                    : states[k].done
                      ? "diverged!"
                      : `step ${states[k].t} · L=${formatNum(f(states[k].x, states[k].y), 3)}`
                }
              />
            ))}
            <Stat label="condition number" value="20" />
          </div>

          <Slider label="learning rate α" value={lr} min={0.01} max={1.1} step={0.01} onChange={setLr} format={(v) => formatNum(v)} />
          <Slider label="momentum β" value={beta} min={0} max={0.99} step={0.01} onChange={setBeta} format={(v) => formatNum(v)} />

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Race!"}
            </button>
            <button
              className="btn"
              onClick={() =>
                setStates((s) => ({
                  sgd: stepOpt(s.sgd, "sgd", lr, beta),
                  momentum: stepOpt(s.momentum, "momentum", lr, beta),
                  adam: stepOpt(s.adam, "adam", lr, beta),
                }))
              }
            >
              Step once
            </button>
            <button className="btn" onClick={() => { ticker.setRunning(false); reset(); }}>Reset</button>
          </div>

          <div className="callout">
            Try α = 0.9: SGD diverges (the steep direction overshoots), momentum oscillates wildly,
            Adam shrugs — its per-parameter scaling tames the steep axis automatically.
          </div>
        </div>
      </div>

      <Explain title="1 · The ravine problem">
        <p>
          Plain gradient descent <Formula tex="\theta \leftarrow \theta - \alpha \nabla L" /> takes
          steps proportional to slope. In this bowl the <Formula tex="\theta_2" /> direction is 20×
          steeper, so any learning rate big enough to make progress along the valley floor is big
          enough to bounce between the walls. Watch the blue path: zigzag across the ravine, crawl
          along it. Real loss surfaces are like this in millions of dimensions at once — some
          parameters steep, some shallow.
        </p>
      </Explain>

      <Explain title="2 · Momentum: remember where you were going">
        <p>
          Momentum keeps a running velocity instead of reacting to each gradient in isolation:
        </p>
        <Formula block tex="\mathbf{v} \leftarrow \beta\,\mathbf{v} - \alpha \nabla L, \qquad \theta \leftarrow \theta + \mathbf{v}" />
        <p>
          The zigzag components point in alternating directions, so they cancel inside{" "}
          <Formula tex="\mathbf{v}" />; the valley-floor component always points the same way, so it{" "}
          <em>accumulates</em> — up to a factor <Formula tex="1/(1-\beta)" /> ≈ 10× at β = 0.9.
          The orange path overshoots and swings like a ball with inertia (set β = 0.99 to
          exaggerate), but it covers the flat direction far faster.
        </p>
      </Explain>

      <Explain title="3 · Adam: a personal learning rate for every parameter">
        <p>
          Adam keeps two running averages per parameter — the mean of gradients{" "}
          <Formula tex="\hat{m}" /> (momentum) and the mean of <em>squared</em> gradients{" "}
          <Formula tex="\hat{v}" /> (scale) — and divides one by the other:
        </p>
        <Formula block tex="\theta \leftarrow \theta - \alpha\, \frac{\hat{m}}{\sqrt{\hat{v}} + \epsilon}" />
        <p>
          Dividing by <Formula tex="\sqrt{\hat{v}}" /> normalizes every direction to roughly
          unit-sized steps: steep axes get damped, shallow axes get amplified. The green path heads
          almost straight for the minimum, nearly indifferent to the ravine's shape — and to your
          learning-rate choice, which is why Adam became the default. The trade: those step sizes no
          longer follow the true gradient geometry, which is why plain SGD + momentum, carefully
          tuned, still sometimes generalizes better.
        </p>
      </Explain>
      <Optimizers3D />
    </div>
  );
}
