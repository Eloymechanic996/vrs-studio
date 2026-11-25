import { describe, expect, it } from "vitest";
import { addDays, daysUntil, longDate, todayISO, upcomingLabel } from "./session-dates";

describe("fechas de sesiones preparadas", () => {
  it("'hoy' es el día de España, no el del servidor en UTC", () => {
    // 23:30 UTC del 25/11 ya es 26/11 en Madrid (UTC+1 en invierno).
    expect(todayISO(new Date("2026-11-25T23:30:00Z"))).toBe("2026-11-26");
    // 22:30 UTC del 25/07 ya es 26/07 en Madrid (UTC+2 en verano).
    expect(todayISO(new Date("2026-07-25T22:30:00Z"))).toBe("2026-07-26");
    expect(todayISO(new Date("2026-11-25T10:00:00Z"))).toBe("2026-11-25");
  });

  it("cuenta los días que faltan, también cruzando meses y el cambio de hora", () => {
    expect(daysUntil("2026-11-25", "2026-11-25")).toBe(0);
    expect(daysUntil("2026-11-26", "2026-11-25")).toBe(1);
    expect(daysUntil("2026-12-02", "2026-11-25")).toBe(7);
    expect(daysUntil("2026-11-20", "2026-11-25")).toBe(-5);
    expect(daysUntil("2027-03-29", "2027-03-27")).toBe(2); // fin de semana del cambio de hora
  });

  it("etiquetas para la lista de próximas sesiones", () => {
    expect(upcomingLabel("2026-11-25", "2026-11-25")).toBe("Hoy");
    expect(upcomingLabel("2026-11-26", "2026-11-25")).toBe("Mañana");
    expect(upcomingLabel("2026-11-30", "2026-11-25")).toBe("En 5 días");
    expect(upcomingLabel("2026-11-24", "2026-11-25")).toBeNull();
  });

  it("fecha larga en español y sumar días", () => {
    expect(longDate("2026-11-27")).toBe("viernes, 27 de noviembre de 2026");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
