"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createStopwatch, isStopwatchState, type StopwatchState } from "@/lib/stopwatch";

interface WakeLockHandle {
  release: () => Promise<void>;
}

/**
 * Estado del cronómetro de una sesión, guardado en el dispositivo para que
 * sobreviva a recargas y a bloqueos de pantalla. El dibujo de los números va
 * aparte (StopwatchDisplay) para no repintar la página en cada fotograma.
 */
export function useStopwatch(sessionId: string, baseTotalMs: number, keepAwake: boolean) {
  const storageKey = `vrs:stopwatch:${sessionId}`;
  const [state, setState] = useState<StopwatchState>(() => createStopwatch(baseTotalMs));
  const stateRef = useRef(state);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (isStopwatchState(saved)) {
        stateRef.current = saved;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe tras montar
        setState(saved);
      }
    } catch {
      // Un dato corrupto se ignora y el cronómetro empieza limpio.
    }
  }, [storageKey]);

  const commit = useCallback(
    (next: StopwatchState) => {
      stateRef.current = next;
      setState(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Sin almacenamiento el cronómetro sigue funcionando en memoria.
      }
    },
    [storageKey],
  );

  const current = useCallback(() => stateRef.current, []);

  const running = state.runningSince !== null;
  useEffect(() => {
    if (!running || !keepAwake || !("wakeLock" in navigator)) return;
    let lock: WakeLockHandle | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const handle = await (
          navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<WakeLockHandle> } }
        ).wakeLock.request("screen");
        if (cancelled) void handle.release();
        else lock = handle;
      } catch {
        // El navegador puede negarlo (batería baja); el cronómetro no depende de ello.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [running, keepAwake]);

  return { state, current, commit };
}

export type Stopwatch = ReturnType<typeof useStopwatch>;
