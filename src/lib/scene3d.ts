/**
 * Minimal 3D engine for the topic scenes: orbit camera, perspective
 * projection, painter's-algorithm depth sort, Lambert-shaded quads.
 * Canvas 2D only; no dependencies.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface View {
  /** World point -> [screenX, screenY, depth]. Larger depth = farther. */
  project(p: Vec3): [number, number, number];
  width: number;
  height: number;
  /** Schedule another frame (for self-driven animations inside draw). */
  requestRender(): void;
}

interface OrbitOptions {
  yaw?: number;
  pitch?: number;
  dist?: number;
  persp?: number;
  /** Shift the world up (+) or down (-) on screen, in world units. */
  zShift?: number;
  autoRotate?: boolean;
  minDist?: number;
  maxDist?: number;
}

export class Orbit3D {
  draw: (ctx: CanvasRenderingContext2D, view: View) => void = () => {};
  autoRotate: boolean;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private yaw: number;
  private pitch: number;
  private dist: number;
  private persp: number;
  private zShift: number;
  private minDist: number;
  private maxDist: number;
  private yaw0: number;
  private pitch0: number;
  private dist0: number;
  private target: Vec3 = { x: 0, y: 0, z: 0 };
  private needs = true;
  private dragging = false;
  private mode: "rotate" | "pan" = "rotate";
  private lastX = 0;
  private lastY = 0;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private pinchCx = 0;
  private pinchCy = 0;
  private raf = 0;
  private disposed = false;
  private ro: ResizeObserver;
  private ac = new AbortController();

  constructor(canvas: HTMLCanvasElement, opts: OrbitOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.yaw = this.yaw0 = opts.yaw ?? 0.72;
    this.pitch = this.pitch0 = opts.pitch ?? 0.5;
    this.dist = this.dist0 = opts.dist ?? 10;
    this.persp = opts.persp ?? 1.45;
    this.zShift = opts.zShift ?? 0;
    this.autoRotate = opts.autoRotate ?? false;
    this.minDist = opts.minDist ?? this.dist0 * 0.4;
    this.maxDist = opts.maxDist ?? this.dist0 * 2.4;

    const { signal } = this.ac;
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.autoRotate = false;
        canvas.setPointerCapture(e.pointerId);
        if (this.pointers.size === 1) {
          this.dragging = true;
          this.mode = e.shiftKey || e.button === 1 || e.button === 2 ? "pan" : "rotate";
          this.lastX = e.clientX;
          this.lastY = e.clientY;
        } else if (this.pointers.size === 2) {
          this.dragging = false;
          const [a, b] = [...this.pointers.values()];
          this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
          this.pinchCx = (a.x + b.x) / 2;
          this.pinchCy = (a.y + b.y) / 2;
        }
      },
      { signal }
    );
    canvas.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });
    canvas.addEventListener(
      "pointermove",
      (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size >= 2) {
          // two fingers: pinch to zoom, move together to pan
          const [a, b] = [...this.pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (this.pinchDist > 0 && d > 0) this.zoomBy(this.pinchDist / d);
          this.pinchDist = d;
          const cx = (a.x + b.x) / 2;
          const cy = (a.y + b.y) / 2;
          this.pan(cx - this.pinchCx, cy - this.pinchCy);
          this.pinchCx = cx;
          this.pinchCy = cy;
          return;
        }
        if (!this.dragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        if (this.mode === "pan") {
          this.pan(dx, dy);
          return;
        }
        this.yaw -= dx * 0.008;
        // full range: straight-down top view to straight-up bottom view
        this.pitch = Math.min(1.57, Math.max(-1.57, this.pitch + dy * 0.006));
        this.needs = true;
      },
      { signal }
    );
    const release = (e: PointerEvent) => {
      this.pointers.delete(e.pointerId);
      this.pinchDist = 0;
      if (this.pointers.size === 0) this.dragging = false;
    };
    canvas.addEventListener("pointerup", release, { signal });
    canvas.addEventListener("pointercancel", release, { signal });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.autoRotate = false;
        this.zoomBy(Math.exp(e.deltaY * 0.0014));
      },
      { signal, passive: false }
    );

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();

    const tick = () => {
      if (this.disposed) return;
      this.raf = requestAnimationFrame(tick);
      if (this.autoRotate && !this.dragging) {
        this.yaw += 0.0032;
        this.needs = true;
      }
      if (this.needs) {
        this.needs = false;
        this.render();
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  requestRender() {
    this.needs = true;
  }

  zoomBy(factor: number) {
    this.dist = Math.min(this.maxDist, Math.max(this.minDist, this.dist * factor));
    this.needs = true;
  }

  /** Slide the orbit target along the screen axes (screen-pixel deltas). */
  pan(dx: number, dy: number) {
    const h = this.canvas.clientHeight || 1;
    const s = this.dist / (this.persp * h);
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    // world directions of screen-right and screen-up
    const rt: Vec3 = { x: cy, y: -sy, z: 0 };
    const up: Vec3 = { x: -sy * sp, y: -cy * sp, z: cp };
    this.target.x -= (rt.x * dx - up.x * dy) * s;
    this.target.y -= (rt.y * dx - up.y * dy) * s;
    this.target.z -= (rt.z * dx - up.z * dy) * s;
    const r = Math.hypot(this.target.x, this.target.y, this.target.z);
    if (r > 5) {
      const f = 5 / r;
      this.target.x *= f;
      this.target.y *= f;
      this.target.z *= f;
    }
    this.needs = true;
  }

  resetView() {
    this.yaw = this.yaw0;
    this.pitch = this.pitch0;
    this.dist = this.dist0;
    this.target = { x: 0, y: 0, z: 0 };
    this.needs = true;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.ac.abort();
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.needs = true;
  }

  private render() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const { dist, persp, zShift } = this;
    const t = this.target;

    const view: View = {
      width: w,
      height: h,
      requestRender: () => this.requestRender(),
      project(p: Vec3): [number, number, number] {
        const wx = p.x - t.x;
        const wy = p.y - t.y;
        const wz = p.z - t.z;
        const x1 = wx * cy - wy * sy;
        const y1 = wx * sy + wy * cy;
        const z1 = wz + zShift;
        const d = y1 * cp + z1 * sp + dist;
        const zu = -y1 * sp + z1 * cp;
        const s = (persp * h) / Math.max(d, 0.1);
        return [w / 2 + x1 * s, h / 2 - zu * s, d];
      },
    };
    this.draw(ctx, view);
  }
}

/* ---------- math helpers ---------- */

export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / n, y: v.y / n, z: v.z / n };
}

const LIGHT = normalize({ x: -0.45, y: 0.5, z: 0.74 });

/** Two-sided Lambert term in [0, 1] for the triangle a-b-c. */
export function lambert(a: Vec3, b: Vec3, c: Vec3): number {
  const n = normalize(cross(sub(b, a), sub(c, a)));
  return Math.abs(n.x * LIGHT.x + n.y * LIGHT.y + n.z * LIGHT.z);
}

/* ---------- painting ---------- */

export interface Prim {
  d: number;
  paint(ctx: CanvasRenderingContext2D): void;
}

export function paintSorted(ctx: CanvasRenderingContext2D, prims: Prim[]) {
  prims.sort((a, b) => b.d - a.d);
  for (const p of prims) p.paint(ctx);
}

export function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixColor(a: string, b: string, t: number, alpha = 1): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return alpha < 1 ? `rgba(${r},${g},${bl},${alpha})` : `rgb(${r},${g},${bl})`;
}

/** Quad primitive with Lambert shading between two colors by height. */
export function quadPrim(
  view: View,
  pts: [Vec3, Vec3, Vec3, Vec3],
  fill: string,
  stroke?: string,
  alpha = 1
): Prim {
  const proj = pts.map((p) => view.project(p));
  const d = (proj[0][2] + proj[1][2] + proj[2][2] + proj[3][2]) / 4;
  return {
    d,
    paint(ctx) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(proj[0][0], proj[0][1]);
      for (let i = 1; i < 4; i++) ctx.lineTo(proj[i][0], proj[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

/** Faint square grid on the z=0 floor. */
export function floorGrid(view: View, half: number, step: number, color = "#e4e8ee"): Prim[] {
  const prims: Prim[] = [];
  for (let v = -half; v <= half + 1e-9; v += step) {
    for (const horiz of [true, false]) {
      const a: Vec3 = horiz ? { x: -half, y: v, z: 0 } : { x: v, y: -half, z: 0 };
      const b: Vec3 = horiz ? { x: half, y: v, z: 0 } : { x: v, y: half, z: 0 };
      const pa = view.project(a);
      const pb = view.project(b);
      prims.push({
        d: Math.max(pa[2], pb[2]) + 50, // bias far so content always paints on top
        paint(ctx) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pa[0], pa[1]);
          ctx.lineTo(pb[0], pb[1]);
          ctx.stroke();
        },
      });
    }
  }
  return prims;
}

/** Data point rendered as a flat disc with white rim (matches 2D plots). */
export function ballPrim(view: View, p: Vec3, r: number, fill: string, depthBias = 0): Prim {
  const [sx, sy, d] = view.project(p);
  const s = (view.height * 1.45) / Math.max(d, 0.1);
  const rad = Math.max(1.5, r * s * 0.02);
  return {
    d: d + depthBias,
    paint(ctx) {
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.4;
      ctx.stroke();
    },
  };
}

/** Polyline through world points. */
export function linePrim(
  view: View,
  pts: Vec3[],
  color: string,
  width: number,
  alpha = 1,
  depthBias = 0
): Prim {
  const proj = pts.map((p) => view.project(p));
  const d = proj.reduce((s, p) => s + p[2], 0) / Math.max(proj.length, 1);
  return {
    d: d + depthBias,
    paint(ctx) {
      if (proj.length < 2) return;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(proj[0][0], proj[0][1]);
      for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i][0], proj[i][1]);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}
