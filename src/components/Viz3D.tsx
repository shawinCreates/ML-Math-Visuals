import { ReactNode, useEffect, useRef } from "react";
import { Orbit3D, View } from "../lib/scene3d";

export const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Canvas3DProps {
  draw(ctx: CanvasRenderingContext2D, view: View): void;
  /** Any value; a change schedules a repaint. */
  redrawKey: unknown;
  ariaLabel: string;
  yaw?: number;
  pitch?: number;
  dist?: number;
  zShift?: number;
  autoRotate?: boolean;
}

export function Canvas3D({ draw, redrawKey, ariaLabel, yaw, pitch, dist, zShift, autoRotate = true }: Canvas3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbitRef = useRef<Orbit3D>();
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const orbit = new Orbit3D(canvasRef.current!, {
      yaw,
      pitch,
      dist,
      zShift,
      autoRotate: autoRotate && !prefersReducedMotion(),
    });
    orbit.draw = (ctx, view) => drawRef.current(ctx, view);
    orbitRef.current = orbit;
    return () => orbit.dispose();
    // camera options are initial values by design
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    orbitRef.current?.requestRender();
  }, [redrawKey]);

  return (
    <div className="viz3d-stage">
      <canvas ref={canvasRef} className="viz3d-canvas" role="img" aria-label={ariaLabel} />
      <span className="viz3d-tip" aria-hidden="true">
        drag rotates · shift-drag pans · scroll zooms
      </span>
      <div className="viz3d-controls">
        <button aria-label="Zoom in" onClick={() => orbitRef.current?.zoomBy(0.82)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <line x1="7" y1="2.5" x2="7" y2="11.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="2.5" y1="7" x2="11.5" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <button aria-label="Zoom out" onClick={() => orbitRef.current?.zoomBy(1.22)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <line x1="2.5" y1="7" x2="11.5" y2="7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <button aria-label="Reset view" onClick={() => orbitRef.current?.resetView()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7a4 4 0 1 1 1.2 2.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            <path d="M3 10.5V7.4h3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function Viz3DSection({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section className="viz3d-section">
      <div className="viz3d-head">
        <h2>{title}</h2>
        <span className="viz3d-badge">3D</span>
      </div>
      <p className="viz3d-lead">{lead}</p>
      {children}
    </section>
  );
}
