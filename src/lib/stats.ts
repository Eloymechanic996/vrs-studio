import type { EventType, Lap, LapEvent, LapSector, TrackState } from "@/lib/supabase/types";

export interface LapStats {
  count: number;
  cleanCount: number;
  bestMs: number | null;
  bestId: string | null;
  averageMs: number | null;
  stddevMs: number | null;
  /** Coeficiente de variación: desviación / media. Menor = más consistente. */
  cv: number | null;
}

/** Una vuelta por debajo de este % de la mediana se considera un error de marcado. */
const MIN_VALID_RATIO = 0.7;
/** Vueltas más lentas que este % de la mejor no representan el ritmo (salida, tráfico...). */
const CLEAN_MAX_RATIO = 1.07;

function isGreen(lap: Pick<Lap, "track_state">): boolean {
  return (lap.track_state as TrackState) === "Green Flag";
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fastest<T extends Pick<Lap, "lap_time_ms">>(laps: T[]): T | null {
  let best: T | null = null;
  for (const l of laps) {
    if (!best || l.lap_time_ms < best.lap_time_ms) best = l;
  }
  return best;
}

function classify(laps: Lap[]): { clean: Lap[]; best: Lap | null } {
  const green = laps.filter(isGreen);
  if (green.length === 0) return { clean: [], best: fastest(laps) };

  const med = median(green.map((l) => l.lap_time_ms));
  const valid = green.filter((l) => l.lap_time_ms >= med * MIN_VALID_RATIO);
  const best = fastest(valid);
  if (!best) return { clean: [], best: fastest(laps) };

  const limit = best.lap_time_ms * CLEAN_MAX_RATIO;
  return { clean: valid.filter((l) => l.lap_time_ms <= limit), best };
}

/** Identificadores de las vueltas que representan el ritmo real. */
export function cleanLapIds(laps: Lap[]): Set<string> {
  return new Set(classify(laps).clean.map((l) => l.id));
}

function meanAndDeviation(times: number[]): { mean: number; stddev: number } {
  const mean = times.reduce((a, t) => a + t, 0) / times.length;
  const variance = times.reduce((a, t) => a + (t - mean) ** 2, 0) / times.length;
  return { mean, stddev: Math.sqrt(variance) };
}

export function computeLapStats(laps: Lap[]): LapStats {
  const { clean, best } = classify(laps);
  const base: LapStats = {
    count: laps.length,
    cleanCount: clean.length,
    bestMs: best?.lap_time_ms ?? null,
    bestId: best?.id ?? null,
    averageMs: null,
    stddevMs: null,
    cv: null,
  };
  if (clean.length === 0) return base;

  const { mean, stddev } = meanAndDeviation(clean.map((l) => l.lap_time_ms));
  return { ...base, averageMs: mean, stddevMs: stddev, cv: mean > 0 ? stddev / mean : null };
}

/** Diferencia con una vuelta de referencia, en milisegundos con signo. */
export function lapDelta(lapMs: number, referenceMs: number | null): number | null {
  if (referenceMs === null) return null;
  return lapMs - referenceMs;
}

export function formatDelta(deltaMs: number | null): string {
  if (deltaMs === null) return "—";
  if (deltaMs === 0) return "0.000";
  const sign = deltaMs > 0 ? "+" : "-";
  const abs = Math.abs(deltaMs);
  const seconds = Math.floor(abs / 1000);
  const millis = Math.floor(abs % 1000);
  return `${sign}${seconds}.${String(millis).padStart(3, "0")}`;
}

/** Etiqueta de consistencia según el coeficiente de variación (umbrales de karting). */
export function consistencyLabel(cv: number | null): {
  label: string;
  tone: "success" | "info" | "warning" | "danger" | "muted";
} {
  if (cv === null) return { label: "—", tone: "muted" };
  if (cv < 0.005) return { label: "Excelente", tone: "success" };
  if (cv < 0.01) return { label: "Muy buena", tone: "success" };
  if (cv < 0.02) return { label: "Buena", tone: "info" };
  if (cv < 0.03) return { label: "Aceptable", tone: "warning" };
  return { label: "Irregular", tone: "danger" };
}

export function bestSectorTimes(
  sectors: LapSector[],
  sectorsCount: number,
): (number | null)[] {
  const best: (number | null)[] = Array.from({ length: sectorsCount }, () => null);
  for (const s of sectors) {
    const idx = s.sector_number - 1;
    if (idx < 0 || idx >= sectorsCount) continue;
    const current = best[idx];
    if (current === null || s.time_ms < current) best[idx] = s.time_ms;
  }
  return best;
}

export function theoreticalBestLap(bestSectors: (number | null)[]): number | null {
  if (bestSectors.length === 0) return null;
  let sum = 0;
  for (const t of bestSectors) {
    if (t === null) return null;
    sum += t;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Stints
// ---------------------------------------------------------------------------

export interface Stint {
  index: number;
  laps: Lap[];
  bestMs: number | null;
  averageMs: number | null;
  stddevMs: number | null;
  /** Pendiente de la recta de tiempos en vueltas limpias. Positivo = pierde ritmo. */
  decayMsPerLap: number | null;
  /** Duración de la parada que abre este stint. null en el primero. */
  pitInMs: number | null;
}

function pitPairs(events: LapEvent[]): { inMs: number; outMs: number | null }[] {
  const times = (type: EventType) =>
    events
      .filter((e) => e.event_type === type)
      .map((e) => e.elapsed_ms)
      .sort((a, b) => a - b);
  const pitIns = times("Pit In");
  const pitOuts = times("Pit Out");

  let outIdx = 0;
  return pitIns.map((inMs) => {
    while (outIdx < pitOuts.length && pitOuts[outIdx] < inMs) outIdx++;
    const outMs = pitOuts[outIdx];
    if (outMs === undefined) return { inMs, outMs: null };
    outIdx++;
    return { inMs, outMs };
  });
}

function linearSlope(points: { x: number; y: number }[]): number | null {
  if (points.length < 3) return null;
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  return denom === 0 ? null : (n * sumXY - sumX * sumY) / denom;
}

/**
 * Divide las vueltas en stints separados por paradas. La vuelta que termina
 * durante la parada pertenece al stint que acaba. Las métricas usan vueltas
 * limpias y, si un stint no tiene ninguna, todas las suyas.
 */
export function computeStints(laps: Lap[], events: LapEvent[]): Stint[] {
  if (laps.length === 0) return [];

  const ranges: { start: number; end: number; pitInMs: number | null }[] = [];
  let cursor = 0;
  let previousPit: number | null = null;
  let open = true;
  for (const { inMs, outMs } of pitPairs(events)) {
    if (!open) break;
    ranges.push({
      start: cursor,
      end: outMs ?? Number.POSITIVE_INFINITY,
      pitInMs: previousPit,
    });
    if (outMs === null) {
      open = false;
    } else {
      previousPit = outMs - inMs;
      cursor = outMs;
    }
  }
  if (open) {
    ranges.push({ start: cursor, end: Number.POSITIVE_INFINITY, pitInMs: previousPit });
  }

  const clean = cleanLapIds(laps);
  const stints: Stint[] = [];
  for (const range of ranges) {
    const stintLaps = laps.filter(
      (l) => l.total_time_ms > range.start && l.total_time_ms <= range.end,
    );
    if (stintLaps.length === 0) continue;

    const cleanInStint = stintLaps.filter((l) => clean.has(l.id));
    const reference = cleanInStint.length > 0 ? cleanInStint : stintLaps;
    const times = reference.map((l) => l.lap_time_ms);
    const { mean, stddev } = meanAndDeviation(times);
    const decay = linearSlope(
      stintLaps.flatMap((l, x) => (clean.has(l.id) ? [{ x, y: l.lap_time_ms }] : [])),
    );

    stints.push({
      index: stints.length + 1,
      laps: stintLaps,
      bestMs: Math.min(...times),
      averageMs: mean,
      stddevMs: stddev,
      decayMsPerLap: decay,
      pitInMs: range.pitInMs,
    });
  }
  return stints;
}

/** Suma de las paradas completas (Pit In seguido de Pit Out). */
export function totalPitTimeMs(events: LapEvent[]): number {
  return pitPairs(events).reduce(
    (total, { inMs, outMs }) => (outMs === null ? total : total + outMs - inMs),
    0,
  );
}
