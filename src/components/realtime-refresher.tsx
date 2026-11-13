"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refresca la página cuando otro dispositivo cambia esta sesión. Los borrados
 * no se pueden filtrar en Supabase Realtime, así que se escuchan sin filtro:
 * solo provocan un refresco y no exponen datos.
 */
export function RealtimeRefresher({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
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
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "laps" }, refresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "events", filter }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter }, refresh)
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "events" }, refresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "lap_sectors" }, refresh)
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
