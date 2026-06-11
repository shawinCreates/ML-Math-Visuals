export interface Point {
  x: number;
  y: number;
}

export interface LabeledPoint extends Point {
  label: number;
}

/** Standard normal sample (Box-Muller). */
export function randn(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Mean squared error of points against a prediction function. */
export function mse(points: Point[], f: (x: number) => number): number {
  if (points.length === 0) return 0;
  return mean(points.map((p) => (p.y - f(p.x)) ** 2));
}

/** Ordinary least squares fit y = m x + c. */
export function olsFit(points: Point[]): { m: number; c: number } {
  const n = points.length;
  if (n < 2) return { m: 0, c: n === 1 ? points[0].y : 0 };
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return { m: 0, c: my };
  const m = num / den;
  return { m, c: my - m * mx };
}

/** Solve A x = b with Gaussian elimination + partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) continue;
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) sum -= M[r][c] * x[c];
    x[r] = Math.abs(M[r][r]) < 1e-12 ? 0 : sum / M[r][r];
  }
  return x;
}

/**
 * Polynomial least squares via the normal equations (XᵀX)β = Xᵀy.
 * Returns coefficients [β₀, β₁, …] for y = Σ βᵢ xⁱ. A tiny ridge term
 * keeps XᵀX invertible when points are degenerate.
 */
export function polyFit(points: Point[], degree: number): number[] {
  const n = degree + 1;
  const XtX: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  const Xty: number[] = new Array(n).fill(0);
  for (const p of points) {
    const powers: number[] = [];
    let v = 1;
    for (let i = 0; i < n; i++) {
      powers.push(v);
      v *= p.x;
    }
    for (let i = 0; i < n; i++) {
      Xty[i] += powers[i] * p.y;
      for (let j = 0; j < n; j++) XtX[i][j] += powers[i] * powers[j];
    }
  }
  for (let i = 0; i < n; i++) XtX[i][i] += 1e-9;
  return solveLinear(XtX, Xty);
}

export function evalPoly(coeffs: number[], x: number): number {
  let v = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) v = v * x + coeffs[i];
  return v;
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export interface Eigen2 {
  /** Eigenvalues sorted descending. */
  values: [number, number];
  /** Unit eigenvectors, vectors[i] pairs with values[i]. */
  vectors: [[number, number], [number, number]];
}

/** Eigen decomposition of a symmetric 2x2 matrix [[a, b], [b, c]]. */
export function eigen2x2(a: number, b: number, c: number): Eigen2 {
  const tr = a + c;
  const det = a * c - b * b;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc;
  const l2 = tr / 2 - disc;
  let v1: [number, number];
  if (Math.abs(b) > 1e-12) {
    v1 = [l1 - c, b];
  } else {
    v1 = a >= c ? [1, 0] : [0, 1];
  }
  const norm = Math.hypot(v1[0], v1[1]) || 1;
  v1 = [v1[0] / norm, v1[1] / norm];
  const v2: [number, number] = [-v1[1], v1[0]];
  return { values: [l1, l2], vectors: [v1, v2] };
}

/** Covariance matrix entries of a 2D point cloud (population covariance). */
export function covariance2(points: Point[]): { mx: number; my: number; sxx: number; sxy: number; syy: number } {
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  const n = Math.max(1, points.length);
  return { mx, my, sxx: sxx / n, sxy: sxy / n, syy: syy / n };
}

export function formatNum(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}
