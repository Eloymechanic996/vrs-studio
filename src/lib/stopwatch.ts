/**
 * Lógica pura del cronómetro. No depende de React ni del navegador para poder
 * guardarse, recuperarse tras recargar y probarse con tests.
 *
 * `accumulated` es el tiempo total hasta el último arranque; `lapMark` y
 * `sectorMark` indican en qué tiempo total empezó la vuelta y el sector en curso.
 */
export interface StopwatchState {
  runningSince: number | null;
  accumulated: number;
  lapMark: number;
  sectorMark: number;
  pendingSectors: number[];
}

export function createStopwatch(baseTotalMs = 0): StopwatchState {
  return {
    runningSince: null,
    accumulated: baseTotalMs,
    lapMark: baseTotalMs,
    sectorMark: baseTotalMs,
    pendingSectors: [],
  };
}

export function totalElapsed(s: StopwatchState, now: number): number {
  return s.accumulated + (s.runningSince === null ? 0 : Math.max(0, now - s.runningSince));
}

export function lapElapsed(s: StopwatchState, now: number): number {
  return totalElapsed(s, now) - s.lapMark;
}

export function sectorElapsed(s: StopwatchState, now: number): number {
  return totalElapsed(s, now) - s.sectorMark;
}

export function start(s: StopwatchState, now: number): StopwatchState {
  if (s.runningSince !== null) return s;
  return { ...s, runningSince: now };
}

export function pause(s: StopwatchState, now: number): StopwatchState {
  if (s.runningSince === null) return s;
  return { ...s, accumulated: totalElapsed(s, now), runningSince: null };
}

/** Pone a cero la vuelta en curso, sin retroceder el tiempo acumulado de la sesión. */
export function reset(baseTotalMs: number): StopwatchState {
  return createStopwatch(baseTotalMs);
}

export interface CompletedLap {
  lapMs: number;
  totalMs: number;
  sectors: number[] | null;
}

export type MarkResult =
  | { kind: "ignored"; state: StopwatchState }
  | { kind: "sector"; state: StopwatchState }
  | { kind: "lap"; state: StopwatchState; lap: CompletedLap };

export function markLap(s: StopwatchState, now: number, minLapMs: number): MarkResult {
  const lapMs = Math.round(lapElapsed(s, now));
  if (lapMs <= 0 || lapMs < minLapMs) return { kind: "ignored", state: s };
  const total = totalElapsed(s, now);
  return {
    kind: "lap",
    state: { ...s, lapMark: total, sectorMark: total, pendingSectors: [] },
    lap: { lapMs, totalMs: Math.round(total), sectors: null },
  };
}

export function markSector(
  s: StopwatchState,
  now: number,
  sectorsCount: number,
  minSectorMs: number,
): MarkResult {
  const sectorMs = Math.round(sectorElapsed(s, now));
  if (sectorMs <= 0 || sectorMs < minSectorMs) return { kind: "ignored", state: s };
  const total = totalElapsed(s, now);
  const sectors = [...s.pendingSectors, sectorMs];

  if (sectors.length < sectorsCount) {
    return { kind: "sector", state: { ...s, sectorMark: total, pendingSectors: sectors } };
  }

  return {
    kind: "lap",
    state: { ...s, lapMark: total, sectorMark: total, pendingSectors: [] },
    lap: { lapMs: sectors.reduce((a, b) => a + b, 0), totalMs: Math.round(total), sectors },
  };
}

/**
 * Calcula el acumulado de una vuelta escrita a mano. Con el cronómetro parado
 * avanza la sesión; en marcha es una vuelta olvidada y no toca el tiempo en curso.
 */
export function applyManualLap(
  s: StopwatchState,
  lapMs: number,
  lastTotalMs: number,
  now: number,
): { state: StopwatchState; totalMs: number } {
  if (s.runningSince !== null) {
    return { state: s, totalMs: Math.max(Math.round(totalElapsed(s, now)), lastTotalMs + lapMs) };
  }
  const totalMs = Math.max(s.accumulated, lastTotalMs) + lapMs;
  return { state: createStopwatch(totalMs), totalMs };
}

export function isStopwatchState(value: unknown): value is StopwatchState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    (v.runningSince === null || typeof v.runningSince === "number") &&
    typeof v.accumulated === "number" &&
    typeof v.lapMark === "number" &&
    typeof v.sectorMark === "number" &&
    Array.isArray(v.pendingSectors)
  );
}
