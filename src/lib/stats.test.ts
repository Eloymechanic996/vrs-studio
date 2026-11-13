import { describe, expect, it } from "vitest";
import {
  cleanLapIds,
  computeLapStats,
  computeStints,
  formatDelta,
  theoreticalBestLap,
  totalPitTimeMs,
} from "./stats";
import type { EventType, Lap, LapEvent, TrackState } from "./supabase/types";

function lap(n: number, ms: number, total: number, state: TrackState = "Green Flag"): Lap {
  return {
    id: `l${n}`,
    session_id: "s",
    lap_number: n,
    lap_time_ms: ms,
    total_time_ms: total,
    track_state: state,
    notes: null,
    created_at: "",
  };
}

function ev(type: EventType, ms: number): LapEvent {
  return {
    id: `${type}-${ms}`,
    session_id: "s",
    event_type: type,
    lap_number: null,
    elapsed_ms: ms,
    notes: null,
    created_at: "",
  };
}

describe("computeLapStats", () => {
  it("no toma como mejor una vuelta con bandera", () => {
    const stats = computeLapStats([
      lap(1, 50000, 50000),
      lap(2, 45000, 95000, "Yellow Flag"),
      lap(3, 49000, 144000),
    ]);
    expect(stats.bestId).toBe("l3");
    expect(stats.cleanCount).toBe(2);
  });

  it("ignora vueltas imposibles por doble toque", () => {
    const stats = computeLapStats([
      lap(1, 50000, 50000),
      lap(2, 150, 50150),
      lap(3, 49000, 99150),
      lap(4, 51000, 150150),
    ]);
    expect(stats.bestMs).toBe(49000);
  });

  it("deja fuera una vuelta de salida muy lenta", () => {
    const laps = [lap(1, 70000, 70000), lap(2, 50000, 120000), lap(3, 50500, 170500)];
    expect(cleanLapIds(laps).has("l1")).toBe(false);
    expect(computeLapStats(laps).cleanCount).toBe(2);
  });

  it("sin vueltas verdes usa la más rápida y no calcula media", () => {
    const stats = computeLapStats([lap(1, 60000, 60000, "Safety Car"), lap(2, 55000, 115000, "Red Flag")]);
    expect(stats.bestMs).toBe(55000);
    expect(stats.averageMs).toBeNull();
  });

  it("sin vueltas no falla", () => {
    expect(computeLapStats([]).bestMs).toBeNull();
  });
});

describe("computeStints", () => {
  const laps = [
    lap(1, 50000, 50000),
    lap(2, 50100, 100100),
    lap(3, 50200, 150300),
    lap(4, 60000, 210300, "Pit Lane"),
    lap(5, 50000, 300000),
    lap(6, 50300, 350300),
  ];
  const events = [ev("Pit In", 200000), ev("Pit Out", 250000)];

  it("separa por paradas sin perder la vuelta que acaba durante la parada", () => {
    const stints = computeStints(laps, events);
    expect(stints.map((s) => s.laps.length)).toEqual([4, 2]);
    expect(stints[1].pitInMs).toBe(50000);
  });

  it("numera seguido aunque un tramo no tenga vueltas", () => {
    const stints = computeStints(laps.slice(4), events);
    expect(stints.map((s) => s.index)).toEqual([1]);
  });

  it("calcula el decay con vueltas limpias", () => {
    const stints = computeStints(laps, events);
    expect(stints[0].decayMsPerLap).toBeCloseTo(100);
  });

  it("suma solo paradas completas", () => {
    expect(totalPitTimeMs(events)).toBe(50000);
    expect(totalPitTimeMs([ev("Pit In", 100)])).toBe(0);
  });
});

describe("utilidades", () => {
  it("formatea deltas", () => {
    expect(formatDelta(1234)).toBe("+1.234");
    expect(formatDelta(-50)).toBe("-0.050");
    expect(formatDelta(null)).toBe("—");
  });
  it("vuelta teórica exige todos los sectores", () => {
    expect(theoreticalBestLap([1000, 2000])).toBe(3000);
    expect(theoreticalBestLap([1000, null])).toBeNull();
  });
});
