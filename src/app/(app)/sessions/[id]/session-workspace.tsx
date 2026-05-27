"use client";

import { useState } from "react";
import { Flag, Layers, Settings, Timer, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TimingTab } from "./tabs/timing-tab";
import { EventsTab } from "./tabs/events-tab";
import { SetupTab } from "./tabs/setup-tab";
import { StintsTab } from "./tabs/stints-tab";
import { DangerTab } from "./tabs/danger-tab";
import { computeLapStats, consistencyLabel } from "@/lib/stats";
import { formatLapTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/lib/supabase/types";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Lap = Database["public"]["Tables"]["laps"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Setup = Database["public"]["Tables"]["setups"]["Row"];
type LapSector = Database["public"]["Tables"]["lap_sectors"]["Row"];

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
  laps,
  events,
  setup,
  sectors,
}: {
  session: Session;
  laps: Lap[];
  events: Event[];
  setup: Setup | null;
  sectors: LapSector[];
}) {
  const [tab, setTab] = useState<TabId>("timing");

  return (
    <div className="flex flex-col gap-4">
      <SessionSummary session={session} laps={laps} />

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface/40 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 min-w-fit items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-white shadow-[0_4px_20px_-4px_var(--color-accent-glow)]"
                  : "text-muted hover:text-foreground hover:bg-surface",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "timing" ? (
        <TimingTab session={session} laps={laps} sectors={sectors} />
      ) : null}
      {tab === "stints" ? (
        <StintsTab session={session} laps={laps} events={events} />
      ) : null}
      {tab === "events" ? (
        <EventsTab session={session} events={events} laps={laps} />
      ) : null}
      {tab === "setup" ? <SetupTab session={session} setup={setup} /> : null}
      {tab === "danger" ? <DangerTab session={session} /> : null}
    </div>
  );
}

function SessionSummary({ session, laps }: { session: Session; laps: Lap[] }) {
  const stats = computeLapStats(laps);
  const consistency = consistencyLabel(stats.cv);

  return (
    <Card>
      <CardHeader className="border-b-0 pb-2">
        <CardTitle className="text-xs uppercase tracking-widest text-muted">
          Resumen
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 pt-0 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCell label="Vueltas" value={String(stats.count)} />
        <SummaryCell
          label="Mejor"
          value={stats.bestMs !== null ? formatLapTime(stats.bestMs) : "—"}
          accent
        />
        <SummaryCell
          label="Media (limpias)"
          value={
            stats.averageMs !== null ? formatLapTime(stats.averageMs) : "—"
          }
          hint={stats.cleanCount ? `${stats.cleanCount} vueltas verdes` : undefined}
        />
        <SummaryCell
          label="Desv. tipica"
          value={
            stats.stddevMs !== null
              ? `±${(stats.stddevMs / 1000).toFixed(3)} s`
              : "—"
          }
        />
        <div>
          <p className="text-xs uppercase tracking-wider text-muted/70">
            Consistencia
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={consistency.tone === "danger" ? "accent" : consistency.tone}>
              {consistency.label}
            </Badge>
            {stats.cv !== null ? (
              <span className="text-xs tabular text-muted">
                CV {(stats.cv * 100).toFixed(2)}%
              </span>
            ) : null}
          </div>
        </div>
        <SummaryCell
          label="T. pista / clima"
          value={
            session.track_temp != null
              ? `${session.track_temp}°C · ${session.weather ?? "-"}`
              : (session.weather ?? "—")
          }
        />
      </CardContent>
    </Card>
  );
}

function SummaryCell({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted/70">{label}</p>
      <p
        className={cn(
          "tabular text-lg font-semibold",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted/60">{hint}</p> : null}
    </div>
  );
}
