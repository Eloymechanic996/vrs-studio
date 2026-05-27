import type { Database, EventType, TrackState } from "@/lib/supabase/types";

type Lap = Database["public"]["Tables"]["laps"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type LapSector = Database["public"]["Tables"]["lap_sectors"]["Row"];

export interface LapStats {
  count: number;
  cleanCount: number;
  bestMs: number | null;
  bestId: string | null;
  averageMs: number | null;
  stddevMs: number | null;
  /** Coefficient of variation: stddev / mean. Lower = more consistent. */
  cv: number | null;
}

/**
 * "Clean" laps for pace analysis: only Green Flag laps count.
 * Pit in/out, safety car laps, etc. would skew consistency metrics.
 */
function isCleanLap(lap: Pick<Lap, "track_state">): boolean {
  return (lap.track_state as TrackState) === "Green Flag";
}

export function computeLapStats(laps: Lap[]): LapStats {
  const empty: LapStats = {
    count: laps.length,
    cleanCount: 0,
    bestMs: null,
    bestId: null,
    averageMs: null,
    stddevMs: null,
    cv: null,
  };
  if (laps.length === 0) return empty;

  let best: Lap | null = null;
  for (const l of laps) {
    if (!best || l.lap_time_ms < best.lap_time_ms) best = l;
  }

  const clean = laps.filter(isCleanLap);
  if (clean.length === 0) {
    return {
      ...empty,
      bestMs: best?.lap_time_ms ?? null,
      bestId: best?.id ?? null,
    };
  }

  const sum = clean.reduce((a, l) => a + l.lap_time_ms, 0);
  const mean = sum / clean.length;

  let varianceSum = 0;
  for (const l of clean) {
    const d = l.lap_time_ms - mean;
    varianceSum += d * d;
  }
  // Population stddev (we have the full set, not a sample).
  const stddev = Math.sqrt(varianceSum / clean.length);

  return {
    count: laps.length,
    cleanCount: clean.length,
    bestMs: best?.lap_time_ms ?? null,
    bestId: best?.id ?? null,
    averageMs: mean,
    stddevMs: stddev,
    cv: mean > 0 ? stddev / mean : null,
  };
}

/** Difference from a reference lap, returned as a signed millisecond delta. */
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

/**
 * Qualitative consistency label based on coefficient of variation.
 * Karting-tuned thresholds: <1% is metronomic, >3% is erratic.
 */
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

/**
 * Best time per sector index across all laps in the session.
 * Returns an array of length `sectorsCount`; index i = best time for sector i+1,
 * or null if no lap has logged that sector.
 */
export function bestSectorTimes(
  sectors: LapSector[],
  sectorsCount: number,
): (number | null)[] {
  const best: (number | null)[] = Array.from({ length: sectorsCount }, () => null);
  for (const s of sectors) {
    const idx = s.sector_number - 1;
    if (idx < 0 || idx >= sectorsCount) continue;
    const current = best[idx];
    if (current === null || s.time_ms < current) {
      best[idx] = s.time_ms;
    }
  }
  return best;
}

/**
 * Theoretical best lap = sum of best sector times.
 * Returns null if any sector has no recorded times.
 */
export function theoreticalBestLap(
  bestSectors: (number | null)[],
): number | null {
  if (bestSectors.length === 0) return null;
  let sum = 0;
  for (const t of bestSectors) {
    if (t === null) return null;
    sum += t;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Stint analysis
// ---------------------------------------------------------------------------

export interface Stint {
  index: number;
  laps: Lap[];
  startMs: number;
  endMs: number;
  bestMs: number | null;
  averageMs: number | null;
  stddevMs: number | null;
  /** Slope of linear fit (lap_time_ms vs in-stint lap number). Positive = degrading. */
  decayMsPerLap: number | null;
  /** Pit stop duration entering this stint, in ms. null for the first stint. */
  pitInMs: number | null;
}

/**
 * Partition laps into stints, separated by Pit In events.
 * A stint = consecutive laps between (start) → Pit In, or Pit Out → Pit In, etc.
 */
export function computeStints(laps: Lap[], events: Event[]): Stint[] {
  if (laps.length === 0) return [];

  const pitIns = events
    .filter((e) => (e.event_type as EventType) === "Pit In")
    .map((e) => e.elapsed_ms)
    .sort((a, b) => a - b);
  const pitOuts = events
    .filter((e) => (e.event_type as EventType) === "Pit Out")
    .map((e) => e.elapsed_ms)
    .sort((a, b) => a - b);

  // Build stint boundaries on the time axis.
  // Stint k runs from boundary[k] to boundary[k+1].
  // boundary[0] = 0, then each Pit In closes a stint, each Pit Out opens one.
  // If counts don't match, we still partition by Pit In events alone.
  const boundaries: { start: number; end: number; pitInMs: number | null }[] = [];
  let cursor = 0;
  let outIdx = 0;
  let lastPitInMs: number | null = null;
  for (const inMs of pitIns) {
    boundaries.push({ start: cursor, end: inMs, pitInMs: lastPitInMs });
    // Find next pit out after this pit in
    while (outIdx < pitOuts.length && pitOuts[outIdx] < inMs) outIdx++;
    const matchingOut = pitOuts[outIdx];
    if (matchingOut !== undefined) {
      lastPitInMs = matchingOut - inMs;
      cursor = matchingOut;
      outIdx++;
    } else {
      // Unfinished pit stop; remaining laps (if any) form no further stint.
      cursor = Number.POSITIVE_INFINITY;
    }
  }
  // Trailing stint after last pit (or the whole session if no pit ins).
  if (cursor !== Number.POSITIVE_INFINITY) {
    boundaries.push({
      start: cursor,
      end: Number.POSITIVE_INFINITY,
      pitInMs: lastPitInMs,
    });
  }

  const stints: Stint[] = [];
  boundaries.forEach((b, i) => {
    const stintLaps = laps.filter(
      (l) => l.total_time_ms > b.start && l.total_time_ms <= b.end,
    );
    if (stintLaps.length === 0) return;

    const times = stintLaps.map((l) => l.lap_time_ms);
    const best = Math.min(...times);
    const mean = times.reduce((a, t) => a + t, 0) / times.length;
    let varSum = 0;
    for (const t of times) varSum += (t - mean) ** 2;
    const stddev = Math.sqrt(varSum / times.length);

    let decay: number | null = null;
    if (stintLaps.length >= 3) {
      // Simple linear regression: y = a + b*x, x = in-stint index (0-based)
      const n = stintLaps.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      stintLaps.forEach((l, idx) => {
        sumX += idx;
        sumY += l.lap_time_ms;
        sumXY += idx * l.lap_time_ms;
        sumXX += idx * idx;
      });
      const denom = n * sumXX - sumX * sumX;
      if (denom !== 0) decay = (n * sumXY - sumX * sumY) / denom;
    }

    stints.push({
      index: i + 1,
      laps: stintLaps,
      startMs: b.start,
      endMs: b.end === Number.POSITIVE_INFINITY
        ? (stintLaps[stintLaps.length - 1]?.total_time_ms ?? b.start)
        : b.end,
      bestMs: best,
      averageMs: mean,
      stddevMs: stddev,
      decayMsPerLap: decay,
      pitInMs: b.pitInMs,
    });
  });

  return stints;
}

/** Sum of all pit-stop durations (matched Pit In/Pit Out pairs). */
export function totalPitTimeMs(events: Event[]): number {
  const pitIns = events
    .filter((e) => (e.event_type as EventType) === "Pit In")
    .map((e) => e.elapsed_ms)
    .sort((a, b) => a - b);
  const pitOuts = events
    .filter((e) => (e.event_type as EventType) === "Pit Out")
    .map((e) => e.elapsed_ms)
    .sort((a, b) => a - b);
  let total = 0;
  let outIdx = 0;
  for (const inMs of pitIns) {
    while (outIdx < pitOuts.length && pitOuts[outIdx] < inMs) outIdx++;
    const out = pitOuts[outIdx];
    if (out !== undefined) {
      total += out - inMs;
      outIdx++;
    }
  }
  return total;
}
