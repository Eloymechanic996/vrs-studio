"use client";

import { useEffect, useRef } from "react";
import { lapElapsed, sectorElapsed, totalElapsed, type StopwatchState } from "@/lib/stopwatch";
import { cn, formatLapTime } from "@/lib/utils";

/**
 * Pinta los tiempos directamente en el DOM en cada fotograma, sin pasar por
 * React, para que marcar vueltas no sufra con listas largas.
 */
export function StopwatchDisplay({
  state,
  useSectors,
}: {
  state: StopwatchState;
  useSectors: boolean;
}) {
  const mainRef = useRef<HTMLParagraphElement>(null);
  const lapRef = useRef<HTMLSpanElement>(null);
  const totalRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const now = Date.now();
      if (mainRef.current) {
        mainRef.current.textContent = formatLapTime(
          useSectors ? sectorElapsed(state, now) : lapElapsed(state, now),
        );
      }
      if (lapRef.current) lapRef.current.textContent = formatLapTime(lapElapsed(state, now));
      if (totalRef.current) totalRef.current.textContent = formatLapTime(totalElapsed(state, now));
      if (state.runningSince !== null) frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [state, useSectors]);

  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-widest text-muted">
        {useSectors ? "Sector en curso" : "Vuelta en curso"}
      </p>
      <p
        ref={mainRef}
        suppressHydrationWarning
        className={cn(
          "tabular text-6xl font-bold tracking-tight sm:text-7xl",
          state.runningSince !== null ? "text-accent" : "text-foreground",
        )}
      >
        00:00.000
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-3 text-xs text-muted">
        <span>
          Vuelta: <span ref={lapRef} suppressHydrationWarning className="tabular">00:00.000</span>
        </span>
        <span>
          Total: <span ref={totalRef} suppressHydrationWarning className="tabular">00:00.000</span>
        </span>
      </div>
    </div>
  );
}
