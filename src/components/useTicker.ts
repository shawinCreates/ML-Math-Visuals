import { useEffect, useRef, useState } from "react";

/** Calls `tick` repeatedly (~30x/s) while running. `tick` returns false to stop. */
export function useTicker(tick: () => boolean | void) {
  const [running, setRunning] = useState(false);
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (tickRef.current() === false) setRunning(false);
    }, 33);
    return () => window.clearInterval(id);
  }, [running]);

  return { running, setRunning, toggle: () => setRunning((r) => !r) };
}
