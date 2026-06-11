import { RefObject, useRef, useState } from "react";
import { Point, clamp } from "../lib/math";
import { Scale } from "../lib/plot";

/**
 * Click-to-add / drag-to-move / alt-click-to-delete editing for points on an
 * SVG plot. The SVG must use a viewBox matching scale.width/height so pointer
 * coordinates can be mapped through the bounding rect.
 */
export function usePointEditor<T extends Point>(
  svgRef: RefObject<SVGSVGElement>,
  scale: Scale,
  points: T[],
  setPoints: (pts: T[]) => void,
  makePoint: (x: number, y: number) => T,
) {
  const dragIndex = useRef<number>(-1);
  const [dragging, setDragging] = useState(false);

  function toSvg(e: { clientX: number; clientY: number }): { px: number; py: number } {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      px: ((e.clientX - rect.left) / rect.width) * scale.width,
      py: ((e.clientY - rect.top) / rect.height) * scale.height,
    };
  }

  function nearestIndex(px: number, py: number): number {
    let best = -1;
    let bestD = 14; // px hit radius
    points.forEach((p, i) => {
      const d = Math.hypot(scale.sx(p.x) - px, scale.sy(p.y) - py);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  function clampPoint(x: number, y: number): { x: number; y: number } {
    return {
      x: clamp(x, scale.xDomain[0], scale.xDomain[1]),
      y: clamp(y, scale.yDomain[0], scale.yDomain[1]),
    };
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const { px, py } = toSvg(e);
    const idx = nearestIndex(px, py);
    if (e.altKey) {
      if (idx >= 0) setPoints(points.filter((_, i) => i !== idx));
      return;
    }
    if (idx >= 0) {
      dragIndex.current = idx;
      setDragging(true);
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } else {
      const inPlot =
        px >= scale.innerLeft && px <= scale.innerRight && py >= scale.innerTop && py <= scale.innerBottom;
      if (!inPlot) return;
      const { x, y } = clampPoint(scale.dx(px), scale.dy(py));
      setPoints([...points, makePoint(x, y)]);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragIndex.current < 0) return;
    const { px, py } = toSvg(e);
    const { x, y } = clampPoint(scale.dx(px), scale.dy(py));
    setPoints(points.map((p, i) => (i === dragIndex.current ? { ...p, x, y } : p)));
  };

  const endDrag = () => {
    dragIndex.current = -1;
    setDragging(false);
  };

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerLeave: endDrag,
    },
  };
}
