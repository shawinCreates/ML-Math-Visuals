import { LabeledPoint } from "./math";

export type Criterion = "gini" | "entropy";

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TreeNode {
  depth: number;
  rect: Rect;
  n: number;
  counts: number[];
  impurity: number;
  prediction: number;
  // internal nodes only
  feature?: 0 | 1; // 0 → x, 1 → y
  threshold?: number;
  gain?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export function impurityOf(counts: number[], n: number, criterion: Criterion): number {
  if (n === 0) return 0;
  let v = criterion === "gini" ? 1 : 0;
  for (const c of counts) {
    if (c === 0) continue;
    const p = c / n;
    if (criterion === "gini") v -= p * p;
    else v -= p * Math.log2(p);
  }
  return v;
}

function countLabels(pts: LabeledPoint[], nClasses: number): number[] {
  const counts = new Array(nClasses).fill(0);
  for (const p of pts) counts[p.label]++;
  return counts;
}

function featureVal(p: LabeledPoint, f: 0 | 1): number {
  return f === 0 ? p.x : p.y;
}

export interface SplitResult {
  feature: 0 | 1;
  threshold: number;
  gain: number;
}

/** Scan all candidate splits of one feature; returns gain at each threshold (for plotting). */
export function gainCurve(
  pts: LabeledPoint[],
  feature: 0 | 1,
  nClasses: number,
  criterion: Criterion,
): { threshold: number; gain: number }[] {
  const sorted = [...pts].sort((a, b) => featureVal(a, feature) - featureVal(b, feature));
  const n = sorted.length;
  if (n < 2) return [];
  const total = countLabels(sorted, nClasses);
  const base = impurityOf(total, n, criterion);
  const leftCounts = new Array(nClasses).fill(0);
  const out: { threshold: number; gain: number }[] = [];
  for (let i = 0; i < n - 1; i++) {
    leftCounts[sorted[i].label]++;
    const a = featureVal(sorted[i], feature);
    const b = featureVal(sorted[i + 1], feature);
    if (b - a < 1e-9) continue;
    const nl = i + 1;
    const nr = n - nl;
    const rightCounts = total.map((t, c) => t - leftCounts[c]);
    const gain =
      base -
      (nl / n) * impurityOf(leftCounts, nl, criterion) -
      (nr / n) * impurityOf(rightCounts, nr, criterion);
    out.push({ threshold: (a + b) / 2, gain });
  }
  return out;
}

export function bestSplit(
  pts: LabeledPoint[],
  nClasses: number,
  criterion: Criterion,
  features: (0 | 1)[] = [0, 1],
): SplitResult | null {
  let best: SplitResult | null = null;
  for (const f of features) {
    for (const { threshold, gain } of gainCurve(pts, f, nClasses, criterion)) {
      if (!best || gain > best.gain) best = { feature: f, threshold, gain };
    }
  }
  return best && best.gain > 1e-9 ? best : null;
}

export interface TreeOptions {
  maxDepth: number;
  minSamplesLeaf: number;
  nClasses: number;
  criterion: Criterion;
  rect: Rect;
  /** Called per node; lets random forests sample a feature subset per split. */
  pickFeatures?: () => (0 | 1)[];
}

export function buildTree(pts: LabeledPoint[], opts: TreeOptions, depth = 0, rect?: Rect): TreeNode {
  const r = rect ?? opts.rect;
  const counts = countLabels(pts, opts.nClasses);
  const n = pts.length;
  let prediction = 0;
  counts.forEach((c, i) => {
    if (c > counts[prediction]) prediction = i;
  });
  const node: TreeNode = {
    depth,
    rect: r,
    n,
    counts,
    impurity: impurityOf(counts, n, opts.criterion),
    prediction,
  };
  if (depth >= opts.maxDepth || n < 2 * opts.minSamplesLeaf || node.impurity === 0) return node;

  const feats = opts.pickFeatures ? opts.pickFeatures() : ([0, 1] as (0 | 1)[]);
  const split = bestSplit(pts, opts.nClasses, opts.criterion, feats);
  if (!split) return node;

  const leftPts = pts.filter((p) => featureVal(p, split.feature) <= split.threshold);
  const rightPts = pts.filter((p) => featureVal(p, split.feature) > split.threshold);
  if (leftPts.length < opts.minSamplesLeaf || rightPts.length < opts.minSamplesLeaf) return node;

  node.feature = split.feature;
  node.threshold = split.threshold;
  node.gain = split.gain;
  const [lr, rr]: [Rect, Rect] =
    split.feature === 0
      ? [
          { ...r, x1: split.threshold },
          { ...r, x0: split.threshold },
        ]
      : [
          { ...r, y1: split.threshold },
          { ...r, y0: split.threshold },
        ];
  node.left = buildTree(leftPts, opts, depth + 1, lr);
  node.right = buildTree(rightPts, opts, depth + 1, rr);
  return node;
}

export function predictTree(node: TreeNode, x: number, y: number): number {
  let cur = node;
  while (cur.left && cur.right && cur.feature !== undefined && cur.threshold !== undefined) {
    cur = (cur.feature === 0 ? x : y) <= cur.threshold ? cur.left : cur.right;
  }
  return cur.prediction;
}

export function collectLeaves(node: TreeNode): TreeNode[] {
  if (!node.left || !node.right) return [node];
  return [...collectLeaves(node.left), ...collectLeaves(node.right)];
}

export function treeDepth(node: TreeNode): number {
  if (!node.left || !node.right) return node.depth;
  return Math.max(treeDepth(node.left), treeDepth(node.right));
}

export function countLeaves(node: TreeNode): number {
  return collectLeaves(node).length;
}
