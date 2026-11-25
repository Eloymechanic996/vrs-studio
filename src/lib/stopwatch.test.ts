import { describe, expect, it } from "vitest";
import {
  applyManualLap,
  createStopwatch,
  lapElapsed,
  markLap,
  markSector,
  pause,
  reset,
  start,
  totalElapsed,
} from "./stopwatch";

describe("cronómetro", () => {
  it("cuenta, pausa y reanuda", () => {
    let s = start(createStopwatch(), 1000);
    expect(totalElapsed(s, 4000)).toBe(3000);
    s = pause(s, 4000);
    expect(totalElapsed(s, 9000)).toBe(3000);
    s = start(s, 9000);
    expect(totalElapsed(s, 10000)).toBe(4000);
  });

  it("marca una vuelta y la siguiente empieza de cero", () => {
    const s = start(createStopwatch(), 0);
    const r = markLap(s, 50000, 5000);
    expect(r.kind).toBe("lap");
    if (r.kind !== "lap") return;
    expect(r.lap).toEqual({ lapMs: 50000, totalMs: 50000, sectors: null });
    expect(lapElapsed(r.state, 51000)).toBe(1000);
    expect(totalElapsed(r.state, 51000)).toBe(51000);
  });

  it("ignora una pulsación por debajo del mínimo", () => {
    const first = markLap(start(createStopwatch(), 0), 50000, 5000);
    if (first.kind !== "lap") throw new Error();
    expect(markLap(first.state, 50100, 5000).kind).toBe("ignored");
  });

  it("recorre los sectores y cierra la vuelta con su suma", () => {
    let s = start(createStopwatch(), 0);
    const a = markSector(s, 20000, 3, 1000);
    expect(a.kind).toBe("sector");
    s = a.state;
    const b = markSector(s, 45000, 3, 1000);
    s = b.state;
    expect(s.pendingSectors).toEqual([20000, 25000]);
    const c = markSector(s, 60000, 3, 1000);
    expect(c.kind).toBe("lap");
    if (c.kind !== "lap") return;
    expect(c.lap.sectors).toEqual([20000, 25000, 15000]);
    expect(c.lap.lapMs).toBe(60000);
    expect(c.state.pendingSectors).toEqual([]);
  });

  it("reset no retrocede el acumulado de la sesión", () => {
    const s = reset(createStopwatch(), 150000, 5000);
    expect(totalElapsed(s, 5000)).toBe(150000);
    expect(lapElapsed(s, 5000)).toBe(0);
  });

  it("reset en mitad de una vuelta conserva el tiempo ya corrido (Pit In anterior sigue antes)", () => {
    // Última vuelta cerrada a 120 s, Pit In a 130 s, reset a 140 s.
    const running = start(createStopwatch(120000), 120000);
    const s = reset(running, 120000, 140000);
    expect(s.runningSince).toBeNull();
    expect(totalElapsed(s, 999999)).toBe(140000);
    expect(lapElapsed(s, 999999)).toBe(0);
  });

  it("reset con el cronómetro olvidado en marcha no salta días", () => {
    const running = start(createStopwatch(0), 0);
    const s = reset(running, 0, 5 * 24 * 3600 * 1000, 3600000);
    expect(totalElapsed(s, 0)).toBe(3600000);
  });

  it("las vueltas manuales suman con el cronómetro parado", () => {
    const first = applyManualLap(createStopwatch(), 50000, 0, 1000);
    expect(first.totalMs).toBe(50000);
    const second = applyManualLap(first.state, 51000, 50000, 2000);
    expect(second.totalMs).toBe(101000);
  });

  it("una vuelta olvidada añadida con el cronómetro en marcha no se cuenta dos veces", () => {
    // Vuelta 1 marcada a 60 s; la 2 (60 s) se olvida y se añade a mano a los 130 s.
    const first = markLap(start(createStopwatch(), 0), 60000, 5000);
    if (first.kind !== "lap") throw new Error();
    const r = applyManualLap(first.state, 60000, 60000, 130000);
    expect(r.totalMs).toBe(120000);
    expect(lapElapsed(r.state, 130000)).toBe(10000);
    // La vuelta 3 se marca a los 180 s y mide 60 s, no 120 s.
    const third = markLap(r.state, 180000, 5000);
    if (third.kind !== "lap") throw new Error();
    expect(third.lap.lapMs).toBe(60000);
    expect(third.lap.totalMs).toBe(180000);
  });

  it("una vuelta manual más larga que la vuelta en curso no toca el cronómetro", () => {
    const running = start(createStopwatch(), 0);
    const r = applyManualLap(running, 90000, 0, 60000);
    expect(r.state).toBe(running);
    expect(r.totalMs).toBe(90000);
  });
});
