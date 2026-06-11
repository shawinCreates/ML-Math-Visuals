import { useMemo, useRef, useState } from "react";
import { formatNum } from "../lib/math";
import { Slider } from "../components/Slider";
import { Formula } from "../components/Formula";
import { useTicker } from "../components/useTicker";
import { LossChart } from "../components/LossChart";
import { Explain, Hint, Stat } from "../components/Explain";

const COLS = 6;
const ROWS = 5;
const START = { r: 4, c: 0 };
const GOAL = { r: 0, c: 5 };
const PIT = { r: 2, c: 3 };
const STEP_REWARD = -0.04;
const CELL = 84;
const W = COLS * CELL;
const H = ROWS * CELL;

// actions: 0 up, 1 right, 2 down, 3 left
const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];
const ARROWS = ["↑", "→", "↓", "←"];

type QTable = number[][][]; // [r][c][action]

function freshQ(): QTable {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [0, 0, 0, 0]));
}

const isGoal = (r: number, c: number) => r === GOAL.r && c === GOAL.c;
const isPit = (r: number, c: number) => r === PIT.r && c === PIT.c;

export function ReinforcementLearning() {
  const [walls, setWalls] = useState<boolean[][]>(() => {
    const w = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
    w[1][1] = w[2][1] = w[3][3] = true;
    return w;
  });
  const [alpha, setAlpha] = useState(0.3);
  const [gamma, setGamma] = useState(0.9);
  const [eps, setEps] = useState(0.2);
  const [agent, setAgent] = useState(START);
  const [episodes, setEpisodes] = useState(0);
  const [returns, setReturns] = useState<number[]>([]);
  const [, setVersion] = useState(0);
  const qRef = useRef<QTable>(freshQ());
  const epReturn = useRef(0);
  const stepsThisEp = useRef(0);

  function doStep(state: { r: number; c: number }): { r: number; c: number } {
    const Q = qRef.current;
    const { r, c } = state;
    // ε-greedy action
    let a: number;
    if (Math.random() < eps) {
      a = Math.floor(Math.random() * 4);
    } else {
      const qs = Q[r][c];
      a = qs.indexOf(Math.max(...qs));
    }
    let nr = r + DR[a];
    let nc = c + DC[a];
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || walls[nr][nc]) {
      nr = r;
      nc = c;
    }
    const terminal = isGoal(nr, nc) || isPit(nr, nc);
    const reward = isGoal(nr, nc) ? 1 : isPit(nr, nc) ? -1 : STEP_REWARD;
    const target = terminal ? reward : reward + gamma * Math.max(...Q[nr][nc]);
    Q[r][c][a] += alpha * (target - Q[r][c][a]);
    epReturn.current += reward;
    stepsThisEp.current++;
    if (terminal || stepsThisEp.current > 200) {
      setEpisodes((e) => e + 1);
      setReturns((h) => [...h.slice(-199), epReturn.current]);
      epReturn.current = 0;
      stepsThisEp.current = 0;
      return START;
    }
    return { r: nr, c: nc };
  }

  const ticker = useTicker(() => {
    setAgent((s) => {
      let cur = s;
      for (let i = 0; i < 3; i++) cur = doStep(cur);
      return cur;
    });
    setVersion((v) => v + 1);
    return true;
  });

  function runEpisodes(n: number) {
    ticker.setRunning(false);
    let cur = { ...START };
    epReturn.current = 0;
    stepsThisEp.current = 0;
    let done = 0;
    let guard = 0;
    while (done < n && guard < n * 400) {
      cur = doStep(cur);
      // doStep zeroes the step counter exactly when an episode just ended
      if (stepsThisEp.current === 0) done++;
      guard++;
    }
    setAgent(START);
    setVersion((v) => v + 1);
  }

  function reset() {
    ticker.setRunning(false);
    qRef.current = freshQ();
    setAgent(START);
    setEpisodes(0);
    setReturns([]);
    epReturn.current = 0;
    stepsThisEp.current = 0;
    setVersion((v) => v + 1);
  }

  function toggleWall(r: number, c: number) {
    if (isGoal(r, c) || isPit(r, c) || (r === START.r && c === START.c)) return;
    setWalls(walls.map((row, ri) => (ri === r ? row.map((v, ci) => (ci === c ? !v : v)) : row)));
    setAgent(START);
  }

  const maxAbsQ = useMemo(() => {
    return Math.max(0.1, ...qRef.current.flat(2).map((v) => Math.abs(v)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodes, agent]);

  const Q = qRef.current;

  return (
    <div>
      <Hint>
        The robot knows nothing — no map, no goal location. It only ever sees its square, picks a
        move, and feels the reward. Train it and watch value seep backwards from the goal, square by
        square. Click cells to add/remove walls.
      </Hint>

      <div className="viz-row">
        <svg viewBox={`0 0 ${W} ${H}`} className="viz-svg" style={{ cursor: "pointer" }}>
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const best = Math.max(...Q[r][c]);
              const fill = walls[r][c]
                ? "var(--ink)"
                : isGoal(r, c)
                  ? "rgba(20, 160, 109, 0.85)"
                  : isPit(r, c)
                    ? "rgba(224, 80, 107, 0.85)"
                    : best > 0
                      ? `rgba(20, 160, 109, ${Math.min(0.65, (best / maxAbsQ) * 0.65)})`
                      : best < 0
                        ? `rgba(224, 80, 107, ${Math.min(0.65, (-best / maxAbsQ) * 0.65)})`
                        : "var(--grid)";
              const bestA = Q[r][c].indexOf(Math.max(...Q[r][c]));
              const showArrow = !walls[r][c] && !isGoal(r, c) && !isPit(r, c) && Q[r][c].some((v) => v !== 0);
              return (
                <g key={r + "-" + c} onClick={() => toggleWall(r, c)}>
                  <rect x={c * CELL + 2} y={r * CELL + 2} width={CELL - 4} height={CELL - 4} rx={8} fill={fill} stroke="var(--border)" />
                  {isGoal(r, c) && <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 7} textAnchor="middle" style={{ fontSize: 26 }}>🏆</text>}
                  {isPit(r, c) && <text x={c * CELL + CELL / 2} y={r * CELL + CELL / 2 + 7} textAnchor="middle" style={{ fontSize: 26 }}>🕳️</text>}
                  {showArrow && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + 24} textAnchor="middle" style={{ fontSize: 16, fontWeight: 700, fill: "var(--ink)" }}>
                      {ARROWS[bestA]}
                    </text>
                  )}
                  {!walls[r][c] && !isGoal(r, c) && !isPit(r, c) && (
                    <text x={c * CELL + CELL / 2} y={r * CELL + CELL - 12} textAnchor="middle" style={{ fontSize: 11, fill: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                      {formatNum(Math.max(...Q[r][c]), 2)}
                    </text>
                  )}
                </g>
              );
            }),
          )}
          <circle cx={agent.c * CELL + CELL / 2} cy={agent.r * CELL + CELL / 2} r={14} fill="var(--accent)" stroke="#fff" strokeWidth={3} />
        </svg>

        <div className="viz-side">
          <Slider label="learning rate α" value={alpha} min={0.05} max={1} step={0.05} onChange={setAlpha} format={(v) => formatNum(v)} />
          <Slider label="discount γ" value={gamma} min={0.5} max={0.99} step={0.01} onChange={setGamma} format={(v) => formatNum(v)} />
          <Slider label="exploration ε" value={eps} min={0} max={1} step={0.05} onChange={setEps} format={(v) => formatNum(v)} />

          <div className="stat-grid">
            <Stat label="episodes" value={episodes} />
            <Stat label="last return" value={returns.length > 0 ? formatNum(returns[returns.length - 1], 2) : "—"} />
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={ticker.toggle}>
              {ticker.running ? "Pause" : "Train (watch it wander)"}
            </button>
            <button className="btn" onClick={() => runEpisodes(100)}>+100 episodes (instant)</button>
            <button className="btn" onClick={reset}>Reset Q-table</button>
          </div>

          <LossChart history={returns} label="Return per episode" />

          <div className="callout">
            Cell shading = value of the best action there; the arrow is the current greedy policy;
            the small number is max Q. Each step costs {STEP_REWARD}, the pit −1, the trophy +1.
          </div>
        </div>
      </div>

      <Explain title="1 · No labels — just rewards, and a goal that's far away">
        <p>
          Supervised learning would need someone to label the correct move in every square. RL only
          gets a scalar reward, usually late: +1 at the trophy, −1 in the pit, −0.04 per step (time
          pressure). The agent must figure out which of its many past moves deserve credit for an
          outcome that arrives much later. The score it maximizes is the <em>discounted return</em>:
        </p>
        <Formula block tex="G_t = r_t + \gamma\, r_{t+1} + \gamma^2 r_{t+2} + \cdots" />
        <p>
          where <Formula tex="\gamma < 1" /> makes near rewards worth more than distant ones.
        </p>
      </Explain>

      <Explain title="2 · Q-learning: bootstrapping value backwards">
        <p>
          <Formula tex="Q(s, a)" /> estimates the return from doing action <Formula tex="a" /> in
          square <Formula tex="s" /> and acting greedily afterwards. Every single step updates one
          entry toward a self-consistent target (the Bellman equation, used as a nudge):
        </p>
        <Formula block tex="Q(s, a) \leftarrow Q(s, a) + \alpha\Big[\underbrace{r + \gamma \max_{a'} Q(s', a')}_{\text{better estimate}} - \,Q(s, a)\Big]" />
        <p>
          Train slowly and watch the mechanism: only the square <em>next to</em> the trophy learns
          first (it receives the +1 directly). Then squares two steps away learn from{" "}
          <em>that</em> square's value, and the green stain spreads backwards one bootstrap at a
          time — each cell roughly γ times its successor. The arrows flip as estimates improve,
          eventually tracing a shortest path that detours around the pit.
        </p>
      </Explain>

      <Explain title="3 · The explore / exploit dilemma is the ε slider">
        <p>
          With <Formula tex="\varepsilon = 0" /> the agent always takes its current best action —
          and can lock onto the first path that works, never discovering a shorter one (try it from
          a fresh Q-table: it often rams walls forever, since all-zero Q gives no guidance). With{" "}
          <Formula tex="\varepsilon = 1" /> it never uses what it learned. Train with ε = 0.2, then
          drop ε to 0 and watch the clean greedy run. Now add a wall across its favorite corridor —
          the values it trusted are suddenly wrong, and only exploration can fix them. Scale this
          tiny table up to a neural network estimating Q, and you have DQN, the algorithm that
          learned Atari.
        </p>
      </Explain>
    </div>
  );
}
