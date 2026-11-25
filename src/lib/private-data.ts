"use client";

/**
 * Borra del dispositivo lo que podría ver el siguiente que use el navegador.
 * Las páginas guardadas para el modo sin conexión se quitan al llegar al login;
 * la cola de vueltas y los cronómetros solo al borrar la cuenta (o, en la cola,
 * lo ya enviado al salir), para no perder vueltas que aún no se han subido.
 */
export async function clearPrivateCaches() {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const names = await caches.keys();
  await Promise.all(names.filter((n) => !n.includes("precache")).map((n) => caches.delete(n)));
}

const OUTBOX_KEY = "vrs:outbox:v1";

/** Quita de la cola lo ya enviado; lo pendiente se queda para subirlo al volver. */
export function forgetSyncedOutbox() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return localStorage.removeItem(OUTBOX_KEY);
    const pending = parsed.filter((op: { synced?: boolean }) => !op?.synced);
    if (pending.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(pending));
    else localStorage.removeItem(OUTBOX_KEY);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** Todo lo de la app guardado en el navegador (cuenta borrada). */
export function forgetEverything() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("vrs:")) localStorage.removeItem(key);
    }
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}
