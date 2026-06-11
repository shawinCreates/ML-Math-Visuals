import { sigmoid } from "./math";

/**
 * Minimal multilayer perceptron for 2-input binary classification.
 * tanh hidden layers, sigmoid output, binary cross-entropy loss.
 * Weights are mutated in place during training for speed; React components
 * track a version counter to re-render.
 */
export interface MLP {
  sizes: number[]; // e.g. [2, 4, 4, 1]
  W: number[][][]; // W[l][j][i]: layer l, neuron j, input i
  b: number[][];
}

export function createMLP(sizes: number[]): MLP {
  const W: number[][][] = [];
  const b: number[][] = [];
  for (let l = 1; l < sizes.length; l++) {
    const scale = Math.sqrt(1 / sizes[l - 1]);
    W.push(
      Array.from({ length: sizes[l] }, () =>
        Array.from({ length: sizes[l - 1] }, () => (Math.random() * 2 - 1) * scale * 2),
      ),
    );
    b.push(Array.from({ length: sizes[l] }, () => 0));
  }
  return { sizes, W, b };
}

/** Forward pass returning all activations (a[0] is the input). */
export function forward(net: MLP, input: number[]): number[][] {
  const a: number[][] = [input];
  for (let l = 0; l < net.W.length; l++) {
    const prev = a[l];
    const isOut = l === net.W.length - 1;
    const cur = net.W[l].map((row, j) => {
      let z = net.b[l][j];
      for (let i = 0; i < row.length; i++) z += row[i] * prev[i];
      return isOut ? sigmoid(z) : Math.tanh(z);
    });
    a.push(cur);
  }
  return a;
}

export function predict(net: MLP, x: number, y: number): number {
  const a = forward(net, [x, y]);
  return a[a.length - 1][0];
}

export interface Sample {
  x: number;
  y: number;
  label: number;
}

/** One full-batch gradient descent step; returns mean BCE loss before the update. */
export function trainStep(net: MLP, data: Sample[], lr: number): number {
  const L = net.W.length;
  const gW = net.W.map((layer) => layer.map((row) => row.map(() => 0)));
  const gb = net.b.map((layer) => layer.map(() => 0));
  let loss = 0;
  for (const s of data) {
    const a = forward(net, [s.x, s.y]);
    const out = a[L][0];
    const p = Math.min(1 - 1e-7, Math.max(1e-7, out));
    loss += s.label === 1 ? -Math.log(p) : -Math.log(1 - p);
    // output delta for sigmoid + BCE collapses to (p − y)
    let delta = [out - s.label];
    for (let l = L - 1; l >= 0; l--) {
      for (let j = 0; j < net.W[l].length; j++) {
        gb[l][j] += delta[j];
        for (let i = 0; i < net.W[l][j].length; i++) {
          gW[l][j][i] += delta[j] * a[l][i];
        }
      }
      if (l > 0) {
        const prevDelta = new Array(net.sizes[l]).fill(0);
        for (let i = 0; i < net.sizes[l]; i++) {
          let sum = 0;
          for (let j = 0; j < net.W[l].length; j++) sum += net.W[l][j][i] * delta[j];
          prevDelta[i] = sum * (1 - a[l][i] * a[l][i]); // tanh'
        }
        delta = prevDelta;
      }
    }
  }
  const n = Math.max(1, data.length);
  for (let l = 0; l < L; l++) {
    for (let j = 0; j < net.W[l].length; j++) {
      net.b[l][j] -= (lr * gb[l][j]) / n;
      for (let i = 0; i < net.W[l][j].length; i++) {
        net.W[l][j][i] -= (lr * gW[l][j][i]) / n;
      }
    }
  }
  return loss / n;
}
