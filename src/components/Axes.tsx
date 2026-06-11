import { Scale, ticks } from "../lib/plot";

export function Axes({ scale, xLabel, yLabel }: { scale: Scale; xLabel?: string; yLabel?: string }) {
  const xt = ticks(scale.xDomain[0], scale.xDomain[1]);
  const yt = ticks(scale.yDomain[0], scale.yDomain[1]);
  return (
    <g className="axes">
      {xt.map((t) => (
        <g key={"x" + t}>
          <line
            x1={scale.sx(t)}
            y1={scale.innerTop}
            x2={scale.sx(t)}
            y2={scale.innerBottom}
            stroke="var(--grid)"
          />
          <text x={scale.sx(t)} y={scale.innerBottom + 16} textAnchor="middle" className="tick-label">
            {t}
          </text>
        </g>
      ))}
      {yt.map((t) => (
        <g key={"y" + t}>
          <line
            x1={scale.innerLeft}
            y1={scale.sy(t)}
            x2={scale.innerRight}
            y2={scale.sy(t)}
            stroke="var(--grid)"
          />
          <text
            x={scale.innerLeft - 8}
            y={scale.sy(t) + 4}
            textAnchor="end"
            className="tick-label"
          >
            {t}
          </text>
        </g>
      ))}
      <rect
        x={scale.innerLeft}
        y={scale.innerTop}
        width={scale.innerRight - scale.innerLeft}
        height={scale.innerBottom - scale.innerTop}
        fill="none"
        stroke="var(--border-strong)"
      />
      {xLabel && (
        <text x={(scale.innerLeft + scale.innerRight) / 2} y={scale.height - 4} textAnchor="middle" className="axis-label">
          {xLabel}
        </text>
      )}
      {yLabel && (
        <text
          x={12}
          y={(scale.innerTop + scale.innerBottom) / 2}
          textAnchor="middle"
          className="axis-label"
          transform={`rotate(-90 12 ${(scale.innerTop + scale.innerBottom) / 2})`}
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}
