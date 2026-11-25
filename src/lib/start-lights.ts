/**
 * Semáforo de salida como en la F1: se encienden 5 luces rojas, una por
 * segundo, y tras una espera aleatoria se apagan todas: ahí empieza a contar.
 */
export const LIGHT_COUNT = 5;
export const LIGHT_INTERVAL_MS = 1000;
export const HOLD_MIN_MS = 200;
export const HOLD_MAX_MS = 1500;

export type StartLightsPlan = {
  /** Momento (ms desde que se pulsa Iniciar) en que se enciende cada luz. */
  onAt: number[];
  /** Momento en que se apagan todas y arranca el cronómetro. */
  outAt: number;
};

/** random() en [0, 1): se inyecta para poder probarlo. */
export function planStartLights(random: () => number = Math.random): StartLightsPlan {
  const onAt = Array.from({ length: LIGHT_COUNT }, (_, i) => (i + 1) * LIGHT_INTERVAL_MS);
  const r = Math.min(Math.max(random(), 0), 0.999999);
  const hold = Math.round(HOLD_MIN_MS + r * (HOLD_MAX_MS - HOLD_MIN_MS));
  return { onAt, outAt: onAt[LIGHT_COUNT - 1] + hold };
}

/** Cuántas luces deben verse encendidas a los `elapsed` ms (0 tras apagarse). */
export function litAt(plan: StartLightsPlan, elapsed: number): number {
  if (elapsed >= plan.outAt) return 0;
  return plan.onAt.filter((t) => elapsed >= t).length;
}
