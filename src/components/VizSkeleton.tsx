/** Loading placeholder matching the standard viz-row layout shape. */
export function VizSkeleton() {
  return (
    <div className="viz-row" aria-hidden="true">
      <div className="skeleton skeleton-plot" />
      <div className="viz-side">
        <div className="stat-grid">
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-stat" />
        </div>
        <div className="skeleton skeleton-control" />
        <div className="skeleton skeleton-control" />
        <div className="skeleton skeleton-control" />
        <div className="skeleton skeleton-block" />
      </div>
    </div>
  );
}
