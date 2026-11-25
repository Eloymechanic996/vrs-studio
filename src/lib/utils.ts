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
  const trimmed = normalizeLapInput(input);
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

/**
 * Formatos alternativos al estándar "1:23.456":
 * - "1.23.456" o "1,23,456": el teclado numérico del móvil no tiene ":".
 * - "1'23.456" o "1'23"456": como vienen en muchas hojas de tiempos.
 */
function normalizeLapInput(input: string): string {
  let t = input.trim().replace(/[’′]/g, "'").replace(/[”″]/g, '"');
  t = t.replace(/^(\d+)'(\d{1,2})(?:[".,](\d{1,3}))?"?$/, (_, m, s, ms) => `${m}:${s}${ms ? "." + ms : ""}`);
  t = t.replace(/^(\d+)[.,](\d{1,2})[.,](\d{1,3})$/, "$1:$2.$3");
  return t;
}

/** Busca el tiempo dentro de una línea pegada ("3  1:23.456", "Vuelta 3: 1'23.4", "45,123"). */
// Sin dígitos ni ":" pegados a los lados: "2:00:00" (2 horas) no es "2:00".
const STRONG_TIME = /(?<![\d:])(?:\d+[:'’]\d{1,2}(?:["”.,]\d{1,3})?|\d+[.,]\d{1,2}[.,]\d{1,3})(?![\d:])/g;
const WEAK_TIME = /(?<![\d:.,])\d{1,2}[.,]\d{1,3}(?![\d:])/g;

/** Máximo de vueltas que se pueden pegar de una vez. */
export const MAX_PASTED_LAPS = 200;

export type ParsedLapList = {
  laps: { line: number; ms: number }[];
  errors: { line: number; text: string; reason: string }[];
  /** Líneas sin números (cabeceras como "Vuelta  Tiempo"): se ignoran sin avisar. */
  ignored: number;
};

/**
 * Lee una lista de tiempos pegada desde Excel, un PDF o un mensaje: una vuelta
 * por línea. Devuelve las válidas y, por separado, las líneas con problemas.
 */
export function parseLapList(text: string, minLapSeconds: number): ParsedLapList {
  const out: ParsedLapList = { laps: [], errors: [], ignored: 0 };
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = i + 1;
    const value = raw.trim();
    if (!value) return;
    if (!/\d/.test(value)) {
      out.ignored++;
      return;
    }
    const token = value.match(STRONG_TIME)?.[0] ?? value.match(WEAK_TIME)?.at(-1);
    const ms = token ? parseLapTime(token) : null;
    const problem = lapTimeProblem(ms, minLapSeconds);
    if (problem !== null || ms === null) {
      out.errors.push({ line, text: value.slice(0, 60), reason: problem ?? "Tiempo no válido." });
      return;
    }
    if (out.laps.length >= MAX_PASTED_LAPS) {
      out.errors.push({ line, text: value.slice(0, 60), reason: `Máximo ${MAX_PASTED_LAPS} vueltas de una vez.` });
      return;
    }
    out.laps.push({ line, ms });
  });
  return out;
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
