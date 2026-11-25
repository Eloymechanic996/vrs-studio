import { clsx, type ClassValue } from "clsx";
import { parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLapTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "--:--.---";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor(ms % 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/** Acepta `mm:ss.SSS`, `ss.SSS` o `ss,SSS`. Devuelve null si el formato no es válido. */
export function parseLapTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(?:(\d+):)?(\d{1,2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const minutes = m[1] ? parseInt(m[1], 10) : 0;
  const seconds = parseInt(m[2], 10);
  const millis = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
  if (seconds >= 60) return null;
  const ms = minutes * 60000 + seconds * 1000 + millis;
  return ms > MAX_LAP_MS ? null : ms;
}

/** Una vuelta no puede durar más de una hora: por encima es un error al escribirla. */
export const MAX_LAP_MS = 60 * 60 * 1000;

/**
 * Comprueba un tiempo de vuelta escrito a mano y devuelve un mensaje en
 * español si no tiene sentido, o null si es válido.
 */
export function lapTimeProblem(ms: number | null, minLapSeconds: number): string | null {
  if (ms === null || ms <= 0) {
    return "Tiempo no válido. Usa mm:ss.SSS (ej. 01:23.456) y como máximo 60 minutos.";
  }
  if (ms < minLapSeconds * 1000) {
    return `Tiempo demasiado corto (mínimo ${minLapSeconds} s). Si querías 1 min 23 s, escribe 1:23.`;
  }
  return null;
}

/** Interpreta una fecha `yyyy-MM-dd` en hora local, sin desplazarla por UTC. */
export function parseDateOnly(value: string): Date {
  return parseISO(value);
}
