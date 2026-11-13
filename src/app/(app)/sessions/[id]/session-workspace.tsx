"use client";

import { useEffect, useMemo, useState } from "react";
import { Flag, Layers, Settings, Timer, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCell } from "@/components/stat-cell";
import { useSettings } from "@/components/settings-provider";
import { useStopwatch } from "@/hooks/use-stopwatch";
import { WEATHER_LABELS } from "@/lib/labels";
import { mergeEvents, mergeLaps, pruneSynced, useOutbox } from "@/lib/outbox";
import { computeLapStats, consistencyLabel } from "@/lib/stats";
import type { Lap, LapEvent, LapSector, Session, Setup } from "@/lib/supabase/types";
import { cn, formatLapTime } from "@/lib/utils";
import { TimingTab } from "./tabs/timing-tab";
import { EventsTab } from "./tabs/events-tab";
import { SetupTab } from "./tabs/setup-tab";
import { StintsTab } from "./tabs/stints-tab";
import { DangerTab } from "./tabs/danger-tab";

const TABS = [
  { id: "timing", label: "Tiempos", icon: Timer },
  { id: "stints", label: "Stints", icon: Layers },
  { id: "events", label: "Eventos", icon: Flag },
  { id: "setup", label: "Setup", icon: Settings },
  { id: "danger", label: "Avanzado", icon: Trash2 },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function SessionWorkspace({
  session,
  laps: serverLaps,
  events: serverEvents,
  setup,
  sectors: serverSectors,
  copyCandidates,
}: {
  session: Session;
  laps: Lap[];
  events: LapEvent[];
  setup: Setup | null;
  sectors: LapSector[];
  copyCandidates: { id: string; name: string; date: string }[];
}) {
  const [tab, setTab] = useState<TabId>("timing");
  const { settings } = useSettings();
  const queue = useOutbox();

  const lapData = useMemo(
    () => mergeLaps(serverLaps, serverSectors, queue, session.id),
    [serverLaps, serverSectors, queue, session.id],
  );
  const eventData = useMemo(
    () => mergeEvents(serverEvents, queue, session.id),
    [serverEvents, queue, session.id],
  );

  useEffect(() => {
    pruneSynced(new Set([...serverLaps.map((l) => l.id), ...serverEvents.map((e) => e.id)]));
  }, [serverLaps, serverEvents]);

  const stopwatch = useStopwatch(
    session.id,
    serverLaps[serverLaps.length - 1]?.total_time_ms ?? 0,
    settings.keepAwake,
  );

  // Las pestañas se mantienen montadas: cambiar de una a otra no pierde nada.
  const panel = (id: TabId) => cn(tab !== id && "hidden");

  return (
    <div className="flex flex-col gap-4">
      <SessionSummary session={session} laps={lapData.laps} />

      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface/40 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 min-w-fit items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-on-accent"
                  : "text-muted hover:text-foreground hover:bg-surface",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className={panel("timing")}>
        <TimingTab
          session={session}
          laps={lapData.laps}
          sectors={lapData.sectors}
          pendingIds={lapData.pendingIds}
          failed={lapData.failed}
          stopwatch={stopwatch}
          active={tab === "timing"}
        />
      </div>
      <div className={panel("stints")}>
        <StintsTab laps={lapData.laps} events={eventData.events} />
      </div>
      <div className={panel("events")}>
        <EventsTab
          session={session}
          events={eventData.events}
          pendingIds={eventData.pendingIds}
          laps={lapData.laps}
          stopwatch={stopwatch}
        />
      </div>
      <div className={panel("setup")}>
        <SetupTab session={session} setup={setup} copyCandidates={copyCandidates} />
      </div>
      <div className={panel("danger")}>
        <DangerTab session={session} />
      </div>
    </div>
  );
}

function SessionSummary({ session, laps }: { session: Session; laps: Lap[] }) {
  const stats = computeLapStats(laps);
  const consistency = consistencyLabel(stats.cv);
  const weather = session.weather ? WEATHER_LABELS[session.weather] : null;

  return (
    <Card>
      <CardHeader className="border-b-0 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-muted">Resumen</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3 lg:grid-cols-6">
        <StatCell label="Vueltas" value={String(stats.count)} />
        <StatCell
          label="Mejor"
          value={stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—"}
          accent
        />
        <StatCell
          label="Media (limpias)"
          value={stats.averageMs !== null ? formatLapTime(stats.averageMs) : "—"}
          hint={stats.cleanCount ? `${stats.cleanCount} vueltas limpias` : undefined}
        />
        <StatCell
          label="Desv. típica"
          value={stats.stddevMs !== null ? `±${(stats.stddevMs / 1000).toFixed(3)} s` : "—"}
        />
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Consistencia</p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={consistency.tone}>{consistency.label}</Badge>
            {stats.cv !== null ? (
              <span className="text-xs tabular text-muted">CV {(stats.cv * 100).toFixed(2)}%</span>
            ) : null}
          </div>
        </div>
        <StatCell
          label="T. pista / clima"
          value={
            session.track_temp != null
              ? `${session.track_temp}°C · ${weather ?? "-"}`
              : (weather ?? "—")
          }
        />
      </CardContent>
    </Card>
  );
}
