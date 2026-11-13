"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { flushOutbox, onOutboxSynced, useOutbox } from "@/lib/outbox";

/** Mantiene la cola enviándose y muestra en la cabecera lo que falta por guardar. */
export function OutboxSync() {
  const router = useRouter();
  const queue = useOutbox();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const onOnline = () => {
      update();
      void flushOutbox();
    };
    update();
    void flushOutbox();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", update);
    const interval = setInterval(() => void flushOutbox(), 15000);
    const unsubscribe = onOutboxSynced(() => router.refresh());
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", update);
      clearInterval(interval);
      unsubscribe();
    };
  }, [router]);

  const pending = queue.filter((op) => !op.synced).length;
  if (!offline && pending === 0) return null;

  return (
    <Badge variant={offline ? "warning" : "info"} title="Datos guardados en este dispositivo">
      {offline ? <CloudOff className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
      {offline ? "Sin conexión" : "Enviando"}
      {pending > 0 ? ` · ${pending}` : ""}
    </Badge>
  );
}
