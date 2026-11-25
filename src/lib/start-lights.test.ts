import { describe, expect, it } from "vitest";
import { HOLD_MAX_MS, HOLD_MIN_MS, litAt, planStartLights } from "./start-lights";

describe("semáforo de salida", () => {
  it("enciende una luz por segundo y se apaga tras una espera aleatoria", () => {
    const plan = planStartLights(() => 0.5);
    expect(plan.onAt).toEqual([1000, 2000, 3000, 4000, 5000]);
    expect(plan.outAt).toBe(5000 + Math.round(HOLD_MIN_MS + 0.5 * (HOLD_MAX_MS - HOLD_MIN_MS)));
  });

  it("la espera queda siempre dentro de los límites, aunque random() se pase", () => {
    expect(planStartLights(() => 0).outAt).toBe(5000 + HOLD_MIN_MS);
    expect(planStartLights(() => 1).outAt).toBeLessThanOrEqual(5000 + HOLD_MAX_MS);
    expect(planStartLights(() => -3).outAt).toBe(5000 + HOLD_MIN_MS);
  });

  it("cuenta las luces encendidas en cada momento", () => {
    const plan = planStartLights(() => 0);
    expect(litAt(plan, 0)).toBe(0);
    expect(litAt(plan, 999)).toBe(0);
    expect(litAt(plan, 1000)).toBe(1);
    expect(litAt(plan, 3500)).toBe(3);
    expect(litAt(plan, 5100)).toBe(5);
    expect(litAt(plan, plan.outAt)).toBe(0);
  });
});
