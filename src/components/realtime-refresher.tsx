"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes affecting a single session and calls
 * router.refresh() so the server component re-renders with fresh data.
 * Lightweight: no client-side state, server stays the source of truth.
 */
export function RealtimeRefresher({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "laps",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `session_id=eq.${sessionId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, router]);

  return null;
}
