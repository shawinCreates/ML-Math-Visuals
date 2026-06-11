import { useMemo, useState } from "react";
import { formatNum } from "../lib/math";
import { makeScale } from "../lib/plot";
import { Axes } from "../components/Axes";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { Explain, Hint, Stat } from "../components/Explain";

const T_MAX = 40;
const hScale = makeScale({ width: 560, height: 260, margin: 40, xDomain: [0, T_MAX], yDomain: [-1.2, 1.2] });
const gScale = makeScale({ width: 560, height: 260, margin: 40, xDomain: [0, T_MAX], yDomain: [-12, 4] }); // log10 gradient

export function RNN() {
  const [w, setW] = useState(0.8);
  const [T, setT] = useState(30);
  const [pulse, setPulse] = useState(1.5);
  const [pulseAt, setPulseAt] = useState(3);

  const sim = useMemo(() => {
    // x is a single impulse; h_t = tanh(w h_{t-1} + x_t)
    const h: number[] = [0];
    for (let t = 1; t <= T; t++) {
      const x = t === pulseAt ? pulse : 0;
      h.push(Math.tanh(w * h[t - 1] + x));
    }
    // ∂h_T/∂h_t = Π_{s=t+1..T} w · (1 − h_s²)  — computed backwards
    const grad: number[] = new Array(T + 1).fill(0);
    grad[T] = 1;
    for (let t = T - 1; t >= 0; t--) {
      grad[t] = grad[t + 1] * w * (1 - h[t + 1] * h[t + 1]);
    }
    return { h, grad };
  }, [w, T, pulse, pulseAt]);

  const pathH = sim.h
    .map((v, t) => `${t === 0 ? "M" : "L"}${hScale.sx(t).toFixed(1)},${hScale.sy(v).toFixed(1)}`)
    .join("");

  const pathG = sim.grad
    .map((v, t) => {
      const lg = Math.max(-12, Math.min(4, Math.log10(Math.abs(v) + 1e-300)));
      return `${t === 0 ? "M" : "L"}${gScale.sx(t).toFixed(1)},${gScale.sy(lg).toFixed(1)}`;
    })
    .join("");

  const longRange = Math.abs(sim.grad[pulseAt]);
  const regime = Math.abs(w) < 1 ? "vanishing" : Math.abs(w) > 1.05 ? "exploding (until tanh saturates)" : "borderline";

  return (
    <div>
      <Hint>
        One neuron reading a sequence: the same weight <strong>w</strong> applied at every step. An
        input pulse arrives early — the question is whether the network can still <em>learn from
        it</em> many steps later. Watch the bottom plot's slope as you move w through 1.
      </Hint>

      <div className="viz-row">
        <div>
          <div className="loss-chart-title" style={{ marginBottom: 4 }}>Hidden state h(t) — the network's memory</div>
          <svg viewBox={`0 0 ${hScale.width} ${hScale.height}`} className="viz-svg" style={{ cursor: "default" }}>
            <Axes scale={hScale} xLabel="time step t" yLabel="h" />
            <line x1={hScale.innerLeft} y1={hScale.sy(0)} x2={hScale.innerRight} y2={hScale.sy(0)} stroke="var(--border-strong)" />
            <line x1={hScale.sx(pulseAt)} y1={hScale.innerTop} x2={hScale.sx(pulseAt)} y2={hScale.innerBottom} stroke="var(--success)" strokeDasharray="4 3" />
            <text x={hScale.sx(pulseAt) + 4} y={hScale.innerTop + 14} className="tick-label" fill="var(--success)">input pulse</text>
            <path d={pathH} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
            {sim.h.map((v, t) => (
              <circle key={t} cx={hScale.sx(t)} cy={hScale.sy(v)} r={2.5} fill="var(--accent)" />
            ))}
          </svg>

          <div className="loss-chart-title" style={{ margin: "10px 0 4px" }}>
            Gradient reaching back through time: log₁₀ |∂h_T / ∂h_t|
          </div>
          <svg viewBox={`0 0 ${gScale.width} ${gScale.height}`} className="viz-svg" style={{ cursor: "default" }}>
            <Axes scale={gScale} xLabel="time step t" yLabel="log₁₀ |grad|" />
            <line x1={gScale.innerLeft} y1={gScale.sy(0)} x2={gScale.innerRight} y2={gScale.sy(0)} stroke="var(--border-strong)" strokeDasharray="3 3" />
            <text x={gScale.innerRight - 4} y={gScale.sy(0) - 5} className="tick-label" textAnchor="end">gradient = 1</text>
            <line x1={gScale.sx(pulseAt)} y1={gScale.innerTop} x2={gScale.sx(pulseAt)} y2={gScale.innerBottom} stroke="var(--success)" strokeDasharray="4 3" />
            <path d={pathG} fill="none" stroke="var(--danger)" strokeWidth={2.5} />
          </svg>
        </div>

        <div className="viz-side">
          <Slider label="recurrent weight w" value={w} min={0} max={2} step={0.01} onChange={setW} format={(v) => formatNum(v)} />
          <Slider label="sequence length T" value={T} min={10} max={T_MAX} step={1} onChange={setT} />
          <Slider label="pulse strength" value={pulse} min={-3} max={3} step={0.1} onChange={setPulse} format={(v) => formatNum(v, 1)} />
          <Slider label="pulse at step" value={pulseAt} min={1} max={15} step={1} onChange={setPulseAt} />

          <div className="stat-grid">
            <Stat label="regime" value={regime} />
            <Stat label="|∂h_T/∂h_pulse|" value={longRange < 1e-12 ? "≈ 0" : longRange.toExponential(1)} />
            <Stat label="per-step factor ≈" value={formatNum(w, 2) + " · (1−h²)"} />
            <Stat label="steps to cross" value={T - pulseAt} />
          </div>

          <div className="callout">
            The recurrence: <Formula tex="h_t = \tanh(w\, h_{t-1} + x_t)" />. Learning “the pulse
            mattered” requires gradient to travel from the loss at t = {T} back to t = {pulseAt} —
            multiplied by <Formula tex="w \cdot (1 - h_t^2)" /> at <em>every</em> step in between.
          </div>
        </div>
      </div>

      <Explain title="1 · Weight sharing is the soul of an RNN">
        <p>
          A feed-forward network gets fresh weights per layer; an RNN applies the <em>same</em>{" "}
          <Formula tex="w" /> at every time step, mixing each new input into a running hidden state.
          That's what lets one small network read sequences of any length — and it's also the trap:
          unrolled over <Formula tex="T" /> steps, the network is effectively <Formula tex="T" />{" "}
          layers deep <em>with tied weights</em>, so the same number multiplies itself over and
          over.
        </p>
      </Explain>

      <Explain title="2 · The product that giveth and taketh away">
        <p>By the chain rule, the gradient connecting time t to the end is a product:</p>
        <Formula block tex="\frac{\partial h_T}{\partial h_t} = \prod_{s = t+1}^{T} w \cdot \big(1 - h_s^2\big)" />
        <p>
          Each factor is roughly <Formula tex="w" /> (times tanh's slope ≤ 1). With{" "}
          <Formula tex="w = 0.8" /> and 27 steps: <Formula tex="0.8^{27} \approx 0.002" /> — the
          bottom plot is a straight line downhill on the log scale, and the long-range gradient is
          numerically dead. The network <em>cannot learn</em> that the early pulse mattered, even
          though the pulse is right there in the data. Push <Formula tex="w" /> above 1 and the line
          tilts uphill — exploding gradients — until tanh saturation (the{" "}
          <Formula tex="1 - h^2" /> factor) clips it back.
        </p>
      </Explain>

      <Explain title="3 · Why LSTMs, and why attention">
        <p>
          Notice there's no good value of <Formula tex="w" />: below 1 forgets, above 1 explodes,
          and exactly 1 is a knife's edge that training won't stay on. LSTMs and GRUs solve this
          structurally — a gated cell state updated <em>additively</em> (
          <Formula tex="c_t = f_t \odot c_{t-1} + i_t \odot \tilde{c}_t" />), so gradient flows
          through a sum, not a long product. Transformers go further and abolish the recurrence
          entirely: attention connects step 3 to step 30 <em>directly</em>, making the gradient path
          one hop long. The next two modules build up to that.
        </p>
      </Explain>
    </div>
  );
}
