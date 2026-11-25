import type { createClient } from "@/lib/supabase/server";

/** Tiempo que da el enlace de recuperación para poner la contraseña nueva. */
const RECOVERY_WINDOW_S = 30 * 60;

/** Métodos que significan "ha entrado escribiendo su contraseña", no por un enlace. */
const NOT_A_LINK = new Set(["password", "oauth", "anonymous"]);

/**
 * true si la sesión viene de abrir un enlace del correo hace poco (recuperar
 * contraseña). Una sesión normal, abierta con contraseña, no vale: así nadie
 * puede usar /reset-password en un portátil ajeno que se quedó abierto.
 */
export async function isRecoverySession(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return false;
  const amr = (data.claims.amr ?? []) as unknown[];
  let latest: { method: string; timestamp: number } | null = null;
  for (const entry of amr) {
    if (!entry || typeof entry !== "object") continue;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    if (typeof method !== "string" || typeof timestamp !== "number") continue;
    if (!latest || timestamp > latest.timestamp) latest = { method, timestamp };
  }
  if (!latest || NOT_A_LINK.has(latest.method)) return false;
  return Date.now() / 1000 - latest.timestamp < RECOVERY_WINDOW_S;
}
