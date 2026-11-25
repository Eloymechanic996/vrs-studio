"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refresca la página cuando otro dispositivo cambia esta sesión. Supabase no
 * filtra los borrados por usuario, así que llegan los de todo el mundo: solo se
 * recarga si lo borrado es una vuelta o un evento que esta página está mostrando.
 * Así nadie puede hacer parpadear las sesiones de los demás borrando en bucle.
 */
export function RealtimeRefresher({
  sessionId,
  knownIds,
}: {
  sessionId: string;
  /** Vueltas y eventos que se muestran ahora mismo. */
  knownIds: string[];
}) {
  const router = useRouter();
  const known = useRef(new Set(knownIds));
  useEffect(() => {
    known.current = new Set(knownIds);
  }, [knownIds]);

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };
    const onDelete = (payload: { old: { id?: string } }) => {
      if (payload.old?.id && known.current.has(payload.old.id)) refresh();
    };
    const filter = `session_id=eq.${sessionId}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Sin el token del usuario el canal se abre como anónimo y no recibe nada.
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) await supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = supabase
        .channel(`session-${sessionId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "laps", filter }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "laps", filter }, refresh)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "laps" }, onDelete)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "events", filter }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter }, refresh)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "events" }, onDelete)
        // Los sectores cambian siempre junto con su vuelta; sus borrados no hacen falta.
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "lap_sectors" }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lap_sectors" }, refresh)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
          refresh,
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  return null;
}
