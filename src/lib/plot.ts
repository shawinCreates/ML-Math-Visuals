export interface PlotConfig {
  width: number;
  height: number;
  margin: number;
  xDomain: [number, number];
  yDomain: [number, number];
}

export interface Scale extends PlotConfig {
  sx(x: number): number;
  sy(y: number): number;
  dx(px: number): number;
  dy(py: number): number;
  innerLeft: number;
  innerRight: number;
  innerTop: number;
  innerBottom: number;
}

export function makeScale(cfg: PlotConfig): Scale {
  const { width, height, margin, xDomain, yDomain } = cfg;
  const innerLeft = margin;
  const innerRight = width - margin;
  const innerTop = margin;
  const innerBottom = height - margin;
  const xr = xDomain[1] - xDomain[0] || 1;
  const yr = yDomain[1] - yDomain[0] || 1;
  return {
    ...cfg,
    innerLeft,
    innerRight,
    innerTop,
    innerBottom,
    sx: (x) => innerLeft + ((x - xDomain[0]) / xr) * (innerRight - innerLeft),
    sy: (y) => innerBottom - ((y - yDomain[0]) / yr) * (innerBottom - innerTop),
    dx: (px) => xDomain[0] + ((px - innerLeft) / (innerRight - innerLeft)) * xr,
    dy: (py) => yDomain[0] + ((innerBottom - py) / (innerBottom - innerTop)) * yr,
  };
}

export function ticks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const step = span / count;
  const mag = 10 ** Math.floor(Math.log10(step));
  const norm = step / mag;
  const nice = norm >= 5 ? 5 : norm >= 2 ? 2 : 1;
  const s = nice * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / s) * s; v <= max + 1e-9; v += s) {
    out.push(Math.round(v * 1e6) / 1e6);
  }
  return out;
}

export const CLASS_COLORS = ["#4f7df9", "#f97316", "#10b981", "#e0509a", "#8b5cf6", "#eab308"];
export const CLASS_COLORS_SOFT = ["#dbe5fe", "#fde8d4", "#d1f5e6", "#fadbe9", "#e9defc", "#faf0c8"];
