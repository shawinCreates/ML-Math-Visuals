/** Small line chart of a loss history, drawn on a log-friendly linear scale. */
export function LossChart({ history, label = "Loss" }: { history: number[]; label?: string }) {
  const w = 260;
  const h = 120;
  const pad = 6;
  if (history.length < 2) {
    return (
      <div className="loss-chart">
        <div className="loss-chart-title">{label} over iterations</div>
        <div className="loss-chart-empty">Run training to see the loss curve.</div>
      </div>
    );
  }
  const max = Math.max(...history);
  const min = Math.min(...history);
  const range = max - min || 1;
  const pts = history
    .map((v, i) => {
      const x = pad + (i / (history.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="loss-chart">
      <div className="loss-chart-title">
        {label} over iterations <span className="loss-chart-count">({history.length} steps)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="loss-chart-svg">
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={2} />
      </svg>
    </div>
  );
}
