/**
 * Sesiones preparadas con antelación: una sesión es "futura" si su fecha es
 * posterior a hoy. "Hoy" se calcula en hora de España, no en la del servidor
 * (UTC), para que a las 00:30 de la noche no se vea todavía el día anterior.
 */
export const APP_TIME_ZONE = "Europe/Madrid";

/** Fecha de hoy como "YYYY-MM-DD" en la zona horaria de la app. */
export function todayISO(now: Date = new Date(), timeZone: string = APP_TIME_ZONE): string {
  // en-CA da el formato año-mes-día.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Días que faltan desde hoy hasta la fecha (negativo si ya pasó). */
export function daysUntil(date: string, today: string): number {
  const toUtc = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  };
  return Math.round((toUtc(date) - toUtc(today)) / 86_400_000);
}

/** "Hoy", "Mañana", "En 3 días"... o null si la fecha ya pasó. */
export function upcomingLabel(date: string, today: string): string | null {
  const days = daysUntil(date, today);
  if (days < 0) return null;
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return `En ${days} días`;
}

/** Fecha larga en español: "jueves, 27 de noviembre de 2026". */
export function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
