"use client";

import { useEffect } from "react";
import { clearPrivateCaches, forgetEverything } from "@/lib/private-data";

/**
 * En la pantalla de login no hay nadie dentro: se borran las páginas privadas
 * guardadas para el modo sin conexión, por si este navegador es compartido.
 * Si se acaba de borrar la cuenta, también todo lo demás de la app.
 */
export function ForgetDevice({ accountDeleted }: { accountDeleted: boolean }) {
  useEffect(() => {
    void clearPrivateCaches().catch(() => {});
    if (accountDeleted) forgetEverything();
  }, [accountDeleted]);
  return null;
}
